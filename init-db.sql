-- Early initialization - runs as postgres superuser
-- Create supabase_admin role FIRST, then extensions

-- Step 1: Create supabase_admin role with IF NOT EXISTS protection
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists - skipping';
  END IF;
END
$$;

-- Step 2: Grant necessary permissions for extension loading
-- supabase_admin needs to read server files for custom extension scripts
GRANT pg_read_server_files TO supabase_admin;

-- Step 3: Create required PostgreSQL extensions with IF NOT EXISTS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Step 4: Create auth schema if needed
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_admin;

RAISE NOTICE 'Init complete - supabase_admin role and extensions ready';
