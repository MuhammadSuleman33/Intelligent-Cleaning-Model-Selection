from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.job import Job


class ArtifactType(str, enum.Enum):
    cleaned_dataset = "cleaned_dataset"
    trained_model = "trained_model"
    pipeline = "pipeline"
    eda_report = "eda_report"
    pdf_report = "pdf_report"
    code_snippet = "code_snippet"
    log = "log"
    other = "other"


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    type: Mapped[ArtifactType] = mapped_column(Enum(ArtifactType), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_name: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/octet-stream")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped["Job"] = relationship("Job", back_populates="artifacts")
