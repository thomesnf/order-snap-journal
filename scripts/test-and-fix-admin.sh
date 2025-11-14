#!/bin/bash

# Test and Fix Admin User Authentication
# This script verifies the admin user and fixes password hash issues

set -e

chmod +x "$0" 2>/dev/null || true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Admin User Test & Fix"
echo "=============================================="
echo ""

# Load environment
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

source .env.self-hosted

ADMIN_EMAIL="admin@localhost"
ADMIN_PASSWORD="admin123456"

echo -e "${BLUE}[1/5]${NC} Ensuring pgcrypto extension..."
docker exec -i supabase-db psql -U postgres -d postgres << 'SQL' 2>&1 | grep -v "already exists" || true
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
SQL
echo -e "${GREEN}✓${NC} pgcrypto ready"
echo ""

echo -e "${BLUE}[2/5]${NC} Checking if admin user exists..."
USER_EXISTS=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
  "SELECT EXISTS(SELECT 1 FROM auth.users WHERE email='$ADMIN_EMAIL');" 2>&1 | xargs)

if [ "$USER_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Admin user exists"
else
    echo -e "${RED}✗${NC} Admin user does not exist!"
    echo "  Creating admin user now..."
    
    # Create the admin user
    docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 << 'EOSQL'
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate bcrypt hash
  v_encrypted_password := crypt('admin123456', gen_salt('bf', 10));
  
  -- Create user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'admin@localhost', v_encrypted_password, now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin User"}'::jsonb,
    'authenticated', 'authenticated', now(), now(), '', '', '', ''
  )
  RETURNING id INTO v_user_id;
  
  -- Create identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@localhost', 'email_verified', true),
    'email', now(), now(), now());
  
  -- Create role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::public.app_role);
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email) VALUES (v_user_id, 'Admin User', 'admin@localhost');
  
  RAISE NOTICE 'Admin user created with ID: %', v_user_id;
END $$;
EOSQL
    
    echo -e "${GREEN}✓${NC} Admin user created"
fi
echo ""

echo -e "${BLUE}[3/5]${NC} Checking user confirmation status..."
USER_CONFIRMED=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
  "SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE email='$ADMIN_EMAIL';" | xargs)

if [ "$USER_CONFIRMED" = "t" ]; then
    echo -e "${GREEN}✓${NC} User email is confirmed"
else
    echo -e "${YELLOW}⚠${NC} User email NOT confirmed - fixing..."
    docker exec -i supabase-db psql -U postgres -d postgres -c \
      "UPDATE auth.users SET email_confirmed_at=now() WHERE email='$ADMIN_EMAIL';"
    echo -e "${GREEN}✓${NC} Email confirmed"
fi
echo ""

echo -e "${BLUE}[4/6]${NC} Testing current password..."
AUTH_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>&1)

if echo "$AUTH_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓${NC} Password is correct! Authentication works!"
    echo ""
    echo "=============================================="
    echo -e "${GREEN}  All Good!${NC}"
    echo "=============================================="
    echo ""
    echo "You can log in at: http://13.37.0.96"
    echo "Email: $ADMIN_EMAIL"
    echo "Password: $ADMIN_PASSWORD"
    exit 0
else
    echo -e "${RED}✗${NC} Password authentication failed"
    echo "  Response: $AUTH_RESPONSE"
    echo ""
    echo "Attempting to fix password hash..."
fi
echo ""

echo -e "${BLUE}[5/6]${NC} Regenerating password hash..."
# Delete and recreate user with proper bcrypt hash
docker exec -i supabase-db psql -U postgres << 'EOSQL'
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Get existing user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@localhost';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Generate new bcrypt hash with cost factor 10 (GoTrue default)
  v_encrypted_password := crypt('admin123456', gen_salt('bf', 10));
  
  -- Update password and ensure email is confirmed
  UPDATE auth.users 
  SET 
    encrypted_password = v_encrypted_password,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Ensure identity exists
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text, 
      'email', 'admin@localhost',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, id) 
  DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    last_sign_in_at = now(),
    updated_at = now();
  
  RAISE NOTICE 'Password hash updated for user: %', v_user_id;
END $$;
EOSQL

echo -e "${GREEN}✓${NC} Password hash regenerated"
echo ""

echo -e "${BLUE}[6/6]${NC} Testing new password..."
sleep 2  # Give GoTrue a moment to sync

AUTH_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$AUTH_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓${NC} Authentication now works!"
    echo ""
    echo "=============================================="
    echo -e "${GREEN}  Fixed Successfully!${NC}"
    echo "=============================================="
    echo ""
    echo "You can now log in at: http://13.37.0.96"
    echo "Email: $ADMIN_EMAIL"
    echo "Password: $ADMIN_PASSWORD"
else
    echo -e "${RED}✗${NC} Authentication still failing!"
    echo "  Response: $AUTH_RESPONSE"
    echo ""
    echo "Debug steps:"
    echo "  1. Check GoTrue logs: docker logs supabase-auth --tail 100"
    echo "  2. Verify database: docker exec -i supabase-db psql -U postgres -c \"SELECT email, encrypted_password, email_confirmed_at FROM auth.users WHERE email='$ADMIN_EMAIL';\""
    echo "  3. Restart GoTrue: docker-compose -f docker-compose.self-hosted.yml restart auth"
    exit 1
fi
echo ""
