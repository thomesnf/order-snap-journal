#!/bin/bash

# Reset admin password with GoTrue-compatible bcrypt hash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Reset Admin Password"
echo "=============================================="
echo ""

# Get admin credentials
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter NEW password (min 10 chars): " ADMIN_PASSWORD
echo ""

if [ ${#ADMIN_PASSWORD} -lt 10 ]; then
    echo -e "${RED}✗${NC} Password must be at least 10 characters!"
    exit 1
fi

echo ""
echo "Resetting password for: $ADMIN_EMAIL"

# Reset password with proper bcrypt hash
docker exec -i supabase-db psql -U postgres <<SQL
DO \$\$
DECLARE
    target_user_id UUID;
    new_hash TEXT;
BEGIN
    -- Enable pgcrypto
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Get user ID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = '$ADMIN_EMAIL';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: $ADMIN_EMAIL';
    END IF;
    
    -- Generate new bcrypt hash (cost factor 10 for GoTrue compatibility)
    new_hash := crypt('$ADMIN_PASSWORD', gen_salt('bf', 10));
    
    -- Update password
    UPDATE auth.users
    SET 
        encrypted_password = new_hash,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Update identity timestamp
    UPDATE auth.identities
    SET 
        last_sign_in_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id AND provider = 'email';
    
    RAISE NOTICE 'Password reset successfully for user: %', target_user_id;
END \$\$;

-- Verify the update
SELECT 
    email,
    email_confirmed_at IS NOT NULL as confirmed,
    substring(encrypted_password from 1 for 7) as hash_format,
    LENGTH(encrypted_password) as hash_length,
    updated_at
FROM auth.users
WHERE email = '$ADMIN_EMAIL';
SQL

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✅ Password Reset Successfully!${NC}"
    echo "=============================================="
    echo ""
    echo "Email: $ADMIN_EMAIL"
    echo "Password: [as entered]"
    echo ""
    echo "Test login:"
    echo "  sudo ./scripts/test-local-login.sh"
    echo ""
else
    echo ""
    echo -e "${RED}✗${NC} Password reset failed!"
    echo ""
    echo "Check if user exists:"
    echo "  docker exec -i supabase-db psql -U postgres -c \"SELECT email FROM auth.users WHERE email='$ADMIN_EMAIL';\""
    exit 1
fi
