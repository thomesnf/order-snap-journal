-- Initial schema migration (placeholder)
-- NOTE: Core Supabase resources (publications, schemas, roles) are created by the Supabase Docker image
-- This migration is intentionally minimal to avoid conflicts with built-in initialization

DO $$
BEGIN
  RAISE NOTICE 'Initial schema migration - Core Supabase resources handled by Docker image';
  RAISE NOTICE 'Skipping publication creation (handled by Supabase image)';
END
$$;
