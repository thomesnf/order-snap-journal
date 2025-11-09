-- Supabase initialization script for self-hosted setup
-- Let Supabase's own migrations create all Supabase roles
-- This script only adds custom application-specific initialization

-- Enable required extensions (Supabase needs these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Note: All Supabase system roles (supabase_admin, authenticator, etc.) 
-- are created by Supabase's migration scripts automatically
-- They will all use the POSTGRES_PASSWORD from environment variables
