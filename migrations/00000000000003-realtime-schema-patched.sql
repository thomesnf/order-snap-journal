-- Patched Supabase realtime schema with IF NOT EXISTS protection
-- This runs as postgres superuser and creates necessary schemas and roles

-- Create realtime schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS realtime;

-- Create supabase_realtime_admin role if needed
DO $$
DECLARE
  db_password TEXT;
BEGIN
  BEGIN
    db_password := current_setting('app.postgres_password');
  EXCEPTION
    WHEN undefined_object THEN
      db_password := 'postgres';
  END;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
    EXECUTE 'CREATE ROLE supabase_realtime_admin LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_realtime_admin role';
  ELSE
    RAISE NOTICE 'supabase_realtime_admin role already exists - skipping';
  END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;

RAISE NOTICE 'Realtime schema initialized';
