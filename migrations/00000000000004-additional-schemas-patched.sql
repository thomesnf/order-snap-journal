-- Patched Supabase additional schemas with IF NOT EXISTS protection
-- This handles remaining schemas that Supabase may try to create
-- FULLY IDEMPOTENT - safe to run multiple times

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
  
  -- Create _realtime schema if it doesn't exist (internal realtime schema)
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '_realtime') THEN
    CREATE SCHEMA _realtime;
    RAISE NOTICE 'Created _realtime schema';
  ELSE
    RAISE NOTICE '_realtime schema already exists - skipping';
  END IF;
  
  -- Create supabase_storage_admin role if needed
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE ROLE supabase_storage_admin LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin role';
  ELSE
    RAISE NOTICE 'supabase_storage_admin role already exists - skipping';
  END IF;
  
  -- Create supabase_auth_admin role if needed
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE ROLE supabase_auth_admin LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin role';
  ELSE
    RAISE NOTICE 'supabase_auth_admin role already exists - skipping';
  END IF;
  
  -- Grant permissions (safe to run multiple times)
  -- First check if schemas exist before granting
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '_realtime') THEN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
      GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
      GRANT ALL ON SCHEMA _realtime TO supabase_realtime_admin;
    END IF;
  END IF;
  
  RAISE NOTICE 'Additional schemas migration completed';
END
$$;
