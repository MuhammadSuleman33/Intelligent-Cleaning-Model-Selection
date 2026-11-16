"""Remove job rows and artifact directories from storage."""

from __future__ import annotations

import shutil
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.dataset import Dataset
from app.models.job import Job
from app.models.project import Project


def remove_job_artifact_dir(job_id: str) -> None:
    root = Path(get_settings().STORAGE_ROOT).resolve()
    d = root / "artifacts" / str(job_id)
    if d.is_dir():
        shutil.rmtree(d, ignore_errors=True)


def delete_job_for_user(db: Session, job_id: str, user_id: int) -> bool:
    job = db.get(Job, job_id)
    if not job or job.user_id != user_id:
        return False
    remove_job_artifact_dir(job_id)
    db.delete(job)
    db.commit()
    return True


def delete_project_for_user(db: Session, project_id: int, user_id: int) -> bool:
    """
    Delete project and all associated jobs with artifact cleanup.
    Ensures cascade deletion is properly handled.
    """
    p = db.get(Project, project_id)
    if not p or p.user_id != user_id:
        return False
    
    # Explicitly delete all jobs associated with the project
    # This ensures artifact cleanup and database consistency
    jobs = list(db.scalars(select(Job).where(Job.project_id == project_id)).all())
    for j in jobs:
        try:
            remove_job_artifact_dir(j.id)
        except Exception as e:
            # Log but continue with other jobs
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to remove artifact directory for job {j.id}: {e}")
        db.delete(j)
    
    # Clear project_id from datasets that reference this project
    datasets = list(db.scalars(select(Dataset).where(Dataset.project_id == project_id)).all())
    for ds in datasets:
        ds.project_id = None
        db.add(ds)
    
    # Delete the project itself
    # Due to cascade=delete-orphan in the relationship, jobs will be cascade deleted
    # But we handle it explicitly above for proper artifact cleanup
    db.delete(p)
    db.commit()
    
    return True
