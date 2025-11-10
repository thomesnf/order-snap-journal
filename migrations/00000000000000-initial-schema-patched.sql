-- Patched Supabase initial schema with IF NOT EXISTS protection
-- This replaces the built-in migration to prevent role creation conflicts

-- Create supabase_admin role (safe if already exists)
DO $$
DECLARE
  db_password TEXT;
BEGIN
  -- Get password from environment or use default
  db_password := current_setting('custom.postgres_password', true);
  IF db_password IS NULL THEN
    db_password := 'postgres';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists - skipping';
  END IF;
END
$$;

-- Create publication for realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication already exists - skipping';
  END IF;
END
$$;
