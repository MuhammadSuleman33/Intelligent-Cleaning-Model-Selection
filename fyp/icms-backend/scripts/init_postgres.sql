-- ICMS database role (run via init_postgres.sh, or as superuser):
--   sudo -u postgres psql -f scripts/init_postgres.sql
--
-- Creates login role icms / password icms if missing. Database icms is created by the shell script.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'icms') THEN
    CREATE ROLE icms LOGIN PASSWORD 'icms';
  END IF;
END
$$;
