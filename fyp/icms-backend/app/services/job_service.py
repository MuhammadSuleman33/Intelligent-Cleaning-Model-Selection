from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.artifact import Artifact, ArtifactType
from app.models.job import Job, JobStatus, JobStep
from app.models.trained_ml_model import TrainedMLModel


def append_log(db: Session, job: Job, line: str) -> None:
    prev = job.logs or ""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    job.logs = (prev + f"\n[{ts}] {line}").strip()
    job.updated_at = datetime.now(timezone.utc)
    db.commit()


def set_step(db: Session, job: Job, step: JobStep, progress: int, status: JobStatus | None = None) -> None:
    job.current_step = step.value
    job.progress = progress
    if status:
        job.status = status
    job.updated_at = datetime.now(timezone.utc)
    db.commit()


def fail_job(db: Session, job: Job, message: str) -> None:
    job.status = JobStatus.failed
    job.error_message = message
    append_log(db, job, f"ERROR: {message}")


def add_artifact(
    db: Session,
    job: Job,
    type: ArtifactType,
    rel_path: str,
    original_name: str | None = None,
    mime: str = "application/octet-stream",
) -> Artifact:
    art = Artifact(
        job_id=job.id,
        type=type,
        file_path=rel_path,
        original_name=original_name,
        mime_type=mime,
    )
    db.add(art)
    db.commit()
    db.refresh(art)
    return art


def save_model_row(
    db: Session,
    job_id: str,
    name: str,
    metrics: dict,
    artifact_path: str | None = None,
    extra: dict | None = None,
) -> None:
    row = TrainedMLModel(job_id=job_id, name=name, metrics=metrics, artifact_path=artifact_path, extra=extra)
    db.add(row)
    db.commit()
