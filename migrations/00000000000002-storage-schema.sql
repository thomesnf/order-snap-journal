-- Patched Supabase storage schema with IF NOT EXISTS protection
-- NOTE: Schemas are created in init-db.sql, this only handles permissions
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  -- Grant usage permissions (safe to run multiple times, schemas exist from init-db.sql)
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
    RAISE NOTICE 'Granted permissions on extensions schema';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    
    -- Ensure default privileges
    ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon, authenticated;
    
    RAISE NOTICE 'Granted permissions on storage schema';
  END IF;
  
  RAISE NOTICE 'Storage schema migration completed';
END
$$;
