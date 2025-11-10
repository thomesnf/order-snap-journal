-- Patched Supabase initial schema with IF NOT EXISTS protection
-- NOTE: Roles are created in init-db.sql, this only handles publications
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  -- Create publication for realtime (only if doesn't exist)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication already exists - skipping';
  END IF;
  
  RAISE NOTICE 'Initial schema migration completed';
END
$$;
