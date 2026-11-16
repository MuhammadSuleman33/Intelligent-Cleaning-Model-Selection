from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.artifact import Artifact
    from app.models.dataset import Dataset
    from app.models.project import Project
    from app.models.trained_ml_model import TrainedMLModel
    from app.models.user import User


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class JobStep(str, enum.Enum):
    queued = "queued"
    preprocessing = "preprocessing"
    eda = "eda"
    training = "training"
    evaluation = "evaluation"
    completed = "completed"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    status: Mapped[JobStatus] = mapped_column(default=JobStatus.queued, index=True)
    current_step: Mapped[str] = mapped_column(String(64), default=JobStep.queued.value)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    results: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="jobs")
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="jobs")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="jobs")
    ml_models: Mapped[list["TrainedMLModel"]] = relationship(
        "TrainedMLModel", back_populates="job", cascade="all, delete-orphan"
    )
    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact", back_populates="job", cascade="all, delete-orphan"
    )
