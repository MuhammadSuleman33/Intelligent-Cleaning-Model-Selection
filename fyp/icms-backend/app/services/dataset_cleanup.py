"""Remove dataset rows and associated files from storage."""

from __future__ import annotations

import shutil
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.dataset import Dataset
from app.models.job import Job


def delete_dataset_for_user(db: Session, dataset_id: int, user_id: int) -> bool:
    """
    Delete a dataset owned by user_id: artifact dirs for all its jobs, upload file, then DB row (cascades jobs).
    Returns True if a row was deleted.
    """
    ds = db.get(Dataset, dataset_id)
    if not ds or ds.user_id != user_id:
        return False

    job_ids = list(db.scalars(select(Job.id).where(Job.dataset_id == dataset_id)).all())
    root = Path(get_settings().STORAGE_ROOT).resolve()
    for jid in job_ids:
        art_dir = root / "artifacts" / str(jid)
        if art_dir.is_dir():
            shutil.rmtree(art_dir, ignore_errors=True)

    upload_path = root / ds.stored_path
    try:
        if upload_path.is_file():
            upload_path.unlink()
    except OSError:
        pass

    db.delete(ds)
    db.commit()
    return True
