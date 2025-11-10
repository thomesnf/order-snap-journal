-- Patched Supabase initial schema with IF NOT EXISTS protection
-- This runs as postgres superuser and creates all necessary roles

-- Get password from setup script
DO $$
DECLARE
  db_password TEXT;
BEGIN
  -- Try to get from environment, fallback to postgres
  BEGIN
    db_password := current_setting('app.postgres_password');
  EXCEPTION
    WHEN undefined_object THEN
      db_password := 'postgres';
  END;
  
  -- Create supabase_admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists - skipping';
  END IF;
END
$$;

-- Create publication for realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication already exists - skipping';
  END IF;
END
$$;
