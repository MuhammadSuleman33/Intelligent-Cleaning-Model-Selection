from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job
from app.models.user import User

router = APIRouter(tags=["results"])


@router.get("/results/{job_id}")
async def get_results(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    if job.results is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Results not ready yet")

    data = deepcopy(job.results)
    base = str(request.base_url).rstrip("/")
    downloads = data.get("downloads")
    if isinstance(downloads, dict):
        for k, v in list(downloads.items()):
            if isinstance(v, str) and v.startswith("/"):
                downloads[k] = f"{base}{v}"
    return data
