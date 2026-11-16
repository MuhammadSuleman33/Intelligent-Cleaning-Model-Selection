from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class JobStartRequest(BaseModel):
    dataset_id: int
    target_column: str
    task_type: Literal["classification", "regression"]
    project_id: Optional[int] = None
    options: Optional[dict[str, Any]] = None


class JobStartResponse(BaseModel):
    job_id: str
    id: str


class JobStatusOut(BaseModel):
    status: str
    state: Optional[str] = None
    step: Optional[str] = None
    current_step: Optional[str] = None
    progress: int = 0
    logs: Optional[list[str]] = None
    error: Optional[str] = None
    completed: bool = False
