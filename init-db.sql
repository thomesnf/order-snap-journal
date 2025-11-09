-- Supabase initialization script for self-hosted setup
-- DO NOT create supabase_admin - Supabase's migration creates it
-- We only create supporting roles and extensions

-- Enable required extensions FIRST
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create only the non-admin roles that migrations might need
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create authenticator (if migration doesn't)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE USER authenticator WITH LOGIN NOINHERIT CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create other service accounts (if migration doesn't)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE USER supabase_auth_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE USER supabase_storage_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
    EXECUTE 'CREATE USER supabase_functions_admin WITH LOGIN CREATEROLE PASSWORD ' || quote_literal(db_password);
  END IF;

  -- Create non-login roles
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- Grant memberships (migrations will also do this, but it's idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
  END IF;
END
$$;
