-- Database initialization for self-hosted Supabase
-- Creates all required roles and users for Supabase services

DO $$
DECLARE
  db_password TEXT := '__POSTGRES_PASSWORD__';
BEGIN
  -- Create supabase_admin role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE 'CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_admin role';
  ELSE
    RAISE NOTICE 'supabase_admin role already exists';
  END IF;
  
  -- Create supabase_auth_admin role (required by GoTrue)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_auth_admin role';
  ELSE
    RAISE NOTICE 'supabase_auth_admin role already exists';
  END IF;
  
  -- Create supabase_storage_admin role (required by Storage)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created supabase_storage_admin role';
  ELSE
    RAISE NOTICE 'supabase_storage_admin role already exists';
  END IF;
  
  -- Create authenticator role (required by PostgREST)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD ' || quote_literal(db_password);
    RAISE NOTICE 'Created authenticator role';
  ELSE
    RAISE NOTICE 'authenticator role already exists';
  END IF;
  
  -- Create anon role (for anonymous access)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    RAISE NOTICE 'Created anon role';
  ELSE
    RAISE NOTICE 'anon role already exists';
  END IF;
  
  -- Create authenticated role (for authenticated users)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
    RAISE NOTICE 'Created authenticated role';
  ELSE
    RAISE NOTICE 'authenticated role already exists';
  END IF;
  
  -- Create service_role (for service/admin access)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    RAISE NOTICE 'Created service_role';
  ELSE
    RAISE NOTICE 'service_role role already exists';
  END IF;
  
  -- Grant roles to authenticator (allows role switching)
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  
  -- Grant schema permissions to auth admin
  GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
  GRANT CREATE ON SCHEMA public TO supabase_auth_admin;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_auth_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_auth_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO supabase_auth_admin;
  
  -- Grant schema permissions to storage admin
  GRANT USAGE ON SCHEMA public TO supabase_storage_admin;
  GRANT CREATE ON SCHEMA public TO supabase_storage_admin;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_storage_admin;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_storage_admin;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_storage_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_storage_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_storage_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO supabase_storage_admin;
  
  -- Grant permissions to supabase_admin as well
  GRANT ALL ON SCHEMA public TO supabase_admin;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_admin;
  
  RAISE NOTICE 'Database initialization complete - all Supabase roles created';
END
$$;
