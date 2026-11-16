import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, datasets, download, jobs, projects, results
from app.utils.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as e:
        logger.exception("Database connection failed")
        msg = (
            "Database connection failed. For local PostgreSQL: start the service "
            "(e.g. sudo systemctl start postgresql), then run "
            "`bash scripts/init_postgres.sh` from icms-backend to create user/database icms. "
            "Ensure DATABASE_URL matches (default postgresql://icms:icms@localhost:5432/icms). "
            "Optional: DATABASE_URL=sqlite:///./icms.db for a quick test without Postgres."
        )
        raise RuntimeError(msg) from e
    yield


app = FastAPI(
    title="ICMS API",
    description="Intelligent Cleaning and Model Selection System — AutoML backend",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
_cors_kw: dict = {
    "allow_origins": _cors_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.CORS_RELAX_LOCAL_DEV:
    # Matches http://localhost:PORT and http://127.0.0.1:PORT (any port) for local Vite/HMR.
    _cors_kw["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
app.add_middleware(CORSMiddleware, **_cors_kw)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(jobs.router)
app.include_router(results.router)
app.include_router(download.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
