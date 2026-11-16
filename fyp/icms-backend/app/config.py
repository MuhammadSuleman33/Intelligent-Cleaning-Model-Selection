from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Local PostgreSQL default; create user/db with scripts/init_postgres.sh
    DATABASE_URL: str = "postgresql://icms:icms@localhost:5432/icms"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    STORAGE_ROOT: str = "./storage"
    MAX_UPLOAD_MB: int = 50

    USE_S3: bool = False
    S3_BUCKET: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = None

    LOG_LEVEL: str = "INFO"

    # Comma-separated origins for browser requests (Vite default :5173). Used with credentials (JWT).
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    # When True, also allow any http(s) origin on localhost / 127.0.0.1 with any port (fixes Vite :5174+).
    # Disable in production; rely on CORS_ORIGINS only.
    CORS_RELAX_LOCAL_DEV: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
