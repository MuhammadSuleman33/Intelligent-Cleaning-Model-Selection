import os
import uuid
from pathlib import Path

from app.config import get_settings


def ensure_storage_dirs() -> Path:
    settings = get_settings()
    root = Path(settings.STORAGE_ROOT).resolve()
    (root / "uploads").mkdir(parents=True, exist_ok=True)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)
    return root


def save_upload_file(content: bytes, original_name: str) -> tuple[str, int]:
    """Returns (relative_path_from_storage_root, size_bytes)."""
    root = ensure_storage_dirs()
    ext = Path(original_name).suffix.lower() or ".bin"
    safe = f"{uuid.uuid4().hex}{ext}"
    rel = f"uploads/{safe}"
    abs_path = root / rel
    abs_path.write_bytes(content)
    return rel, len(content)


def artifact_path(job_id: str, name: str) -> tuple[str, Path]:
    root = ensure_storage_dirs()
    sub = root / "artifacts" / job_id
    sub.mkdir(parents=True, exist_ok=True)
    rel = f"artifacts/{job_id}/{name}"
    return rel, root / rel


def resolve_path(rel: str) -> Path:
    return Path(get_settings().STORAGE_ROOT).resolve() / rel
