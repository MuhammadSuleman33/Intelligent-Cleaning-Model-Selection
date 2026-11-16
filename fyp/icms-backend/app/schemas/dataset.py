from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class DatasetUploadResponse(BaseModel):
    dataset_id: int
    id: int
    schema_preview: Optional[dict[str, Any]] = None
    row_count: Optional[int] = None


class DatasetListItem(BaseModel):
    id: int
    original_filename: str
    row_count: Optional[int] = None
    project_id: Optional[int] = None
    created_at: datetime
    latest_job_id: Optional[str] = None
    latest_job_status: Optional[str] = None
    latest_job_step: Optional[str] = None


class DatasetDetailOut(BaseModel):
    id: int
    original_filename: str
    row_count: Optional[int] = None
    project_id: Optional[int] = None
    created_at: datetime
    schema_preview: Optional[dict[str, Any]] = None
    latest_job_id: Optional[str] = None
    latest_job_status: Optional[str] = None
