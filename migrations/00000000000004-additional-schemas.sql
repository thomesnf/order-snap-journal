-- Patched Supabase additional schemas with IF NOT EXISTS protection
-- NOTE: Roles and schemas are created in init-db.sql, this only handles special cases
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  -- Create _realtime schema if it doesn't exist (internal realtime schema not in init-db.sql)
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '_realtime') THEN
    CREATE SCHEMA _realtime;
    RAISE NOTICE 'Created _realtime schema';
  ELSE
    RAISE NOTICE '_realtime schema already exists - skipping';
  END IF;
  
  -- Grant permissions (safe to run multiple times, roles exist from init-db.sql)
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
      GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
      GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    END IF;
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
