-- Supabase initialization script
-- Note: The supabase/postgres image already includes most setup
-- This script only runs if the database is completely fresh

-- The image already creates these users, schemas, and extensions
-- We just ensure basic structure is in place

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure public schema exists and has correct permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
