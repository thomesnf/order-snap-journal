-- Database initialization for self-hosted Supabase
-- Creates all required roles, schemas, and permissions

DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create supabase_admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists';
  END IF;
  
  -- Create supabase_auth_admin role (required by GoTrue)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin role';
  ELSE
    RAISE NOTICE 'supabase_auth_admin role already exists';
  END IF;
  
  -- Create supabase_storage_admin role (required by Storage)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin role';
  ELSE
    RAISE NOTICE 'supabase_storage_admin role already exists';
  END IF;
  
  -- Create authenticator role (required by PostgREST)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created authenticator role';
  ELSE
    RAISE NOTICE 'authenticator role already exists';
  END IF;
  
  -- Create anon role (for anonymous access)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    RAISE NOTICE 'Created anon role';
  ELSE
    RAISE NOTICE 'anon role already exists';
  END IF;
  
  -- Create authenticated role (for authenticated users)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
    RAISE NOTICE 'Created authenticated role';
  ELSE
    RAISE NOTICE 'authenticated role already exists';
  END IF;
  
  -- Create service_role (for service/admin access)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    RAISE NOTICE 'Created service_role';
  ELSE
    RAISE NOTICE 'service_role role already exists';
  END IF;
  
  -- Grant roles to authenticator (allows role switching)
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  
  RAISE NOTICE 'All roles created successfully';
END
$$;

-- Create schemas with proper ownership
-- Auth schema - owned by supabase_auth_admin
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;

-- Storage schema - owned by supabase_storage_admin  
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;

-- Extensions schema - owned by postgres (for extensions)
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION postgres;

-- Realtime schema - owned by supabase_admin
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_admin;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Grant permissions on public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres, supabase_admin;

-- Grant all privileges to supabase_admin on all schemas
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT ALL ON SCHEMA storage TO supabase_admin;
GRANT ALL ON SCHEMA extensions TO supabase_admin;
GRANT ALL ON SCHEMA realtime TO supabase_admin;

-- Grant table privileges
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, supabase_admin;

-- Set default privileges for future objects in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, supabase_admin;

-- Allow authenticated and service_role to access public tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated, service_role;

-- Grant authenticator ability to switch roles
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Enable necessary extensions in extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- Make extensions functions available to all
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

SELECT 'Database initialization complete - all roles and schemas created' as status;
