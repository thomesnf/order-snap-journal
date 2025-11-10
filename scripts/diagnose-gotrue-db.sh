#!/bin/bash

# Diagnose GoTrue database connection issue

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  GoTrue Database Connection Diagnosis"
echo "=============================================="
echo ""

echo -e "${BLUE}[1/5]${NC} Checking GoTrue logs for errors..."
echo ""
docker logs --tail 100 supabase-auth 2>&1 | grep -i -E "(error|fail|unable|cannot|denied)" | tail -20 || echo "No obvious errors found"
echo ""

echo -e "${BLUE}[2/5]${NC} Checking GoTrue DATABASE_URL configuration..."
GOTRUE_DB_URL=$(docker exec supabase-auth printenv DATABASE_URL 2>/dev/null || echo "NOT_FOUND")
echo "DATABASE_URL: $GOTRUE_DB_URL" | sed 's/\(postgres:\/\/[^:]*:\)[^@]*/\1[HIDDEN]/'
echo ""

if [[ "$GOTRUE_DB_URL" == *"supabase-db"* ]]; then
    echo -e "${GREEN}✓${NC} GoTrue is configured to use supabase-db"
elif [[ "$GOTRUE_DB_URL" == *"localhost"* ]] || [[ "$GOTRUE_DB_URL" == *"127.0.0.1"* ]]; then
    echo -e "${RED}✗${NC} GoTrue is trying to connect to localhost instead of supabase-db!"
    echo "This is the problem - GoTrue can't reach the database."
else
    echo -e "${YELLOW}⚠${NC} Unexpected database host"
fi
echo ""

echo -e "${BLUE}[3/5]${NC} Testing database connectivity from GoTrue container..."
if docker exec supabase-auth pg_isready -h supabase-db -p 5432 >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} GoTrue can reach database"
else
    echo -e "${RED}✗${NC} GoTrue CANNOT reach database!"
    echo "Network issue between containers"
fi
echo ""

echo -e "${BLUE}[4/5]${NC} Checking if GoTrue can query auth.users..."
USER_COUNT=$(docker exec supabase-auth sh -c "PGPASSWORD=postgres psql -h supabase-db -U supabase_auth_admin -d postgres -t -c 'SELECT COUNT(*) FROM auth.users;'" 2>&1)
if [[ "$USER_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}✓${NC} GoTrue can query database: $USER_COUNT users found"
else
    echo -e "${RED}✗${NC} GoTrue cannot query database!"
    echo "Error: $USER_COUNT"
fi
echo ""

echo -e "${BLUE}[5/5]${NC} Checking GoTrue auth schema access..."
SCHEMA_ACCESS=$(docker exec supabase-auth sh -c "PGPASSWORD=postgres psql -h supabase-db -U supabase_auth_admin -d postgres -t -c \"SELECT has_table_privilege('supabase_auth_admin', 'auth.users', 'SELECT');\"" 2>&1)
if [[ "$SCHEMA_ACCESS" == *"t"* ]]; then
    echo -e "${GREEN}✓${NC} GoTrue has SELECT permission on auth.users"
else
    echo -e "${RED}✗${NC} GoTrue does NOT have permission to read auth.users!"
    echo "Result: $SCHEMA_ACCESS"
fi
echo ""

echo "=============================================="
echo "Full GoTrue environment:"
echo "=============================================="
docker exec supabase-auth printenv | grep -v "PATH" | sort
echo ""

echo "=============================================="
echo "Recent GoTrue logs (last 30 lines):"
echo "=============================================="
docker logs --tail 30 supabase-auth 2>&1
echo ""
