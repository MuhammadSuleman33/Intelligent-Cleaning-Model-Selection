# ICMS Backend

FastAPI service for **ICMS (Intelligent Cleaning and Model Selection System)**: JWT auth, projects/datasets, Celery workers for preprocessing, EDA, AutoML (scikit-learn, XGBoost, LightGBM), SHAP, and artifact downloads.

## Prerequisites

- Python 3.11+
- PostgreSQL (listening on **localhost:5432** by default)
- Redis (broker + result backend for Celery)

## Quick start

1. **PostgreSQL (no Docker)** — start the service and create the ICMS user and database once:

   ```bash
   sudo systemctl start postgresql   # if not already running
   cd icms-backend
   bash scripts/init_postgres.sh
   ```

   This creates role `icms` with password `icms` and database `icms`. If you prefer your own DB user, create them in `psql` and set `DATABASE_URL` in `.env`.

2. Create a virtualenv and install dependencies (required on Ubuntu/Debian — system `pip` raises **externally-managed-environment** / PEP 668 if you skip this):

   ```bash
   cd icms-backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Environment (copy `.env.example` → `.env` in `icms-backend/`):

   - `DATABASE_URL=postgresql://icms:icms@localhost:5432/icms` — default after `init_postgres.sh`
   - `CELERY_BROKER_URL=redis://localhost:6379/1`
   - `CELERY_RESULT_BACKEND=redis://localhost:6379/2`
   - `SECRET_KEY` — set a long random string in production
   - `STORAGE_ROOT=./storage` — local object storage root

   Optional: `DATABASE_URL=sqlite:///./icms.db` for a quick API test without Postgres (Celery worker uses the same URL).

4. Run the API:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Run a Celery worker (separate terminal, same venv and cwd):

   ```bash
   celery -A app.celery_app worker -l info
   ```

Open interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## Architecture

- **API:** `app/main.py`, routers under `app/routers/`
- **Workers:** `app/celery_app.py`, pipeline task `app/tasks/icms_pipeline.py`
- **ML:** `app/ml/` (preprocessing, EDA, AutoML, recommendation, SHAP helpers)
- **Persistence:** SQLAlchemy models in `app/models/`; files under `STORAGE_ROOT`

The pipeline task retries up to three times with backoff on `OSError` and `ConnectionError`. If Redis is down, `POST /jobs/start` returns **503** with a clear message.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register (role: student) |
| POST | `/auth/login` | JWT login |
| GET | `/auth/me` | Current user |
| GET/POST | `/projects` | List / create projects |
| POST | `/datasets/upload` | Upload CSV/XLSX |
| POST | `/jobs/start` | Queue training job |
| GET | `/jobs/status/{job_id}` | Poll status |
| GET | `/results/{job_id}` | Results JSON (download URLs are absolute) |
| GET | `/download/{artifact_id}` | Authenticated file download |

## Database migrations

Tables are created on startup (`Base.metadata.create_all`). For production, point Alembic at `DATABASE_URL` and generate revisions as needed.

## Docker Compose (optional)

If you use Docker instead of a local install, `docker compose up -d` starts Postgres on host port **5433** (see `docker-compose.yml`). Set `DATABASE_URL=postgresql://icms:icms@localhost:5433/icms` in that case.

## Troubleshooting

**`Permission denied` on `init_postgres.sql`** — Usually fixed in current `init_postgres.sh` by piping SQL on stdin. If it persists, copy the project to a path under your home directory (not a restricted `/media/...` mount) or run the SQL manually: `sudo -u postgres psql` and paste the contents of `scripts/init_postgres.sql`, then `CREATE DATABASE icms OWNER icms;`.

**`permission denied for schema public`** (PostgreSQL 15+) — Run `bash scripts/init_postgres.sh` again (it grants `CREATE`/`USAGE` on `public` and sets schema owner), or as superuser: `sudo -u postgres psql -d icms -c "GRANT CREATE, USAGE ON SCHEMA public TO icms; ALTER SCHEMA public OWNER TO icms;"`.

**`connection refused` on port 5432** — PostgreSQL is not running or not listening on TCP. Start it: `sudo systemctl start postgresql`, then run `bash scripts/init_postgres.sh`.

**`password authentication failed for user "icms"`** — Run `bash scripts/init_postgres.sh`, or set `DATABASE_URL` in `.env` to a user/password that exists in your cluster (e.g. peer auth as your Linux user: `postgresql://USER@localhost:5432/icms`).

**SQLite** — Set `DATABASE_URL=sqlite:///./icms.db` in `.env` for a minimal local run.
