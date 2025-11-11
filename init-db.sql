-- Database initialization for self-hosted Supabase
-- NOTE: All core roles (supabase_admin, authenticator, anon, authenticated, service_role, etc.) 
-- are created automatically by the Supabase Docker image during initialization.
-- This script only handles schemas and permissions.

DO $$
BEGIN
  RAISE NOTICE 'Database initialization - Core roles handled by Supabase Docker image';
  RAISE NOTICE 'Configuring schemas and permissions only';
END
$$;

-- Create schemas with postgres as owner (allows migration systems to work)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS realtime;

-- Grant full access to schemas for admin roles
GRANT ALL ON SCHEMA auth TO postgres, supabase_admin, supabase_auth_admin;
GRANT ALL ON SCHEMA storage TO postgres, supabase_admin, supabase_storage_admin;
GRANT ALL ON SCHEMA public TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;
GRANT ALL ON SCHEMA extensions TO postgres, supabase_admin;
GRANT ALL ON SCHEMA realtime TO postgres, supabase_admin, supabase_realtime_admin;

-- Grant usage to API roles
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Grant all privileges on ALL existing tables to admin roles
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, supabase_admin, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, supabase_admin, supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres, supabase_admin, supabase_auth_admin;

GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, supabase_admin, supabase_storage_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres, supabase_admin, supabase_storage_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO postgres, supabase_admin, supabase_storage_admin;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;

-- Set default privileges for FUTURE objects (critical for migrations!)
-- Auth schema
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO postgres, supabase_admin, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres, supabase_admin, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON ROUTINES TO postgres, supabase_admin, supabase_auth_admin;

-- Storage schema  
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO postgres, supabase_admin, supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres, supabase_admin, supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON ROUTINES TO postgres, supabase_admin, supabase_storage_admin;

-- Public schema (used by ALL services for tracking and shared tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, supabase_admin, supabase_auth_admin, supabase_storage_admin;

-- API roles get read/write on public tables by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated, service_role;

-- Grant role switching capability to authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Note: Extensions are created automatically by Supabase postgres image
-- during its initialization process. We don't need to create them manually.

SELECT 'Database initialization complete - all roles, schemas, and permissions configured' as status;
