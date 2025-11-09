-- Patched auth schema migration with IF NOT EXISTS protection
-- This prevents conflicts when roles already exist

-- Create auth schema (safe if exists)
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant permissions to supabase_admin (safe if already granted)
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT USAGE ON SCHEMA auth TO postgres;

-- Create or ensure roles exist
DO $$
DECLARE
  db_password TEXT := current_setting('app.settings.jwt_secret', true);
BEGIN
  -- Ensure supabase_auth_admin exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN CREATEROLE;
  END IF;
  
  -- Ensure authenticator exists  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  
  -- Ensure anon exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  
  -- Ensure authenticated exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  
  -- Ensure service_role exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- Grant schema permissions (idempotent)
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

-- Grant role memberships (idempotent)
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Note: Actual auth tables and functions are created by Supabase's GoTrue service
-- This is just the schema and role setup
