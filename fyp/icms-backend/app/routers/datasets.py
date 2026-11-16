from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.dataset import Dataset
from app.models.job import Job
from app.models.project import Project
from app.models.user import User
from app.schemas.dataset import DatasetDetailOut, DatasetListItem, DatasetUploadResponse
from app.services.dataset_cleanup import delete_dataset_for_user
from app.services.dataset_service import build_schema_preview, load_dataframe, validate_upload
from app.services.storage import save_upload_file
from app.ml.categorical_analysis import get_encoding_summary, create_sample_encoding_preview

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _latest_job_for_datasets(db: Session, dataset_ids: list[int]) -> dict[int, Job]:
    if not dataset_ids:
        return {}
    jobs = db.scalars(
        select(Job).where(Job.dataset_id.in_(dataset_ids)).order_by(Job.created_at.desc())
    ).all()
    out: dict[int, Job] = {}
    for j in jobs:
        if j.dataset_id not in out:
            out[j.dataset_id] = j
    return out


@router.post("/upload", response_model=DatasetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    project_id: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DatasetUploadResponse:
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    try:
        validate_upload(file.filename or "data.bin", len(content))
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    pid = None
    if project_id:
        try:
            pid = int(project_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid project_id") from None
        proj = db.get(Project, pid)
        if not proj or proj.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    rel, size = save_upload_file(content, file.filename or "upload.bin")

    abs_path = Path(get_settings().STORAGE_ROOT).resolve() / rel
    try:
        df = load_dataframe(abs_path)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not parse file: {e}") from e

    preview = build_schema_preview(df)

    ds = Dataset(
        user_id=user.id,
        project_id=pid,
        original_filename=file.filename or "upload.bin",
        stored_path=rel,
        mime_type=file.content_type or "",
        size_bytes=size,
        row_count=preview.get("row_count"),
        schema_preview=preview,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    return DatasetUploadResponse(
        dataset_id=ds.id,
        id=ds.id,
        schema_preview={"columns": preview["columns"], "sample_rows": preview["sample_rows"]},
        row_count=preview.get("row_count"),
    )


@router.get("", response_model=list[DatasetListItem])
def list_datasets(
    project_id: int | None = Query(None, description="Filter by project id"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DatasetListItem]:
    q = select(Dataset).where(Dataset.user_id == user.id)
    if project_id is not None:
        q = q.where(Dataset.project_id == project_id)
    q = q.order_by(Dataset.created_at.desc()).limit(200)
    rows = list(db.scalars(q).all())
    if not rows:
        return []
    latest = _latest_job_for_datasets(db, [d.id for d in rows])
    items: list[DatasetListItem] = []
    for d in rows:
        j = latest.get(d.id)
        items.append(
            DatasetListItem(
                id=d.id,
                original_filename=d.original_filename,
                row_count=d.row_count,
                project_id=d.project_id,
                created_at=d.created_at,
                latest_job_id=j.id if j else None,
                latest_job_status=j.status.value if j else None,
                latest_job_step=j.current_step if j else None,
            )
        )
    return items


@router.get("/{dataset_id}", response_model=DatasetDetailOut)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DatasetDetailOut:
    ds = db.get(Dataset, dataset_id)
    if not ds or ds.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")
    sp = ds.schema_preview or {}
    cols = sp.get("columns")
    samples = sp.get("sample_rows")
    schema_preview = None
    if cols is not None:
        schema_preview = {"columns": cols, "sample_rows": samples or []}
    latest = _latest_job_for_datasets(db, [ds.id]).get(ds.id)
    return DatasetDetailOut(
        id=ds.id,
        original_filename=ds.original_filename,
        row_count=ds.row_count,
        project_id=ds.project_id,
        created_at=ds.created_at,
        schema_preview=schema_preview,
        latest_job_id=latest.id if latest else None,
        latest_job_status=latest.status.value if latest else None,
    )


@router.get("/{dataset_id}/categorical-analysis", response_model=dict)
def analyze_categorical_data(
    dataset_id: int,
    target_column: str | None = Query(None, description="Target column for analysis"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Analyze categorical columns in a dataset and return encoding recommendations.
    Optionally takes a target column to exclude from analysis.
    """
    ds = db.get(Dataset, dataset_id)
    if not ds or ds.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")
    
    path = Path(get_settings().STORAGE_ROOT).resolve() / ds.stored_path
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset file not found")
    
    try:
        df = load_dataframe(path)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not load dataset: {e}") from e
    
    if df.empty:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Dataset is empty")
    
    try:
        encoding_summary = get_encoding_summary(df, target_column)
        encoding_preview = create_sample_encoding_preview(df, target_column, sample_rows=5)
        
        return {
            "dataset_id": dataset_id,
            "total_columns": len(df.columns),
            "total_rows": len(df),
            "encoding_summary": encoding_summary,
            "encoding_preview": encoding_preview,
        }
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Analysis failed: {e}") from e


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not delete_dataset_for_user(db, dataset_id, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")
