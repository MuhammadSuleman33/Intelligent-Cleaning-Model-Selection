import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.dataset import Dataset
from app.models.job import Job, JobStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.job import JobStartRequest, JobStartResponse, JobStatusOut
from app.services.job_cleanup import delete_job_for_user
from app.tasks.icms_pipeline import run_icms_pipeline

router = APIRouter(tags=["jobs"])


class JobListItem(BaseModel):
    id: str
    job_id: str
    project: str | None = None
    project_name: str | None = None
    status: str
    state: str | None = None
    step: str | None = None
    current_step: str | None = None


@router.get("/jobs", response_model=List[JobListItem])
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[JobListItem]:
    """
    List all jobs for the current user with optimized single query.
    Filters out jobs with deleted projects (orphaned jobs).
    """
    # Get all jobs for user, limited to recent 100
    rows = db.scalars(
        select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc()).limit(100)
    ).all()
    
    # Collect unique project IDs to fetch in batch
    project_ids = {j.project_id for j in rows if j.project_id}
    
    # Batch fetch all projects at once instead of one per job
    project_map = {}
    if project_ids:
        projects = db.scalars(select(Project).where(Project.id.in_(project_ids))).all()
        project_map = {p.id: p.name for p in projects}
    
    items: list[JobListItem] = []
    for j in rows:
        pname = project_map.get(j.project_id) if j.project_id else None
        
        # Clean up orphaned project references
        if j.project_id and j.project_id not in project_map:
            j.project_id = None
        
        items.append(
            JobListItem(
                id=j.id,
                job_id=j.id,
                project=str(j.project_id) if j.project_id else None,
                project_name=pname,
                status=j.status.value,
                state=j.status.value,
                step=j.current_step,
                current_step=j.current_step,
            )
        )
    
    # Commit any cleanup of orphaned project references
    db.commit()
    return items


@router.post("/jobs/start", response_model=JobStartResponse, status_code=status.HTTP_202_ACCEPTED)
def start_job(
    body: JobStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobStartResponse:
    ds = db.get(Dataset, body.dataset_id)
    if not ds or ds.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")

    if body.project_id is not None:
        proj = db.get(Project, body.project_id)
        if not proj or proj.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    job_id = str(uuid.uuid4())
    cfg: dict[str, Any] = {
        "target_column": body.target_column,
        "task_type": body.task_type,
        "options": body.options or {},
    }
    job = Job(
        id=job_id,
        user_id=user.id,
        dataset_id=ds.id,
        project_id=body.project_id,
        status=JobStatus.queued,
        current_step="queued",
        progress=0,
        config=cfg,
        logs="Job queued.",
    )
    db.add(job)
    db.commit()

    try:
        run_icms_pipeline.delay(job_id)
    except Exception as e:
        job.status = JobStatus.failed
        job.error_message = f"Could not queue worker: {e}"
        db.commit()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Celery broker unavailable. Start Redis and a Celery worker.",
        ) from e

    return JobStartResponse(job_id=job_id, id=job_id)


@router.get("/jobs/status/{job_id}", response_model=JobStatusOut)
def job_status(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobStatusOut:
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    logs_list = [ln for ln in (job.logs or "").split("\n") if ln.strip()]
    completed = job.status == JobStatus.completed
    err = job.error_message if job.status == JobStatus.failed else None
    return JobStatusOut(
        status=job.status.value,
        state=job.status.value,
        step=job.current_step,
        current_step=job.current_step,
        progress=job.progress,
        logs=logs_list,
        error=err,
        completed=completed,
    )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not delete_job_for_user(db, job_id, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
