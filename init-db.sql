-- Supabase initialization script for self-hosted setup
-- This creates all required system users and schemas

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create required schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- Create system users with passwords from environment
-- Note: Docker compose will substitute these at runtime
CREATE USER authenticator WITH PASSWORD :'POSTGRES_PASSWORD';
CREATE USER supabase_auth_admin WITH PASSWORD :'POSTGRES_PASSWORD';
CREATE USER supabase_storage_admin WITH PASSWORD :'POSTGRES_PASSWORD';
CREATE USER anon NOLOGIN;
CREATE USER service_role NOLOGIN;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA public TO authenticator;

-- Grant authenticator the ability to switch roles
GRANT anon TO authenticator;
GRANT service_role TO authenticator;

-- Public schema permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;
