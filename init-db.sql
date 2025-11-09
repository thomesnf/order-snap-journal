-- Supabase initialization script for self-hosted setup
-- CRITICAL: Create supabase_admin BEFORE Supabase migrations run
-- The migrations expect this role to exist

-- Create supabase_admin user first
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE USER supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin user';
  ELSE
    RAISE NOTICE 'supabase_admin user already exists';
  END IF;
END
$$;

-- Enable required extensions (Supabase needs these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- All other Supabase roles (authenticator, anon, service_role, etc.) 
-- will be created by Supabase's migration scripts
