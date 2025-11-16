#!/bin/bash

# Create admin user for LOCAL self-hosted Supabase setup
# This bypasses all the pgcrypto complexity

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Create Local Admin User (Simple Method)"
echo "=============================================="
echo ""

ADMIN_EMAIL="admin@localhost"
ADMIN_PASSWORD="Admin@123456"  # Must meet password requirements

echo -e "${BLUE}[1/3]${NC} Creating admin user via GoTrue signup API..."
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo ""

# Sign up via local GoTrue API
SIGNUP_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/signup" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"data\": {
      \"full_name\": \"Admin User\"
    }
  }")

echo "Response:"
echo "$SIGNUP_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SIGNUP_RESPONSE"
echo ""

# Extract user ID
USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo -e "${RED}✗${NC} Failed to create user"
    echo "Try manually signing up through the web interface instead"
    exit 1
fi

echo -e "${GREEN}✓${NC} User created with ID: $USER_ID"
echo ""

echo -e "${BLUE}[2/3]${NC} Confirming email and assigning admin role..."
docker exec supabase-db psql -U postgres -d postgres <<SQL
-- Confirm email
UPDATE auth.users 
SET email_confirmed_at = now(), confirmed_at = now()
WHERE id = '$USER_ID';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('$USER_ID', 'admin')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'User: ' || email || ', Confirmed: ' || (email_confirmed_at IS NOT NULL)::text
FROM auth.users WHERE id = '$USER_ID';

SELECT 'Role: ' || role 
FROM public.user_roles WHERE user_id = '$USER_ID';
SQL

echo -e "${GREEN}✓${NC} Admin role assigned"
echo ""

echo -e "${BLUE}[3/3]${NC} Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓✓✓ SUCCESS! ✓✓✓${NC}"
    echo ""
    echo "=============================================="
    echo "  Admin User Ready!"
    echo "=============================================="
    echo ""
    echo "Login credentials:"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: $ADMIN_PASSWORD"
    echo ""
    echo "Make sure your .env file has:"
    echo "  VITE_SUPABASE_URL=http://localhost:8000"
    echo ""
    echo "Then restart your dev server and login!"
else
    echo -e "${RED}✗${NC} Login failed"
    echo "$LOGIN_RESPONSE"
fi
