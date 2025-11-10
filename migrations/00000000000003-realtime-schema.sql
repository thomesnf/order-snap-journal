-- Realtime schema migration (minimal - core realtime resources handled by Supabase image)
-- NOTE: Core realtime schema and permissions are created by the Supabase Docker image
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  RAISE NOTICE 'Realtime schema migration - Core realtime resources handled by Supabase image';
  RAISE NOTICE 'Skipping schema permissions (handled by Supabase image)';
END
$$;
