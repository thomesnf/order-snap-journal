-- Auth schema migration (minimal - core auth resources handled by Supabase image)
-- NOTE: Core auth schema, tables, functions, and roles are created by the Supabase Docker image
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  RAISE NOTICE 'Auth schema migration - Core auth resources handled by Supabase image';
  RAISE NOTICE 'Skipping auth schema, tables, functions, and role grants (handled by Supabase image)';
END
$$;
