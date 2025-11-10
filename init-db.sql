-- Early initialization - runs BEFORE Supabase migrations
-- Create supabase_admin role first so it's available for all subsequent scripts

DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create supabase_admin if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists - skipping';
  END IF;
END
$$;

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create auth schema for migrations
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_admin;

RAISE NOTICE 'Early init complete - supabase_admin created, extensions enabled';
