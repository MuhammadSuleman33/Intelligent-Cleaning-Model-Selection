#!/usr/bin/env bash
# One-time local PostgreSQL setup (no Docker).
# Requires: PostgreSQL running, sudo access as OS user "postgres".
# Usage (from icms-backend): bash scripts/init_postgres.sh
#
# SQL is piped on stdin so the postgres user does not need read access to this
# folder (e.g. projects on /media/... often deny "other" users).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client/server (e.g. sudo apt install postgresql)."
  exit 1
fi

if ! id postgres &>/dev/null; then
  echo "No system user 'postgres'. Install the PostgreSQL server package."
  exit 1
fi

run_psql() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"
}

# Your user reads init_postgres.sql; postgres only sees stdin (avoids Permission denied on /media/...).
run_psql < "$ROOT/scripts/init_postgres.sql"

if run_psql -tAc "SELECT 1 FROM pg_database WHERE datname='icms'" | grep -qx 1; then
  echo "Database 'icms' already exists."
else
  run_psql -c "CREATE DATABASE icms OWNER icms;"
fi

# PostgreSQL 15+: CREATE on schema public is not granted to everyone; SQLAlchemy needs this for enums/tables.
run_psql -c "ALTER DATABASE icms OWNER TO icms;"
run_psql -d icms -v ON_ERROR_STOP=1 <<'EOSQL'
GRANT CREATE, USAGE ON SCHEMA public TO icms;
ALTER SCHEMA public OWNER TO icms;
EOSQL

echo ""
echo "OK. Use in .env:"
echo "  DATABASE_URL=postgresql://icms:icms@localhost:5432/icms"
echo "(Change user/password in PostgreSQL and .env if you use different credentials.)"
