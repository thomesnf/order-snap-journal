#!/bin/bash

# Diagnose authentication failure for local Supabase
# This checks the user exists, email is confirmed, and password hash is valid

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Authentication Failure Diagnosis"
echo "=============================================="
echo ""

EMAIL="admin@localhost"

echo -e "${BLUE}[1/5]${NC} Checking if user exists..."
USER_EXISTS=$(docker exec -i supabase-db psql -U postgres -t -c \
  "SELECT COUNT(*) FROM auth.users WHERE email='$EMAIL';")

if [ "$USER_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} User exists in database"
else
    echo -e "${RED}✗${NC} User does NOT exist!"
    echo "  Run: sudo ./scripts/complete-setup-with-fixes.sh"
    exit 1
fi
echo ""

echo -e "${BLUE}[2/5]${NC} Checking email confirmation..."
docker exec -i supabase-db psql -U postgres -c \
  "SELECT email, email_confirmed_at, confirmed_at FROM auth.users WHERE email='$EMAIL';"
echo ""

echo -e "${BLUE}[3/5]${NC} Checking password hash..."
docker exec -i supabase-db psql -U postgres -c \
  "SELECT 
    email, 
    LENGTH(encrypted_password) as password_length,
    SUBSTRING(encrypted_password, 1, 10) as password_prefix,
    role
  FROM auth.users 
  WHERE email='$EMAIL';"
echo ""

echo -e "${BLUE}[4/5]${NC} Checking user roles..."
docker exec -i supabase-db psql -U postgres -c \
  "SELECT ur.role, p.full_name, p.email 
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN auth.users au ON au.id = ur.user_id
  WHERE au.email='$EMAIL';"
echo ""

echo -e "${BLUE}[5/5]${NC} Recent GoTrue logs (last 20 lines)..."
docker logs --tail 20 supabase-auth 2>&1 | grep -v "GET /health" || echo "No recent auth logs"
echo ""

echo "=============================================="
echo "  Attempting password verification test"
echo "=============================================="
echo ""

# Try to verify password using bcrypt
echo "Testing password hash verification..."
docker exec -i supabase-db psql -U postgres <<'EOF'
DO $$
DECLARE
  v_hash text;
  v_test_password text := 'admin123456';
BEGIN
  -- Get the stored hash
  SELECT encrypted_password INTO v_hash 
  FROM auth.users 
  WHERE email = 'admin@localhost';
  
  IF v_hash IS NULL THEN
    RAISE NOTICE 'ERROR: Password hash is NULL!';
  ELSIF v_hash = '' THEN
    RAISE NOTICE 'ERROR: Password hash is empty!';
  ELSIF LENGTH(v_hash) < 20 THEN
    RAISE NOTICE 'ERROR: Password hash is too short (length: %)', LENGTH(v_hash);
  ELSE
    RAISE NOTICE 'Password hash exists (length: %, prefix: %)', LENGTH(v_hash), SUBSTRING(v_hash, 1, 10);
    
    -- Try to verify using crypt
    BEGIN
      IF extensions.crypt(v_test_password, v_hash) = v_hash THEN
        RAISE NOTICE 'SUCCESS: Password verification works!';
      ELSE
        RAISE NOTICE 'FAILED: Password does not match hash';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Cannot verify password - %', SQLERRM;
    END;
  END IF;
END $$;
EOF

echo ""
echo "=============================================="
echo "Diagnosis complete!"
echo "=============================================="
