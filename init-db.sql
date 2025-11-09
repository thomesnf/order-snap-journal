-- Supabase initialization script for self-hosted setup
-- This creates all required system users and schemas

-- CRITICAL: Create supabase_admin FIRST before anything else
-- The setup script will replace __POSTGRES_PASSWORD__ with the actual password
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE USER supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;
END
$$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create required schemas (owned by supabase_admin)
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS supabase_functions AUTHORIZATION supabase_admin;

-- Create system roles first (non-login roles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Create remaining system users with password
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create authenticator user
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE USER authenticator WITH LOGIN PASSWORD ' || quote_literal(db_password);
  END IF;
  
  -- Create supabase_auth_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE USER supabase_auth_admin WITH LOGIN PASSWORD ' || quote_literal(db_password);
  END IF;
  
  -- Create supabase_storage_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE USER supabase_storage_admin WITH LOGIN PASSWORD ' || quote_literal(db_password);
  END IF;
END
$$;

-- Grant necessary permissions
DO $$
BEGIN
  -- Schema permissions for authenticator
  GRANT USAGE ON SCHEMA public TO authenticator;
  GRANT ALL ON SCHEMA public TO authenticator;
  
  -- Schema permissions for admin roles
  GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
  GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
  GRANT ALL ON SCHEMA public TO supabase_admin;
  
  -- Grant authenticator the ability to switch roles
  GRANT anon TO authenticator;
  GRANT service_role TO authenticator;
  
  -- Public schema permissions
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT USAGE ON SCHEMA public TO service_role;
END
$$;
