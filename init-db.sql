-- Supabase initialization script for self-hosted setup
-- This runs BEFORE Supabase's migrations
-- Supabase's own migrations will create supabase_admin, so we don't create it here

-- Enable required extensions (Supabase migrations need these to already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Note: supabase_admin and all other Supabase system roles
-- are created by Supabase's migration scripts (00000000000000-initial-schema.sql)
-- Do NOT create them here to avoid conflicts
