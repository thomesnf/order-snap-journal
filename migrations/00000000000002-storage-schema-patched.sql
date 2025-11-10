-- Patched Supabase storage schema with IF NOT EXISTS protection
-- This runs as postgres superuser and creates necessary schemas
-- NOTE: Extensions are created by Supabase's original scripts, not here

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Ensure default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon, authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Storage and extensions schemas initialized';
END
$$;
