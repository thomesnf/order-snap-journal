-- Patched Supabase additional schemas with IF NOT EXISTS protection
-- This handles remaining schemas that Supabase may try to create

-- Create _realtime schema if it doesn't exist (internal realtime schema)
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Create supabase_storage_admin role if needed
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
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE ROLE supabase_storage_admin LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin role';
  ELSE
    RAISE NOTICE 'supabase_storage_admin role already exists - skipping';
  END IF;
END
$$;

-- Create supabase_auth_admin role if needed
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
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE ROLE supabase_auth_admin LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin role';
  ELSE
    RAISE NOTICE 'supabase_auth_admin role already exists - skipping';
  END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_realtime_admin;

RAISE NOTICE 'Additional Supabase schemas and roles initialized';
