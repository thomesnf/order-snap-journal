-- Comprehensive Supabase initialization for self-hosted setup
-- Creates ALL roles and extensions BEFORE any migrations run
-- All operations use IF NOT EXISTS to prevent conflicts and loops

-- STEP 1: Create supabase_admin FIRST (critical - required by all migrations)
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE USER supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin user';
  ELSE
    RAISE NOTICE 'supabase_admin already exists - skipping';
  END IF;
END
$$;

-- STEP 2: Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- STEP 3: Create auth schema with proper permissions
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT USAGE ON SCHEMA auth TO postgres;

-- STEP 4: Create ALL system roles (prevents migration conflicts)
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Auth admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE USER supabase_auth_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin';
  ELSE
    RAISE NOTICE 'supabase_auth_admin already exists - skipping';
  END IF;

  -- Authenticator role (used by PostgREST)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE USER authenticator WITH LOGIN NOINHERIT PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created authenticator';
  ELSE
    RAISE NOTICE 'authenticator already exists - skipping';
  END IF;

  -- Storage admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE USER supabase_storage_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin';
  ELSE
    RAISE NOTICE 'supabase_storage_admin already exists - skipping';
  END IF;

  -- Functions admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
    EXECUTE 'CREATE USER supabase_functions_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_functions_admin';
  ELSE
    RAISE NOTICE 'supabase_functions_admin already exists - skipping';
  END IF;

  -- Anonymous role (non-login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
    RAISE NOTICE 'Created anon role';
  ELSE
    RAISE NOTICE 'anon already exists - skipping';
  END IF;

  -- Authenticated role (non-login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    RAISE NOTICE 'Created authenticated role';
  ELSE
    RAISE NOTICE 'authenticated already exists - skipping';
  END IF;

  -- Service role with RLS bypass (non-login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    RAISE NOTICE 'Created service_role';
  ELSE
    RAISE NOTICE 'service_role already exists - skipping';
  END IF;
END
$$;

-- STEP 5: Grant schema permissions (idempotent operations)
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

-- STEP 6: Grant role memberships (with conflict handling)
DO $$
BEGIN
  -- These GRANTs are idempotent - PostgreSQL ignores if already granted
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  RAISE NOTICE 'Granted role memberships to authenticator';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Role memberships already exist - skipping';
END
$$;
