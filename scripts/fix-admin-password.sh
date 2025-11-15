#!/bin/bash

# Fix admin user password with proper bcrypt hash
# This resolves the MD5 vs bcrypt authentication issue

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Fixing Admin Password Hash"
echo "=============================================="
echo ""

EMAIL="admin@localhost"
PASSWORD="admin123456"

echo -e "${BLUE}[1/3]${NC} Ensuring pgcrypto extension is available..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
-- Try to create extension in multiple locations
DO $$
BEGIN
  -- Try extensions schema first
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
    RAISE NOTICE 'pgcrypto available in extensions schema';
  EXCEPTION WHEN OTHERS THEN
    -- Try public schema
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
      RAISE NOTICE 'pgcrypto available in public schema';
    EXCEPTION WHEN OTHERS THEN
      -- Try without schema specification
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      RAISE NOTICE 'pgcrypto available in default schema';
    END;
  END;
END $$;
EOF

echo -e "${GREEN}✓${NC} pgcrypto extension ready"
echo ""

echo -e "${BLUE}[2/3]${NC} Regenerating admin user with bcrypt password..."
docker exec -i supabase-db psql -U postgres -d postgres <<EOF
DO \$\$
DECLARE
  v_user_id uuid;
  v_password_hash text;
  v_crypt_func text;
BEGIN
  -- Determine which crypt function is available
  BEGIN
    -- Test extensions schema
    v_password_hash := extensions.crypt('$PASSWORD', extensions.gen_salt('bf', 10));
    v_crypt_func := 'extensions.crypt';
    RAISE NOTICE 'Using extensions.crypt()';
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Test public schema
      v_password_hash := public.crypt('$PASSWORD', public.gen_salt('bf', 10));
      v_crypt_func := 'public.crypt';
      RAISE NOTICE 'Using public.crypt()';
    EXCEPTION WHEN OTHERS THEN
      -- Test no schema prefix
      v_password_hash := crypt('$PASSWORD', gen_salt('bf', 10));
      v_crypt_func := 'crypt';
      RAISE NOTICE 'Using crypt()';
    END;
  END;
  
  -- Verify we have a bcrypt hash (should start with \$2)
  IF v_password_hash !~ '^\\\$2[aby]\\\$' THEN
    RAISE EXCEPTION 'Failed to generate bcrypt hash. Got: %', SUBSTRING(v_password_hash, 1, 20);
  END IF;
  
  RAISE NOTICE 'Generated bcrypt hash (length: %, prefix: %)', LENGTH(v_password_hash), SUBSTRING(v_password_hash, 1, 7);
  
  -- Get or create user
  SELECT id INTO v_user_id FROM auth.users WHERE email = '$EMAIL';
  
  IF v_user_id IS NULL THEN
    -- Create new user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, confirmation_sent_at, confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      '$EMAIL',
      v_password_hash,
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Admin User"}'::jsonb,
      now(),
      now(),
      false
    ) RETURNING id INTO v_user_id;
    
    -- Create identity
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', '$EMAIL', 'email_verified', true, 'phone_verified', false, 'provider', 'email'),
      'email', now(), now(), now()
    );
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name, email) 
    VALUES (v_user_id, 'Admin User', '$EMAIL')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Admin User', email = '$EMAIL';
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Created new admin user';
  ELSE
    -- Update existing user password (only update password and updated_at)
    UPDATE auth.users 
    SET encrypted_password = v_password_hash,
        updated_at = now()
    WHERE id = v_user_id;
    
    -- Separately ensure email is confirmed (avoid constraint issues)
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = v_user_id AND email_confirmed_at IS NULL;
    
    RAISE NOTICE 'Updated existing admin user password';
  END IF;
  
  RAISE NOTICE 'Admin user ready with ID: %', v_user_id;
END \$\$;
EOF

echo -e "${GREEN}✓${NC} Admin password updated with bcrypt hash"
echo ""

echo -e "${BLUE}[3/3]${NC} Verifying password hash..."
docker exec -i supabase-db psql -U postgres -d postgres <<EOF
SELECT 
  email,
  LENGTH(encrypted_password) as hash_length,
  SUBSTRING(encrypted_password, 1, 7) as hash_type,
  CASE 
    WHEN encrypted_password ~ '^\\\$2[aby]\\\$' THEN 'bcrypt ✓'
    WHEN LENGTH(encrypted_password) = 32 THEN 'MD5 ✗'
    ELSE 'unknown ✗'
  END as hash_format
FROM auth.users 
WHERE email = '$EMAIL';
EOF

echo ""
echo "=============================================="
echo -e "${GREEN}  Password Fix Complete!${NC}"
echo "=============================================="
echo ""
echo "You can now login with:"
echo "  Email: $EMAIL"
echo "  Password: $PASSWORD"
echo ""
echo "Test with: sudo ./scripts/test-local-login.sh"
echo ""
