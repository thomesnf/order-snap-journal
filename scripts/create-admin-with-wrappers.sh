#!/bin/bash

# pgcrypto Type Casting Fix

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  pgcrypto Type Casting Fix"
echo "=============================================="
echo ""

if ! docker ps | grep -q supabase-db; then
    echo -e "${RED}✗${NC} Database container is not running!"
    exit 1
fi

echo -e "${BLUE}[Test 1]${NC} Testing with explicit text casting..."
docker exec supabase-db psql -U postgres -d postgres <<'SQL'
-- Test with explicit type casting
SELECT gen_salt('bf'::text);
SQL

echo ""
echo -e "${BLUE}[Test 2]${NC} Testing crypt with explicit casting..."
docker exec supabase-db psql -U postgres -d postgres <<'SQL'
-- Test crypt with explicit type casting
SELECT crypt('testpassword'::text, gen_salt('bf'::text));
SQL

echo ""
echo -e "${BLUE}[Test 3]${NC} Creating wrapper functions with correct types..."
docker exec supabase-db psql -U postgres -d postgres <<'SQL'
-- Create wrapper functions in public schema if needed
CREATE OR REPLACE FUNCTION public.gen_salt_bf() 
RETURNS text AS $$
  SELECT gen_salt('bf'::text);
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION public.hash_password(password text) 
RETURNS text AS $$
  SELECT crypt(password, gen_salt('bf'::text, 10));
$$ LANGUAGE SQL;

-- Test the wrapper
SELECT hash_password('testpassword123');
SQL

echo ""
echo -e "${BLUE}[Test 4]${NC} Creating admin user with wrapper function..."
docker exec supabase-db psql -U postgres -d postgres <<'SQL'
DO $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  -- Use the wrapper function
  v_password_hash := hash_password('admin123456');
  
  -- Clean up existing user
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM auth.users WHERE email = 'admin@localhost';
  
  -- Create user with hashed password
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin@localhost',
    v_password_hash, now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin User"}'::jsonb,
    'authenticated', 'authenticated', now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;
  
  -- Create identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, 
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@localhost', 'email_verified', true, 'phone_verified', false, 'provider', 'email'),
    'email', now(), now(), now());
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email) VALUES (v_user_id, 'Admin User', 'admin@localhost');
  
  RAISE NOTICE 'Admin user created successfully!';
  RAISE NOTICE 'Email: admin@localhost';
  RAISE NOTICE 'Password: admin123456';
  RAISE NOTICE 'Password hash: %', v_password_hash;
END $$;
SQL

echo ""
echo -e "${GREEN}✓${NC} If you see a bcrypt hash above (starting with \$2), the admin user was created successfully!"
echo ""
echo "Login credentials:"
echo "  Email: admin@localhost"
echo "  Password: admin123456"
echo ""
