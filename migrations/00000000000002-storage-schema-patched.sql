-- Patched Supabase storage schema with IF NOT EXISTS protection
-- This runs as postgres superuser and creates necessary schemas

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Create uuid_generate_v4 function in extensions schema if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'extensions' AND p.proname = 'uuid_generate_v4'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
    RAISE NOTICE 'Created uuid-ossp extension in extensions schema';
  ELSE
    RAISE NOTICE 'uuid_generate_v4 already exists in extensions schema - skipping';
  END IF;
END
$$;

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Ensure default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon, authenticated;

RAISE NOTICE 'Storage schema and extensions initialized';
