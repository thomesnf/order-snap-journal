#!/bin/bash

# Fix GoTrue database connection and password verification
# This ensures GoTrue can connect and verify bcrypt passwords

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Fix GoTrue Connection & Authentication"
echo "=============================================="
echo ""

EMAIL="admin@localhost"
PASSWORD="admin123456"

echo -e "${BLUE}[1/4]${NC} Ensuring pgcrypto extension is in public schema..."
docker exec -i supabase-db psql -U postgres <<'EOF' 2>&1 | grep -v "pg_read_file" || true
-- Ensure pgcrypto extension exists in public schema (more accessible)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
EOF
echo -e "${GREEN}✓${NC} pgcrypto extension configured"
echo ""

echo -e "${BLUE}[2/4]${NC} Recreating admin user with GoTrue-compatible hash..."
docker exec -i supabase-db psql -U postgres <<EOF
DO \$\$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate bcrypt hash using public.crypt (more reliable)
  SELECT public.crypt('$PASSWORD', public.gen_salt('bf', 10)) INTO v_encrypted_password;
  
  -- Verify the hash was generated
  IF v_encrypted_password IS NULL OR LENGTH(v_encrypted_password) < 20 THEN
    RAISE EXCEPTION 'Failed to generate password hash';
  END IF;
  
  -- Get or create user
  SELECT id INTO v_user_id FROM auth.users WHERE email = '$EMAIL';
  
  IF v_user_id IS NULL THEN
    -- Create new user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      confirmed_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      '$EMAIL',
      v_encrypted_password,
      now(),
      now(),
      '',
      now(),
      '',
      now(),
      '',
      '',
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin User"}',
      false,
      now(),
      now(),
      null,
      null,
      '',
      '',
      now(),
      now(),
      '',
      0,
      null,
      '',
      now(),
      false,
      null,
      false,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_user_id;
    
    -- Create identity
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', '$EMAIL'),
      'email',
      now(),
      now(),
      now()
    );
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (v_user_id, 'Admin User', '$EMAIL')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT DO NOTHING;
    
  ELSE
    -- Update existing user password only (avoid generated columns)
    UPDATE auth.users
    SET encrypted_password = v_encrypted_password,
        updated_at = now()
    WHERE id = v_user_id;
    
    -- Separately ensure email is confirmed (using DEFAULT for generated column)
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmed_at = DEFAULT
    WHERE id = v_user_id AND (email_confirmed_at IS NULL OR confirmed_at IS NULL);
  END IF;
  
  RAISE NOTICE 'User created/updated successfully with ID: %', v_user_id;
END \$\$;
EOF
echo -e "${GREEN}✓${NC} Admin user configured"
echo ""

echo -e "${BLUE}[3/4]${NC} Restarting GoTrue service..."
docker restart supabase-auth
echo "Waiting for GoTrue to start..."
sleep 5
echo -e "${GREEN}✓${NC} GoTrue restarted"
echo ""

echo -e "${BLUE}[4/4]${NC} Verifying setup..."
docker exec -i supabase-db psql -U postgres -c "SELECT email, LENGTH(encrypted_password) as pwd_len, SUBSTRING(encrypted_password, 1, 10) as pwd_prefix, email_confirmed_at IS NOT NULL as confirmed FROM auth.users WHERE email='$EMAIL';"
echo ""

echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Credentials:"
echo "  Email: $EMAIL"
echo "  Password: $PASSWORD"
echo ""
echo "Test login with:"
echo "  sudo ./scripts/test-login.sh"
echo ""
