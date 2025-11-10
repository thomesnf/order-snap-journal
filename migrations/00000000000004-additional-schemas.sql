-- Additional schemas migration (minimal - core resources handled by Supabase image)
-- NOTE: Core Supabase schemas and permissions are created by the Supabase Docker image
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  RAISE NOTICE 'Additional schemas migration - Core Supabase resources handled by Docker image';
  RAISE NOTICE 'Skipping schema creation and permissions (handled by Supabase image)';
END
$$;
