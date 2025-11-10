-- Complete database initialization for self-hosted Supabase
-- Creates all required roles, schemas, and permissions for Supabase services

DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create supabase_admin role (main admin with full privileges)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists';
  END IF;
  
  -- Create supabase_auth_admin role (for GoTrue auth service)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin role';
  ELSE
    RAISE NOTICE 'supabase_auth_admin role already exists';
  END IF;
  
  -- Create supabase_storage_admin role (for Storage service)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin role';
  ELSE
    RAISE NOTICE 'supabase_storage_admin role already exists';
  END IF;
  
  -- Create authenticator role (used by PostgREST for role switching)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created authenticator role';
  ELSE
    RAISE NOTICE 'authenticator role already exists';
  END IF;
  
  -- Create anon role (for anonymous/unauthenticated access)
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
  
  -- Create service_role (for service/admin API access with bypass RLS)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    RAISE NOTICE 'Created service_role';
  ELSE
    RAISE NOTICE 'service_role role already exists';
  END IF;
  
  RAISE NOTICE 'All roles created successfully';
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
GRANT ALL ON SCHEMA realtime TO postgres, supabase_admin;

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

-- Install essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- Make extension functions publicly available
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

SELECT 'Database initialization complete - all roles, schemas, and permissions configured' as status;
