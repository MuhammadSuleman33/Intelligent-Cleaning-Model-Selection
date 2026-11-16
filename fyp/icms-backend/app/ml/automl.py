"""AutoML: RandomizedSearchCV with multiple estimators."""

from __future__ import annotations

import logging
import math
import sys
from typing import Any, Literal

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    recall_score,
    r2_score,
)
from sklearn.model_selection import (
    KFold,
    RandomizedSearchCV,
    StratifiedKFold,
    train_test_split,
)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC, SVR

from app.ml.splits import classification_stratify

logger = logging.getLogger(__name__)

try:
    from xgboost import XGBClassifier, XGBRegressor

    HAS_XGB = True
except Exception:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier, LGBMRegressor

    HAS_LGBM = True
except Exception:
    HAS_LGBM = False


def _cv_splits(n_samples: int, requested: int = 5) -> int:
    return max(2, min(requested, n_samples // 2))


def _effective_cv(n_train: int, requested: int) -> int:
    """Pick a CV fold count that sklearn can run; smallest train fold must stay usable."""
    if n_train < 2:
        return 2
    cap = max(2, min(requested, n_train // 2))
    for n_cv in range(cap, 1, -1):
        min_fold_train = n_train - math.ceil(n_train / n_cv)
        if min_fold_train >= 2:
            return n_cv
    return 2


def _max_knn_k(n_train: int, n_cv: int) -> int:
    """Largest n_neighbors valid in the smallest CV training fold (strictly < fold size)."""
    if n_cv < 2:
        return max(1, n_train - 1)
    min_fold_train = n_train - math.ceil(n_train / n_cv)
    return max(1, min_fold_train - 1)


def _knn_neighbor_grid(n_train: int, n_cv: int, candidates: tuple[int, ...]) -> list[int]:
    max_k = _max_knn_k(n_train, n_cv)
    out = sorted({k for k in candidates if k <= max_k})
    return out if out else [1]


def _make_cv_splitter(
    task: Literal["classification", "regression"],
    y_train: pd.Series,
    n_cv: int,
    random_state: int,
):
    """Stratified folds when possible; otherwise KFold (rare classes / tiny train)."""
    n_tr = len(y_train)
    if task != "classification":
        return n_cv
    vc = y_train.value_counts()
    if len(vc) < 2:
        ns = max(2, min(n_cv, n_tr // 2, n_tr - 1))
        return KFold(n_splits=ns, shuffle=True, random_state=random_state)
    m = int(vc.min())
    if m < 2:
        ns = max(2, min(n_cv, n_tr // 2, n_tr - 1))
        return KFold(n_splits=ns, shuffle=True, random_state=random_state)
    ns = min(n_cv, m)
    ns = max(2, min(ns, n_tr - 1))
    return StratifiedKFold(n_splits=ns, shuffle=True, random_state=random_state)


def _search_n_jobs() -> int:
    """Avoid Windows multiprocessing issues inside nested CV + parallel search."""
    return 1 if sys.platform == "win32" else -1


def _rf_parallel_kw() -> dict[str, int]:
    """RandomForest inside RandomizedSearchCV: single-thread trees on Windows."""
    return {"n_jobs": 1} if sys.platform == "win32" else {}


def _optimize_n_iter(n_train: int, base_n_iter: int = 10) -> int:
    """
    Optimize the number of RandomizedSearchCV iterations based on training set size.
    Smaller datasets benefit from fewer iterations (faster), larger datasets can handle more.
    """
    if n_train < 50:
        return max(2, base_n_iter // 3)  # Very few iterations for tiny data
    elif n_train < 200:
        return max(3, base_n_iter // 2)  # Fewer iterations for small data
    elif n_train < 1000:
        return base_n_iter  # Standard iterations
    else:
        return min(base_n_iter * 2, 20)  # More iterations for large data, but cap at 20


def _get_param_grid_size(n_train: int) -> dict[str, int]:
    """
    Get parameter grid sizes based on dataset size to balance speed and quality.
    Smaller datasets use smaller grids, larger datasets use larger grids.
    """
    if n_train < 100:
        return {"n_estimators": [30, 50], "max_depth": [3, 6], "learning_rate": [0.1]}
    elif n_train < 500:
        return {"n_estimators": [50, 100], "max_depth": [3, 6], "learning_rate": [0.05, 0.1]}
    else:
        return {"n_estimators": [50, 100, 150], "max_depth": [3, 6, 10], "learning_rate": [0.01, 0.05, 0.1]}


def run_automl(
    X: pd.DataFrame,
    y: pd.Series,
    preprocessor: Any,
    task: Literal["classification", "regression"],
    n_iter: int = 10,
    cv: int = 5,
    random_state: int = 42,
) -> tuple[list[dict[str, Any]], dict[str, Any], Pipeline | None, list[str]]:
    """
    Optimized AutoML with intelligent model selection and parameter tuning.
    
    Returns (leaderboard_rows, best_detail, best_fitted_pipeline, failure_messages).
    """
    import time
    
    start_time = time.time()
    failures: list[str] = []
    stratify = classification_stratify(y) if task == "classification" else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=stratify
    )
    
    n_tr = len(X_train)
    n_features = X_train.shape[1]
    
    # Log dataset info
    logger.info(f"AutoML: {task} | Train: {n_tr} rows, {n_features} features | Test: {len(X_test)} rows")
    
    # Optimize parameters based on dataset size
    n_cv = _effective_cv(n_tr, _cv_splits(n_tr, cv))
    cv_splitter = _make_cv_splitter(task, y_train, n_cv, random_state)
    n_cv_used = cv_splitter.n_splits if hasattr(cv_splitter, "n_splits") else int(cv_splitter)
    
    # Optimize iterations based on training set size
    n_iter_eff = _optimize_n_iter(n_tr, n_iter)
    logger.info(f"Using {n_iter_eff} search iterations ({n_cv_used}-fold CV)")
    
    leaderboard: list[dict[str, Any]] = []
    best_score = -np.inf if task == "classification" else np.inf
    best_pipe: Pipeline | None = None
    best_name = ""
    best_metrics: dict[str, Any] = {}

    def eval_classification(name: str, pipe: Pipeline, param_dist: dict) -> None:
        nonlocal best_score, best_pipe, best_name, best_metrics
        model_start = time.time()
        search = RandomizedSearchCV(
            pipe,
            param_distributions=param_dist,
            n_iter=n_iter_eff,
            cv=cv_splitter,
            scoring="f1_weighted",
            random_state=random_state,
            n_jobs=_search_n_jobs(),
            error_score="raise",
        )
        try:
            search.fit(X_train, y_train)
        except Exception as e:
            msg = f"{name}: {e}"
            failures.append(msg)
            logger.warning("Model %s failed: %s", name, e)
            return
        
        try:
            pred = search.best_estimator_.predict(X_test)
            acc = float(accuracy_score(y_test, pred))
            f1 = float(f1_score(y_test, pred, average="weighted", zero_division=0))
            prec = float(precision_score(y_test, pred, average="weighted", zero_division=0))
            rec = float(recall_score(y_test, pred, average="weighted", zero_division=0))
            
            # Ensure metrics are valid numeric values
            if not all(np.isfinite([acc, f1, prec, rec])):
                logger.warning(f"{name}: Some metrics are NaN or infinite")
                acc = acc if np.isfinite(acc) else 0.0
                f1 = f1 if np.isfinite(f1) else 0.0
                prec = prec if np.isfinite(prec) else 0.0
                rec = rec if np.isfinite(rec) else 0.0
            
            model_time = time.time() - model_start
            logger.info(f"{name}: F1={f1:.4f}, time={model_time:.2f}s")
            
            row = {
                "model": name,
                "name": name,
                "accuracy": acc,
                "f1": f1,
                "precision": prec,
                "recall": rec,
                "rmse": None,
                "r2": None,
                "mae": None,
            }
            leaderboard.append(row)
            if f1 > best_score:
                best_score = f1
                best_pipe = search.best_estimator_
                best_name = name
                best_metrics = {
                    "accuracy": acc,
                    "f1": f1,
                    "precision": prec,
                    "recall": rec,
                    "best_cv_score": float(search.best_score_),
                }
        except Exception as e:
            msg = f"{name} (metrics evaluation): {e}"
            failures.append(msg)
            logger.warning("Model %s metrics failed: %s", name, e)

    def eval_regression(name: str, pipe: Pipeline, param_dist: dict) -> None:
        nonlocal best_score, best_pipe, best_name, best_metrics
        model_start = time.time()
        search = RandomizedSearchCV(
            pipe,
            param_distributions=param_dist,
            n_iter=n_iter_eff,
            cv=cv_splitter,
            scoring="neg_root_mean_squared_error",
            random_state=random_state,
            n_jobs=_search_n_jobs(),
            error_score="raise",
        )
        try:
            search.fit(X_train, y_train)
        except Exception as e:
            msg = f"{name}: {e}"
            failures.append(msg)
            logger.warning("Model %s failed: %s", name, e)
            return
        
        try:
            pred = search.best_estimator_.predict(X_test)
            rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
            mae = float(mean_absolute_error(y_test, pred))
            r2 = float(r2_score(y_test, pred))
            
            # Ensure metrics are valid numeric values
            if not all(np.isfinite([rmse, mae, r2])):
                logger.warning(f"{name}: Some metrics are NaN or infinite")
                rmse = rmse if np.isfinite(rmse) else 1e9
                mae = mae if np.isfinite(mae) else 1e9
                r2 = r2 if np.isfinite(r2) else -1.0
            
            model_time = time.time() - model_start
            logger.info(f"{name}: RMSE={rmse:.4f}, R²={r2:.4f}, time={model_time:.2f}s")
            
            row = {
                "model": name,
                "name": name,
                "accuracy": None,
                "f1": None,
                "precision": None,
                "recall": None,
                "rmse": rmse,
                "r2": r2,
                "mae": mae,
            }
            leaderboard.append(row)
            if rmse < best_score:
                best_score = rmse
                best_pipe = search.best_estimator_
                best_name = name
                best_metrics = {"rmse": rmse, "mae": mae, "r2": r2, "best_cv_score": float(search.best_score_)}
        except Exception as e:
            msg = f"{name} (metrics evaluation): {e}"
            failures.append(msg)
            logger.warning("Model %s metrics failed: %s", name, e)

    # Decide which models to train based on dataset size
    skip_boosters = n_tr < 12
    skip_complex = n_tr < 50  # Skip complex models for very small datasets
    
    knn_ks = _knn_neighbor_grid(n_tr, n_cv_used, (3, 5, 9, 15))
    param_grid = _get_param_grid_size(n_tr)

    if task == "classification":
        best_score = -1.0
        
        # Always train fast linear model
        eval_classification(
            "LogisticRegression",
            Pipeline(
                [
                    ("prep", clone(preprocessor)),
                    ("clf", LogisticRegression(max_iter=2000, solver="lbfgs")),
                ]
            ),
            {"clf__C": np.logspace(-2, 2, 5)},  # Reduced from 10
        )
        
        # RandomForest with optimized grid
        eval_classification(
            "RandomForest",
            Pipeline(
                [
                    ("prep", clone(preprocessor)),
                    (
                        "clf",
                        RandomForestClassifier(random_state=random_state, **_rf_parallel_kw()),
                    ),
                ]
            ),
            {"clf__n_estimators": param_grid["n_estimators"], "clf__max_depth": [None, 10]},
        )
        
        # KNN only if dataset isn't too large (KNN gets slow with large datasets)
        if n_tr < 5000:
            eval_classification(
                "KNN",
                Pipeline([("prep", clone(preprocessor)), ("clf", KNeighborsClassifier())]),
                {"clf__n_neighbors": knn_ks},
            )
        
        # LinearSVC with reduced param grid
        if not skip_complex:
            eval_classification(
                "LinearSVC",
                Pipeline([("prep", clone(preprocessor)), ("clf", LinearSVC(max_iter=5000, dual="auto"))]),
                {"clf__C": np.logspace(-1, 1, 3)},  # Reduced from 6
            )
        
        if HAS_XGB and not skip_boosters:
            eval_classification(
                "XGBoost",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        ("clf", XGBClassifier(random_state=random_state, tree_method="hist", verbosity=0, early_stopping_rounds=5)),
                    ]
                ),
                param_grid,
            )
        if HAS_LGBM and not skip_boosters:
            eval_classification(
                "LightGBM",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        (
                            "clf",
                            LGBMClassifier(
                                random_state=random_state,
                                verbosity=-1,
                                n_jobs=1 if sys.platform == "win32" else -1,
                                force_col_wise=True,
                            ),
                        ),
                    ]
                ),
                param_grid,
            )
    else:
        best_score = np.inf
        knn_ks_reg = _knn_neighbor_grid(n_tr, n_cv_used, (3, 5, 9))
        
        # Always train fast linear model
        eval_regression(
            "LinearRegression",
            Pipeline([("prep", clone(preprocessor)), ("clf", LinearRegression())]),
            {"clf__fit_intercept": [True, False]},
        )
        
        # RandomForest with optimized grid
        eval_regression(
            "RandomForest",
            Pipeline(
                [
                    ("prep", clone(preprocessor)),
                    ("clf", RandomForestRegressor(random_state=random_state, **_rf_parallel_kw())),
                ]
            ),
            {"clf__n_estimators": param_grid["n_estimators"], "clf__max_depth": [None, 10]},
        )
        
        # KNN only if dataset isn't too large
        if n_tr < 5000:
            eval_regression(
                "KNN",
                Pipeline([("prep", clone(preprocessor)), ("clf", KNeighborsRegressor())]),
                {"clf__n_neighbors": knn_ks_reg},
            )
        
        # SVR with reduced grid
        if not skip_complex:
            eval_regression(
                "SVR",
                Pipeline([("prep", clone(preprocessor)), ("clf", SVR())]),
                {"clf__C": [0.1, 1, 10], "clf__epsilon": [0.1]},  # Reduced epsilon options
            )
        
        if HAS_XGB and not skip_boosters:
            eval_regression(
                "XGBoost",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        ("clf", XGBRegressor(random_state=random_state, tree_method="hist", verbosity=0, early_stopping_rounds=5)),
                    ]
                ),
                param_grid,
            )
        
        if HAS_LGBM and not skip_boosters:
            eval_regression(
                "LightGBM",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        (
                            "clf",
                            LGBMRegressor(
                                random_state=random_state,
                                verbosity=-1,
                                n_jobs=1 if sys.platform == "win32" else -1,
                                force_col_wise=True,
                            ),
                        ),
                    ]
                ),
                param_grid,
            )

    if not leaderboard:
        def try_direct(name: str, pipe: Pipeline) -> None:
            nonlocal best_score, best_pipe, best_name, best_metrics
            try:
                pipe.fit(X_train, y_train)
                pred = pipe.predict(X_test)
            except Exception as e:
                failures.append(f"{name} (fallback): {e}")
                logger.warning("Direct fit %s failed: %s", name, e)
                return
            try:
                if task == "classification":
                    acc = float(accuracy_score(y_test, pred))
                    f1 = float(f1_score(y_test, pred, average="weighted", zero_division=0))
                    prec = float(precision_score(y_test, pred, average="weighted", zero_division=0))
                    rec = float(recall_score(y_test, pred, average="weighted", zero_division=0))
                    
                    # Ensure metrics are valid numeric values
                    if not all(np.isfinite([acc, f1, prec, rec])):
                        logger.warning(f"{name} (fallback): Some metrics are NaN or infinite")
                        acc = acc if np.isfinite(acc) else 0.0
                        f1 = f1 if np.isfinite(f1) else 0.0
                        prec = prec if np.isfinite(prec) else 0.0
                        rec = rec if np.isfinite(rec) else 0.0
                    
                    row = {
                        "model": name,
                        "name": name,
                        "accuracy": acc,
                        "f1": f1,
                        "precision": prec,
                        "recall": rec,
                        "rmse": None,
                        "r2": None,
                        "mae": None,
                    }
                    leaderboard.append(row)
                    if f1 > best_score:
                        best_score = f1
                        best_pipe = pipe
                        best_name = name
                        best_metrics = {
                            "accuracy": acc,
                            "f1": f1,
                            "precision": prec,
                            "recall": rec,
                            "best_cv_score": float(f1),
                        }
                else:
                    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
                    mae = float(mean_absolute_error(y_test, pred))
                    r2 = float(r2_score(y_test, pred))
                    
                    # Ensure metrics are valid numeric values
                    if not all(np.isfinite([rmse, mae, r2])):
                        logger.warning(f"{name} (fallback): Some metrics are NaN or infinite")
                        rmse = rmse if np.isfinite(rmse) else 1e9
                        mae = mae if np.isfinite(mae) else 1e9
                        r2 = r2 if np.isfinite(r2) else -1.0
                    
                    row = {
                        "model": name,
                        "name": name,
                        "accuracy": None,
                        "f1": None,
                        "precision": None,
                        "recall": None,
                        "rmse": rmse,
                        "r2": r2,
                        "mae": mae,
                    }
                    leaderboard.append(row)
                    if rmse < best_score:
                        best_score = rmse
                        best_pipe = pipe
                        best_name = name
                        best_metrics = {"rmse": rmse, "mae": mae, "r2": r2, "best_cv_score": float(-rmse)}
            except Exception as e:
                failures.append(f"{name} (fallback metrics): {e}")
                logger.warning("Direct fit %s metrics failed: %s", name, e)

        if task == "classification":
            try_direct(
                "LogisticRegression",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        ("clf", LogisticRegression(max_iter=5000, solver="lbfgs", C=1.0)),
                    ]
                ),
            )
            try_direct(
                "RandomForest",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        (
                            "clf",
                            RandomForestClassifier(
                                n_estimators=80,
                                max_depth=6,
                                random_state=random_state,
                                **_rf_parallel_kw(),
                            ),
                        ),
                    ]
                ),
            )
        else:
            try_direct(
                "LinearRegression",
                Pipeline([("prep", clone(preprocessor)), ("clf", LinearRegression())]),
            )
            try_direct(
                "RandomForest",
                Pipeline(
                    [
                        ("prep", clone(preprocessor)),
                        (
                            "clf",
                            RandomForestRegressor(
                                n_estimators=80,
                                max_depth=6,
                                random_state=random_state,
                                **_rf_parallel_kw(),
                            ),
                        ),
                    ]
                ),
            )

    detail = {
        "model": best_name,
        "name": best_name,
        "metrics": best_metrics,
        "task_type": task,
    }
    
    total_time = time.time() - start_time
    logger.info(f"AutoML completed in {total_time:.2f}s | Models trained: {len(leaderboard)} | Best: {best_name} (score={best_score:.4f})")
    
    return leaderboard, detail, best_pipe, failures
