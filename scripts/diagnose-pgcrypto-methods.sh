#!/bin/bash

# Comprehensive pgcrypto Installation Diagnosis Script
# Tests multiple approaches to identify what works

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  pgcrypto Installation Methods Diagnosis"
echo "=============================================="
echo ""

# Check if database container is running
if ! docker ps | grep -q supabase-db; then
    echo -e "${RED}✗${NC} Database container is not running!"
    echo "  Start it first with: docker-compose -f docker-compose.self-hosted.yml up -d postgres"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database container is running"
echo ""

# Method 1: Standard CREATE EXTENSION (simplest)
echo -e "${BLUE}[Test 1/5]${NC} Standard CREATE EXTENSION IF NOT EXISTS..."
if docker exec supabase-db psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>&1 | tee /tmp/test1.log; then
    echo -e "${GREEN}✓${NC} Method 1 SUCCEEDED (Standard CREATE EXTENSION)"
    METHOD1_SUCCESS=true
else
    echo -e "${RED}✗${NC} Method 1 FAILED"
    METHOD1_SUCCESS=false
fi
echo ""

# Method 2: Check if already installed
echo -e "${BLUE}[Test 2/5]${NC} Checking if pgcrypto is already installed..."
INSTALLED=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto');" 2>/dev/null | xargs)
if [ "$INSTALLED" = "t" ]; then
    echo -e "${GREEN}✓${NC} pgcrypto is installed"
    PGCRYPTO_INSTALLED=true
else
    echo -e "${YELLOW}⚠${NC} pgcrypto is NOT installed"
    PGCRYPTO_INSTALLED=false
fi
echo ""

# Method 3: Test gen_salt function
echo -e "${BLUE}[Test 3/5]${NC} Testing gen_salt function availability..."
if GEN_SALT_OUTPUT=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT gen_salt('bf');" 2>&1); then
    if echo "$GEN_SALT_OUTPUT" | grep -q '^\s*\$2'; then
        echo -e "${GREEN}✓${NC} gen_salt() works: $GEN_SALT_OUTPUT"
        GEN_SALT_WORKS=true
    else
        echo -e "${RED}✗${NC} gen_salt() returned unexpected output: $GEN_SALT_OUTPUT"
        GEN_SALT_WORKS=false
    fi
else
    echo -e "${RED}✗${NC} gen_salt() function not available"
    echo "  Error: $GEN_SALT_OUTPUT"
    GEN_SALT_WORKS=false
fi
echo ""

# Method 4: Test crypt function
echo -e "${BLUE}[Test 4/5]${NC} Testing crypt function with gen_salt..."
if CRYPT_OUTPUT=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT crypt('testpassword', gen_salt('bf', 10));" 2>&1); then
    if echo "$CRYPT_OUTPUT" | grep -q '^\s*\$2'; then
        echo -e "${GREEN}✓${NC} crypt() works correctly"
        echo "  Sample hash: ${CRYPT_OUTPUT:0:30}..."
        CRYPT_WORKS=true
    else
        echo -e "${RED}✗${NC} crypt() returned unexpected output: $CRYPT_OUTPUT"
        CRYPT_WORKS=false
    fi
else
    echo -e "${RED}✗${NC} crypt() function not available"
    echo "  Error: $CRYPT_OUTPUT"
    CRYPT_WORKS=false
fi
echo ""

# Method 5: Check available extensions
echo -e "${BLUE}[Test 5/5]${NC} Listing all installed extensions..."
docker exec supabase-db psql -U postgres -d postgres -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
echo ""

# Summary
echo "=============================================="
echo -e "${BLUE}  Diagnosis Summary${NC}"
echo "=============================================="
echo ""

if [ "$PGCRYPTO_INSTALLED" = "true" ] && [ "$GEN_SALT_WORKS" = "true" ] && [ "$CRYPT_WORKS" = "true" ]; then
    echo -e "${GREEN}✓✓✓ DIAGNOSIS: pgcrypto is fully functional${NC}"
    echo ""
    echo "Root Cause Analysis:"
    echo "  • pgcrypto extension is properly installed"
    echo "  • All cryptographic functions work correctly"
    echo "  • The setup script should proceed without issues"
    echo ""
    echo "Recommendation: The previous error was likely transient."
    echo "Try running the setup script again."
    
elif [ "$PGCRYPTO_INSTALLED" = "true" ] && [ "$GEN_SALT_WORKS" = "false" ]; then
    echo -e "${YELLOW}⚠⚠ DIAGNOSIS: pgcrypto installed but functions not accessible${NC}"
    echo ""
    echo "Root Cause Analysis:"
    echo "  • pgcrypto extension is marked as installed"
    echo "  • BUT cryptographic functions are not accessible"
    echo "  • This suggests a schema/search_path issue"
    echo ""
    echo "Solution: Check search_path and function schema"
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT nspname FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'pgcrypto';"
    
elif [ "$METHOD1_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ DIAGNOSIS: pgcrypto can be installed using standard method${NC}"
    echo ""
    echo "Root Cause Analysis:"
    echo "  • pgcrypto wasn't installed initially"
    echo "  • Standard CREATE EXTENSION method works"
    echo "  • The setup script's complex installation logic was unnecessary"
    echo ""
    echo "Recommendation: Simplify the setup script to use:"
    echo "  CREATE EXTENSION IF NOT EXISTS pgcrypto;"
    
else
    echo -e "${RED}✗✗✗ DIAGNOSIS: pgcrypto installation is blocked${NC}"
    echo ""
    echo "Root Cause Analysis:"
    echo "  • Cannot install pgcrypto using standard method"
    echo "  • This indicates PostgreSQL configuration issues"
    echo "  • Possible causes:"
    echo "    1. Missing postgresql-contrib package"
    echo "    2. File permission issues"
    echo "    3. Custom PostgreSQL build without pgcrypto"
    echo ""
    echo "Check PostgreSQL version and available extensions:"
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT version();"
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT name FROM pg_available_extensions WHERE name LIKE '%crypt%';"
fi

echo ""
echo "=============================================="
echo ""
