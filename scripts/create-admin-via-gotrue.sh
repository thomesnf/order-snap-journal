#!/bin/bash

# Create admin user using GoTrue API (proper method)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Create Admin via GoTrue API"
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

echo -e "${BLUE}[1/4]${NC} Checking if user already exists..."
EXISTING_USER=$(docker exec supabase-db psql -U postgres -d postgres -t -c \
  "SELECT email FROM auth.users WHERE email='$ADMIN_EMAIL';" | xargs)

if [ ! -z "$EXISTING_USER" ]; then
    echo -e "${YELLOW}⚠${NC} User already exists, cleaning up first..."
    docker exec supabase-db psql -U postgres -d postgres <<SQL
    DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = '$ADMIN_EMAIL');
    DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = '$ADMIN_EMAIL');
    DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = '$ADMIN_EMAIL');
    DELETE FROM auth.users WHERE email = '$ADMIN_EMAIL';
SQL
    echo -e "${GREEN}✓${NC} Cleanup complete"
fi
echo ""

echo -e "${BLUE}[2/4]${NC} Creating user via GoTrue signup API..."
SIGNUP_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"data\": {
      \"full_name\": \"Admin User\"
    }
  }")

echo "$SIGNUP_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SIGNUP_RESPONSE"

# Extract user ID from response
USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo -e "${RED}✗${NC} Failed to create user via GoTrue API"
    echo "Response: $SIGNUP_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓${NC} User created with ID: $USER_ID"
echo ""

echo -e "${BLUE}[3/4]${NC} Confirming email and assigning admin role..."
docker exec supabase-db psql -U postgres -d postgres <<SQL
-- Confirm email
UPDATE auth.users 
SET email_confirmed_at = now(), confirmed_at = now()
WHERE id = '$USER_ID';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('$USER_ID', 'admin')
ON CONFLICT DO NOTHING;

-- Update profile
UPDATE public.profiles 
SET full_name = 'Admin User', email = '$ADMIN_EMAIL'
WHERE id = '$USER_ID';
SQL

echo -e "${GREEN}✓${NC} Email confirmed and admin role assigned"
echo ""

echo -e "${BLUE}[4/4]${NC} Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓${NC} LOGIN SUCCESSFUL!"
    echo ""
    echo "=============================================="
    echo "  Admin User Created Successfully!"
    echo "=============================================="
    echo ""
    echo "Login credentials:"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: $ADMIN_PASSWORD"
    echo ""
else
    echo -e "${RED}✗${NC} LOGIN FAILED"
    echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
fi
