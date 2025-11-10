#!/bin/bash

# Verify GoTrue configuration and password hashing
# This helps diagnose authentication issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  GoTrue Configuration Verification"
echo "=============================================="
echo ""

# Load environment
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

source .env.self-hosted

echo -e "${BLUE}[1/5]${NC} Checking GoTrue container status..."
if docker ps | grep -q "supabase-auth"; then
    echo -e "${GREEN}✓${NC} GoTrue container is running"
else
    echo -e "${RED}✗${NC} GoTrue container is not running!"
    exit 1
fi
echo ""

echo -e "${BLUE}[2/5]${NC} Checking GoTrue environment variables..."
docker exec supabase-auth env | grep -E "JWT_SECRET|GOTRUE_JWT_SECRET|API_EXTERNAL_URL|SITE_URL" || echo -e "${YELLOW}⚠${NC} Could not retrieve GoTrue env vars"
echo ""

echo -e "${BLUE}[3/5]${NC} Checking database user configuration..."
read -p "Enter email to check (default: admin@localhost): " EMAIL
EMAIL=${EMAIL:-admin@localhost}

USER_INFO=$(docker exec -i supabase-db psql -U postgres -t -c "
SELECT 
    u.id,
    u.email,
    u.encrypted_password IS NOT NULL as has_password,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.role,
    u.aud,
    LENGTH(u.encrypted_password) as password_hash_length
FROM auth.users u
WHERE u.email = '$EMAIL';
" 2>/dev/null)

if [ -z "$USER_INFO" ]; then
    echo -e "${RED}✗${NC} User not found in database!"
    exit 1
fi

echo -e "${GREEN}✓${NC} User found in database:"
echo "$USER_INFO"
echo ""

echo -e "${BLUE}[4/5]${NC} Checking user identities..."
docker exec -i supabase-db psql -U postgres -t -c "
SELECT 
    i.provider,
    i.id,
    i.created_at
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = '$EMAIL';
" 2>/dev/null
echo ""

echo -e "${BLUE}[5/5]${NC} Testing password hash format..."
HASH_PREFIX=$(docker exec -i supabase-db psql -U postgres -t -c "
SELECT substring(encrypted_password from 1 for 7) as hash_prefix
FROM auth.users
WHERE email = '$EMAIL';
" 2>/dev/null)

HASH_PREFIX_TRIMMED=$(echo "$HASH_PREFIX" | xargs)
echo "Password hash prefix: $HASH_PREFIX_TRIMMED"

# Check if it's valid bcrypt format (must include cost factor like $2b$10$)
if [[ "$HASH_PREFIX_TRIMMED" =~ ^\$2[aby]\$[0-9]{2}\$ ]]; then
    echo -e "${GREEN}✓${NC} Password hash is valid bcrypt format"
    # Extract cost factor
    COST_FACTOR=$(echo "$HASH_PREFIX_TRIMMED" | grep -oP '\$\d+\$' | tr -d '$')
    echo "  Cost factor: $COST_FACTOR (recommended: 10)"
else
    echo -e "${RED}✗${NC} Password hash format is incorrect!"
    echo "  Expected: \$2a\$10\$ or \$2b\$10\$ or \$2y\$10\$ (bcrypt with cost factor)"
    echo "  Found: $HASH_PREFIX_TRIMMED"
fi
echo ""

echo "=============================================="
echo "Recommendations:"
echo "=============================================="
echo ""
echo "If authentication is failing:"
echo "  1. Ensure GoTrue is using the correct JWT_SECRET"
echo "  2. Recreate user with correct password hash format"
echo "  3. Check GoTrue logs: docker logs supabase-auth"
echo ""
echo "To recreate admin with GoTrue-compatible hash:"
echo "  sudo ./scripts/create-admin-gotrue.sh"
echo ""
