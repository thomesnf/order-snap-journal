#!/bin/bash

# Check GoTrue configuration and detailed logs

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  GoTrue Configuration Check"
echo "=============================================="
echo ""

echo -e "${BLUE}[1/4]${NC} Checking GoTrue environment variables..."
docker exec supabase-auth env | grep -E "(GOTRUE|JWT|DATABASE|POSTGRES)" | sort
echo ""

echo -e "${BLUE}[2/4]${NC} Testing database connection from GoTrue..."
docker exec supabase-auth sh -c 'psql "$GOTRUE_DB_DATABASE_URL" -c "SELECT version();"' 2>&1 || echo "Cannot connect to database from GoTrue"
echo ""

echo -e "${BLUE}[3/4]${NC} Checking if GoTrue can see the user..."
docker exec supabase-auth sh -c 'psql "$GOTRUE_DB_DATABASE_URL" -c "SELECT email, LENGTH(encrypted_password) as pwd_len, SUBSTRING(encrypted_password, 1, 7) as pwd_prefix FROM auth.users WHERE email='\''admin@localhost'\'';"' 2>&1
echo ""

echo -e "${BLUE}[4/4]${NC} Recent GoTrue authentication errors (last 50 lines)..."
docker logs --tail 50 supabase-auth 2>&1 | grep -i "error\|fail\|invalid\|password" || echo "No recent error logs"
echo ""

echo "=============================================="
echo "  Restart GoTrue to refresh configuration"
echo "=============================================="
echo ""
echo "Sometimes GoTrue needs a restart after password changes."
echo "Run: docker restart supabase-auth"
echo ""
