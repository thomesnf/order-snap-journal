-- Supabase initialization script for self-hosted setup
-- This MUST create supabase_admin FIRST before anything else
-- Supabase's migrations expect this role to already exist

-- STEP 1: Create supabase_admin role immediately (before extensions or anything else)
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE USER supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin user';
  END IF;
END
$$;

-- STEP 2: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- STEP 3: Create additional system roles and users
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create authenticator if not exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE USER authenticator WITH LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created authenticator user';
  END IF;
  
  -- Create auth admin if not exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE USER supabase_auth_admin WITH LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin user';
  END IF;
  
  -- Create storage admin if not exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE USER supabase_storage_admin WITH LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin user';
  END IF;
  
  -- Create anon role if not exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    RAISE NOTICE 'Created anon role';
  END IF;
  
  -- Create service_role if not exists
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
    RAISE NOTICE 'Created service_role role';
  END IF;
END
$$;

-- Grant permissions (idempotent)
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO authenticator;
  GRANT ALL ON SCHEMA public TO authenticator;
  GRANT anon TO authenticator;
  GRANT service_role TO authenticator;
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT USAGE ON SCHEMA public TO service_role;
  RAISE NOTICE 'Granted permissions';
END
$$;
