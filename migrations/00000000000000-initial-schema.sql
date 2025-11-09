-- Modified Supabase initial schema with IF NOT EXISTS protection
-- This replaces the original migration to prevent role creation conflicts

-- Create supabase_admin role (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
  END IF;
END
$$;

-- Create publication for realtime
CREATE PUBLICATION supabase_realtime;

-- Note: This is a minimal version. The full Supabase migration does more,
-- but those operations should be handled by our init-db.sql
