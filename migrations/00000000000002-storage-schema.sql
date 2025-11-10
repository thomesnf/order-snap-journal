-- Storage schema migration (minimal - core storage resources handled by Supabase image)
-- NOTE: Core storage schemas and permissions are created by the Supabase Docker image
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  RAISE NOTICE 'Storage schema migration - Core storage resources handled by Supabase image';
  RAISE NOTICE 'Skipping schema permissions (handled by Supabase image)';
END
$$;
