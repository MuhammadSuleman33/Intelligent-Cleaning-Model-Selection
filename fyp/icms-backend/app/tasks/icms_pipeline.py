"""Celery task: full ICMS pipeline (preprocess → EDA → AutoML → SHAP)."""

from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database import SessionLocal
from app.ml.automl import run_automl
from app.ml.eda import eda_report
from app.ml.preprocessing import build_sklearn_preprocessor, prepare_xy
from app.ml.recommendation import recommend
from app.ml.shap_utils import try_shap_summary
from app.ml.splits import classification_stratify
from app.models.artifact import Artifact, ArtifactType
from app.models.job import Job, JobStatus, JobStep
from app.services.dataset_service import load_dataframe
from app.services.job_service import add_artifact, append_log, fail_job, save_model_row, set_step
from app.services.storage import artifact_path, resolve_path
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


def _normalize_leaderboard(leaderboard: list[dict]) -> list[dict]:
    """Ensure all leaderboard rows have consistent metric structure and are JSON-serializable."""
    normalized = []
    for row in leaderboard:
        # Extract and ensure metrics are either float or None (JSON-serializable)
        def get_numeric(key: str) -> float | None:
            val = row.get(key)
            if val is None:
                return None
            try:
                num = float(val)
                # Ensure the value is finite (not NaN or Infinity)
                if not np.isfinite(num):
                    return None
                return round(num, 6)  # Round to 6 decimal places for storage
            except (TypeError, ValueError):
                return None
        
        normalized_row = {
            "model": str(row.get("model", "Unknown")),
            "name": str(row.get("name", row.get("model", "Unknown"))),
            "accuracy": get_numeric("accuracy"),
            "f1": get_numeric("f1"),
            "precision": get_numeric("precision"),
            "recall": get_numeric("recall"),
            "rmse": get_numeric("rmse"),
            "r2": get_numeric("r2"),
            "mae": get_numeric("mae"),
        }
        normalized.append(normalized_row)
    
    return normalized


@celery_app.task(
    bind=True,
    name="app.tasks.icms_pipeline.run_icms_pipeline",
    autoretry_for=(OSError, ConnectionError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_icms_pipeline(self, job_id: str) -> dict:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return {"ok": False, "error": "job not found"}
        if job.status == JobStatus.completed:
            return {"ok": True, "job_id": job_id}
        _execute_pipeline(db, job)
        return {"ok": True, "job_id": job_id}
    except Exception as e:
        logger.exception("Pipeline failed")
        job = db.get(Job, job_id)
        if job:
            try:
                fail_job(db, job, str(e))
                append_log(db, job, traceback.format_exc()[:8000])
            except Exception:
                db.rollback()
        return {"ok": False, "error": str(e)}
    finally:
        db.close()


def _execute_pipeline(db: Session, job: Job) -> None:
    import time
    
    pipeline_start = time.time()
    cfg = job.config or {}
    target = cfg["target_column"]
    task_type = cfg["task_type"]
    options = cfg.get("options") or {}

    job.status = JobStatus.running
    job.updated_at = datetime.now(timezone.utc)
    db.commit()

    append_log(db, job, "Loading dataset…")
    load_start = time.time()
    ds = job.dataset
    path = resolve_path(ds.stored_path)
    try:
        df = load_dataframe(path)
        load_time = time.time() - load_start
        append_log(db, job, f"Dataset loaded in {load_time:.2f}s: {len(df)} rows, {len(df.columns)} columns")
    except RuntimeError as e:
        # RuntimeError from encoding fallback
        error_msg = f"Error reading file: {str(e)}"
        fail_job(db, job, error_msg)
        raise RuntimeError(error_msg) from e
    except (UnicodeDecodeError, UnicodeError) as e:
        error_msg = f"Encoding error reading file: {e}. The file may be corrupted or use an unsupported encoding."
        fail_job(db, job, error_msg)
        raise RuntimeError(error_msg) from e
    except ValueError as e:
        # Unsupported file format
        error_msg = f"Unsupported file format: {e}"
        fail_job(db, job, error_msg)
        raise RuntimeError(error_msg) from e
    except Exception as e:
        error_msg = f"Error reading dataset: {e}"
        fail_job(db, job, error_msg)
        raise RuntimeError(error_msg) from e
    
    # Validate dataset
    if df.empty:
        error_msg = "Dataset is empty (0 rows)"
        fail_job(db, job, error_msg)
        raise ValueError(error_msg)
    
    if target not in df.columns:
        error_msg = f"Target column '{target}' not found in dataset. Available columns: {list(df.columns)}"
        fail_job(db, job, error_msg)
        raise ValueError(error_msg)
    
    # Check for valid data in target column
    target_non_null = df[target].notna().sum()
    if target_non_null == 0:
        error_msg = f"Target column '{target}' has no valid values (all null/missing)"
        fail_job(db, job, error_msg)
        raise ValueError(error_msg)
    
    append_log(db, job, f"Target column '{target}' has {target_non_null}/{len(df)} valid values")
    
    # Optional: Apply sampling for very large datasets to speed up processing
    original_size = len(df)
    max_training_rows = int(options.get("max_training_rows") or 50000)  # Default: 50k rows
    if len(df) > max_training_rows:
        # Stratified sample based on target if classification
        if task_type == "classification":
            df = df.groupby(target, group_keys=False).apply(
                lambda x: x.sample(n=min(len(x), max_training_rows // df[target].nunique()), random_state=42)
            ).reset_index(drop=True)
        else:
            df = df.sample(n=max_training_rows, random_state=42)
        append_log(db, job, f"Dataset sampled from {original_size} to {len(df)} rows for faster training")

    set_step(db, job, JobStep.preprocessing, 10, JobStatus.running)
    preprocess_start = time.time()
    append_log(db, job, "Preprocessing (duplicates, IQR, missing strategy)…")
    X, y, numeric, categorical = prepare_xy(df, target, options)

    scaling = (options.get("scaling") or "standard").lower()
    if scaling not in ("standard", "minmax", "none"):
        scaling = "standard"

    preprocessor = build_sklearn_preprocessor(numeric, categorical, scaling=scaling)

    # Only save cleaned features for smaller datasets (< 100k rows) to reduce I/O
    if original_size <= 100000:
        rel_clean, abs_clean = artifact_path(job.id, "cleaned_features.csv")
        pd.concat([X, y.rename(target)], axis=1).to_csv(abs_clean, index=False)
        add_artifact(db, job, ArtifactType.cleaned_dataset, rel_clean, "cleaned_features.csv", "text/csv")
    else:
        append_log(db, job, "Skipping cleaned features CSV (large dataset)")
    
    preprocess_time = time.time() - preprocess_start
    append_log(db, job, f"Preprocessing completed in {preprocess_time:.2f}s. Features shape: {X.shape[0]} rows, {X.shape[1]} columns.")

    set_step(db, job, JobStep.eda, 35, JobStatus.running)
    eda_start = time.time()
    append_log(db, job, "Running EDA…")
    eda = eda_report(df, target=target)
    eda_time = time.time() - eda_start
    
    rel_eda, abs_eda = artifact_path(job.id, "eda_report.json")
    # Truncate EDA more aggressively to 300k chars for faster JSON serialization
    eda_json_str = json.dumps(eda, default=str)[:300_000]
    abs_eda.write_text(eda_json_str, encoding="utf-8")
    add_artifact(db, job, ArtifactType.eda_report, rel_eda, "eda_report.json", "application/json")
    append_log(db, job, f"EDA completed in {eda_time:.2f}s")

    eda_frontend = {
        "histograms": eda.get("histograms", []),
        "boxplots": eda.get("boxplots", []),
        "correlation": eda.get("correlation"),
        "missing": eda.get("missing_values", []),
    }

    set_step(db, job, JobStep.training, 55, JobStatus.running)
    append_log(db, job, "Training models (RandomizedSearchCV, optimized)…")
    cv_folds = int(options.get("cv_folds") or 5)
    
    # Optimize n_iter based on dataset size for faster training
    # Smaller datasets train fewer models, larger datasets can train more
    base_n_iter = 10
    if len(X) < 100:
        n_iter = 3  # Very fast for tiny data
    elif len(X) < 500:
        n_iter = 6  # Fast for small data
    elif len(X) > 10000:
        n_iter = 15  # More thorough for large data
    else:
        n_iter = base_n_iter
    
    training_start = time.time()
    leaderboard, best_detail, best_pipe, train_failures = run_automl(
        X, y, preprocessor, task_type, n_iter=n_iter, cv=cv_folds, random_state=42
    )
    training_time = time.time() - training_start

    if not leaderboard:
        tail = " | ".join(train_failures[:6]) if train_failures else "no details"
        raise RuntimeError(f"All models failed during training. ({tail})")

    append_log(db, job, f"Training completed in {training_time:.2f}s: {len(leaderboard)} models trained successfully")
    
    # Log leaderboard metrics
    for i, row in enumerate(leaderboard):
        model_name = row.get("model", f"Model {i+1}")
        metrics_str = ", ".join(
            f"{k}={v:.4f}" if isinstance(v, (int, float)) and v is not None else f"{k}={v}"
            for k, v in row.items() if k not in ("model", "name")
        )
        append_log(db, job, f"  {model_name}: {metrics_str}")

    for row in leaderboard:
        save_model_row(
            db,
            job.id,
            row["model"],
            {k: v for k, v in row.items() if k not in ("model", "name") and v is not None},
        )

    set_step(db, job, JobStep.evaluation, 80, JobStatus.running)
    eval_start = time.time()
    append_log(db, job, "Saving best model and diagnostics…")

    stratify = classification_stratify(y) if task_type == "classification" else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    if best_pipe is not None:
        rel_m, abs_m = artifact_path(job.id, "best_model.joblib")
        joblib.dump(best_pipe, abs_m)
        add_artifact(db, job, ArtifactType.trained_model, rel_m, "best_model.joblib", "application/octet-stream")
        prep_step = best_pipe.named_steps.get("prep")
        if prep_step is not None:
            rel_p, abs_p = artifact_path(job.id, "preprocessing.joblib")
            joblib.dump(prep_step, abs_p)
            add_artifact(db, job, ArtifactType.pipeline, rel_p, "preprocessing.joblib", "application/octet-stream")

    rec = recommend(leaderboard, task_type)

    model_details: dict = {}
    best_name = best_detail.get("model") or best_detail.get("name")
    if best_pipe is not None and best_name:
        detail: dict = {"model": best_name, "name": best_name, "metrics": best_detail.get("metrics", {})}
        # Single prediction for all diagnostic tasks
        pred = best_pipe.predict(X_test)
        if task_type == "classification":
            labels = sorted(y.unique().tolist(), key=lambda x: str(x))
            cm = confusion_matrix(y_test, pred, labels=labels)
            detail["confusion_matrix"] = {"z": cm.tolist(), "labels": [str(x) for x in labels]}
        else:
            detail["residual_plot"] = {
                "y_true": y_test.astype(float).tolist()[:500],
                "y_pred": pred.tolist()[:500],
            }
        # SHAP only if dataset is reasonably sized (< 10k test samples)
        if len(X_test) <= 10000:
            shap_payload = try_shap_summary(best_pipe, X_test, task_type)
            if shap_payload:
                detail["shap"] = shap_payload
        model_details[best_name] = detail
    
    eval_time = time.time() - eval_start

    # Normalize leaderboard to ensure consistent metric structure
    normalized_leaderboard = _normalize_leaderboard(leaderboard)

    snippet = f"# ICMS job {job.id}\n# Best model: {best_name}\nimport joblib\nm = joblib.load('best_model.joblib')\n"
    rel_code, abs_code = artifact_path(job.id, "inference_snippet.py")
    abs_code.write_text(snippet, encoding="utf-8")
    add_artifact(db, job, ArtifactType.code_snippet, rel_code, "inference_snippet.py", "text/plain")

    arts_list = db.scalars(select(Artifact).where(Artifact.job_id == job.id)).all()
    arts = {a.type.value: str(a.id) for a in arts_list}

    results = {
        "task_type": task_type,
        "target_column": target,
        "eda": eda_frontend,
        "leaderboard": normalized_leaderboard,
        "recommendation": rec,
        "best": rec,
        "model_details": model_details,
        "downloads": {
            "bundle": f"/download/job_bundle/{job.id}",
            "cleaned_dataset": f"/download/{arts['cleaned_dataset']}" if arts.get("cleaned_dataset") else None,
            "trained_model": f"/download/{arts['trained_model']}" if arts.get("trained_model") else None,
            "pipeline": f"/download/{arts['pipeline']}" if arts.get("pipeline") else None,
            "eda_report": f"/download/{arts['eda_report']}" if arts.get("eda_report") else None,
            "pdf_report": None,
            "code_snippet": f"/download/{arts['code_snippet']}" if arts.get("code_snippet") else None,
        },
    }

    job.results = results
    job.status = JobStatus.completed
    job.current_step = JobStep.completed.value
    job.progress = 100
    job.updated_at = datetime.now(timezone.utc)
    
    total_time = time.time() - pipeline_start
    append_log(db, job, f"Pipeline completed successfully in {total_time:.2f}s (Load: {load_time:.2f}s, Preprocess: {preprocess_time:.2f}s, EDA: {eda_time:.2f}s, Training: {training_time:.2f}s, Eval: {eval_time:.2f}s)")
    db.commit()
