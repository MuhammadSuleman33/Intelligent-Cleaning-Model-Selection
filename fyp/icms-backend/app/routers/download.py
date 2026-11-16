import io
import re
import zipfile
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.artifact import Artifact
from app.models.job import Job
from app.models.user import User
from app.services.storage import resolve_path

router = APIRouter(tags=["download"])


@router.get("/download/{artifact_id}")
def download_artifact(
    artifact_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    art = db.get(Artifact, artifact_id)
    if not art:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artifact not found")
    job = db.get(Job, art.job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    path = resolve_path(art.file_path)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing on server")

    media = art.mime_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    fname = art.original_name or Path(path).name
    return FileResponse(path, media_type=media, filename=fname)


def _sanitize_filename(value: str, default: str = "bundle") -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", value or "").strip("_.-")
    return safe or default


@router.get("/download/job_bundle/{job_id}")
def download_job_bundle(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    artifacts = db.scalars(select(Artifact).where(Artifact.job_id == job_id)).all()
    if not artifacts:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No artifacts found for this job")

    root_name = _sanitize_filename(job.dataset.original_filename if job.dataset else job.id, f"job_{job_id}")
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for art in artifacts:
            path = resolve_path(art.file_path)
            if not path.is_file():
                continue
            filename = _sanitize_filename(art.original_name or path.name)
            arcname = Path(root_name) / art.type.value / filename
            archive.write(path, arcname.as_posix())

    if memory_file.getbuffer().nbytes == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No downloadable artifacts found")

    memory_file.seek(0)
    archive_name = _sanitize_filename(
        f"{job.dataset.original_filename or job.id}_{job.id}_bundle.zip",
        "job_bundle.zip",
    )
    return StreamingResponse(
        memory_file,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{archive_name}"'},
    )
