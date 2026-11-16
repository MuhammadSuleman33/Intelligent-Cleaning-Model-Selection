from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job, JobStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectOut
from app.services.job_cleanup import delete_project_for_user

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ProjectOut]:
    """Get all projects with last run status using optimized single query."""
    # Subquery to get the latest job for each project
    latest_job_subquery = (
        select(Job.project_id, func.max(Job.created_at).label("latest_created_at"))
        .where(Job.user_id == user.id)
        .group_by(Job.project_id)
        .subquery()
    )
    
    # Get latest jobs joined with project
    latest_jobs = db.execute(
        select(Job.project_id, Job.status)
        .select_from(Job)
        .join(
            latest_job_subquery,
            (Job.project_id == latest_job_subquery.c.project_id)
            & (Job.created_at == latest_job_subquery.c.latest_created_at),
        )
    ).all()

    # Build map of project_id to last status
    job_status_map = {pj[0]: pj[1].value for pj in latest_jobs if pj[1]}
    
    # Get projects with single query
    projects = db.scalars(
        select(Project).where(Project.user_id == user.id).order_by(Project.created_at.desc())
    ).all()
    
    out: list[ProjectOut] = []
    for p in projects:
        po = ProjectOut.model_validate(p)
        po = po.model_copy(update={"last_run_status": job_status_map.get(p.id)})
        out.append(po)
    return out


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectOut:
    p = Project(user_id=user.id, name=data.name, description=data.description or "")
    db.add(p)
    db.commit()
    db.refresh(p)
    po = ProjectOut.model_validate(p)
    return po.model_copy(update={"last_run_status": None})


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectOut:
    p = db.get(Project, project_id)
    if not p or p.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    
    # Optimized: get the latest job with single query
    latest_job = db.scalars(
        select(Job)
        .where(Job.project_id == p.id)
        .order_by(Job.created_at.desc())
        .limit(1)
    ).first()
    
    po = ProjectOut.model_validate(p)
    return po.model_copy(update={"last_run_status": latest_job.status.value if latest_job else None})


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not delete_project_for_user(db, project_id, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
