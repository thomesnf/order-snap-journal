-- Minimal initialization - only extensions
-- Let Supabase migrations handle role creation
-- This file runs BEFORE the built-in Supabase migrations

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

RAISE NOTICE 'Extensions created - roles will be created by Supabase migrations';
