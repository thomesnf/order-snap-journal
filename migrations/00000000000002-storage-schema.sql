-- Patched Supabase storage schema with IF NOT EXISTS protection
-- This runs as postgres superuser and creates necessary schemas
-- FULLY IDEMPOTENT - safe to run multiple times
-- NOTE: Extensions are created by Supabase's original scripts, not here

DO $$
BEGIN
  -- Create extensions schema if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
    RAISE NOTICE 'Created extensions schema';
  ELSE
    RAISE NOTICE 'extensions schema already exists - skipping';
  END IF;
  
  -- Create storage schema if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    CREATE SCHEMA storage;
    RAISE NOTICE 'Created storage schema';
  ELSE
    RAISE NOTICE 'storage schema already exists - skipping';
  END IF;
  
  -- Grant usage permissions (safe to run multiple times)
  GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  
  -- Ensure default privileges
  ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon, authenticated;
  
  RAISE NOTICE 'Storage schema migration completed';
END
$$;
