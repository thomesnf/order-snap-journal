-- Patched Supabase realtime schema with IF NOT EXISTS protection
-- NOTE: Schema is created in init-db.sql, this only handles permissions
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  -- Grant permissions (safe to run multiple times, schema exists from init-db.sql)
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'realtime') THEN
    -- Grant to supabase_realtime_admin if it exists
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
      GRANT USAGE ON SCHEMA realtime TO supabase_realtime_admin;
      GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;
      RAISE NOTICE 'Granted permissions on realtime schema';
    END IF;
  END IF;
  
  RAISE NOTICE 'Realtime schema migration completed';
END
$$;
