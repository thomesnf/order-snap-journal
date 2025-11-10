-- Patched Supabase auth schema with IF NOT EXISTS protection
-- NOTE: Roles are created in init-db.sql, this only handles schema and tables
-- FULLY IDEMPOTENT - safe to run multiple times

DO $$
BEGIN
  -- Grant roles to authenticator (safe to run multiple times, roles exist from init-db.sql)
  PERFORM 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticator';
  IF FOUND THEN
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    RAISE NOTICE 'Granted roles to authenticator';
  END IF;
  
  RAISE NOTICE 'Auth roles migration completed';
END
$$;

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Create auth.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  encrypted_password text,
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token text,
  confirmation_sent_at timestamp with time zone,
  recovery_token text,
  recovery_sent_at timestamp with time zone,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text,
  phone_confirmed_at timestamp with time zone,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamp with time zone,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamp with time zone,
  reauthentication_token text,
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_phone_key UNIQUE (phone)
);

-- Grant permissions on auth.users (safe to run multiple times)
DO $$
BEGIN
  -- Revoke all first to ensure clean state
  REVOKE ALL ON auth.users FROM anon, authenticated, service_role;
  
  -- Grant appropriate permissions
  GRANT SELECT ON auth.users TO anon, authenticated;
  GRANT ALL ON auth.users TO service_role;
  
  RAISE NOTICE 'Granted permissions on auth.users';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'auth.users table does not exist yet - skipping grants';
END
$$;

-- Create auth.uid() function for RLS policies
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Grant execute permission on auth.uid() to all roles
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- Create auth.role() function for checking user roles
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

-- Grant execute permission on auth.role() to all roles
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
