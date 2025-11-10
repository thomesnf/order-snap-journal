-- Early initialization - runs as postgres superuser
-- ONLY create supabase_admin role here
-- Let Supabase's built-in scripts handle extensions and schemas

-- Create supabase_admin role with IF NOT EXISTS protection
DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists - skipping';
  END IF;
  
  RAISE NOTICE 'Init complete - supabase_admin role ready for Supabase initialization';
END
$$;
