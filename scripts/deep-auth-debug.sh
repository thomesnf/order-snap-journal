#!/bin/bash

# Deep authentication debugging
# This will create a test user with a known simple password

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Deep Authentication Debugging"
echo "=============================================="
echo ""

# Load environment
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

source .env.self-hosted

TEST_EMAIL="test@localhost"
TEST_PASSWORD="testpass123"

echo -e "${BLUE}[1/7]${NC} Checking GoTrue database connection..."
GOTRUE_DB_HOST=$(docker exec supabase-auth printenv DATABASE_URL 2>/dev/null | grep -oP 'host=\K[^:]+' || echo "unknown")
echo "  GoTrue connecting to: $GOTRUE_DB_HOST"
echo ""

echo -e "${BLUE}[2/7]${NC} Removing any existing test user..."
docker exec -i supabase-db psql -U postgres <<SQL >/dev/null 2>&1
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = '$TEST_EMAIL');
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = '$TEST_EMAIL');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = '$TEST_EMAIL');
DELETE FROM auth.users WHERE email = '$TEST_EMAIL';
SQL
echo -e "${GREEN}✓${NC} Test user removed (if existed)"
echo ""

echo -e "${BLUE}[3/7]${NC} Creating test user with simple known password..."
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"

docker exec -i supabase-db psql -U postgres <<SQL
DO \$\$
DECLARE
    new_user_id UUID;
    new_hash TEXT;
BEGIN
    -- Enable pgcrypto
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Generate a new user ID
    new_user_id := gen_random_uuid();
    
    -- Generate bcrypt hash with cost 10
    new_hash := crypt('$TEST_PASSWORD', gen_salt('bf', 10));
    
    -- Insert user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        '$TEST_EMAIL',
        new_hash,
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Test User"}',
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );
    
    -- Insert identity
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', '$TEST_EMAIL'),
        'email',
        NOW(),
        NOW(),
        NOW()
    );
    
    -- Add admin role for testing
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin');
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name)
    VALUES (new_user_id, 'Test User');
    
    RAISE NOTICE 'Test user created with ID: %', new_user_id;
END \$\$;
SQL

echo -e "${GREEN}✓${NC} Test user created"
echo ""

echo -e "${BLUE}[4/7]${NC} Verifying test user in database..."
docker exec -i supabase-db psql -U postgres -t -c "
SELECT 
    email,
    email_confirmed_at IS NOT NULL as confirmed,
    substring(encrypted_password from 1 for 10) as hash_prefix,
    role,
    aud
FROM auth.users
WHERE email = '$TEST_EMAIL';
"
echo ""

echo -e "${BLUE}[5/7]${NC} Checking GoTrue configuration..."
docker exec supabase-auth printenv | grep -E "(JWT_SECRET|DATABASE_URL|SITE_URL)" | sed 's/\(JWT_SECRET=\).*/\1[HIDDEN]/' | sed 's/\(postgres:\/\/[^:]*:\)[^@]*/\1[HIDDEN]/'
echo ""

echo -e "${BLUE}[6/7]${NC} Restarting GoTrue to clear any cache..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted restart auth >/dev/null 2>&1
sleep 8
echo -e "${GREEN}✓${NC} GoTrue restarted"
echo ""

echo -e "${BLUE}[7/7]${NC} Testing authentication with test user..."
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  Endpoint: http://localhost:8000/auth/v1/token"
echo ""

RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✅ TEST USER AUTHENTICATION SUCCESSFUL!${NC}"
    echo ""
    echo "This means:"
    echo "  ✓ GoTrue is working correctly"
    echo "  ✓ Database connection is correct"
    echo "  ✓ JWT_SECRET is correct"
    echo "  ✓ Password hashing is correct"
    echo ""
    echo -e "${YELLOW}CONCLUSION:${NC} The issue is with your admin@localhost password."
    echo "The password you're entering doesn't match what was stored."
    echo ""
    echo "Solution: Reset your admin password with the SAME password you'll use to login:"
    echo "  sudo ./scripts/reset-admin-password.sh"
    echo ""
else
    echo -e "${RED}✗ TEST USER AUTHENTICATION FAILED${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "This indicates a deeper issue with GoTrue configuration."
    echo "Check GoTrue logs:"
    echo "  docker logs --tail 50 supabase-auth"
    echo ""
fi

echo ""
echo "To clean up test user:"
echo "  docker exec -i supabase-db psql -U postgres -c \"DELETE FROM auth.users WHERE email='$TEST_EMAIL';\""
echo ""
