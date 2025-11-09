-- Supabase initialization script for self-hosted setup
-- This creates ALL Supabase system roles BEFORE Supabase's migrations run
-- Supabase migrations will skip role creation if they already exist

DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create supabase_admin with full privileges
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE USER supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create authenticator
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE USER authenticator WITH LOGIN NOINHERIT CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create supabase_auth_admin  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE USER supabase_auth_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create supabase_storage_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE USER supabase_storage_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create anon role (no login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  -- Create authenticated role (no login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  -- Create service_role (no login)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  -- Create supabase_functions_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
    EXECUTE 'CREATE USER supabase_functions_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Grant role memberships
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  
  GRANT anon TO supabase_auth_admin;
  GRANT authenticated TO supabase_auth_admin;
  GRANT service_role TO supabase_auth_admin;
END
$$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS supabase_functions AUTHORIZATION supabase_admin;
