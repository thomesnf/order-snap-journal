#!/bin/bash

# Final pgcrypto Fix - Handles Supabase's extensions schema

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  pgcrypto Installation Fix for Supabase"
echo "=============================================="
echo ""

# Check if database container is running
if ! docker ps | grep -q supabase-db; then
    echo -e "${RED}✗${NC} Database container is not running!"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database container is running"
echo ""

# Try Method 1: Install to extensions schema (Supabase standard)
echo -e "${BLUE}[Method 1]${NC} Installing pgcrypto to extensions schema..."
docker exec supabase-db psql -U postgres -d postgres <<'SQL'
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install pgcrypto into extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Grant usage on extensions schema to postgres and public
GRANT USAGE ON SCHEMA extensions TO postgres, public;

-- Show result
SELECT extname, nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pgcrypto';
SQL

echo ""

# Verify installation
echo -e "${BLUE}[Verification]${NC} Testing pgcrypto functions..."

# Test 1: Direct call with schema prefix
echo "  Test 1: extensions.gen_salt()"
if docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT extensions.gen_salt('bf');" 2>/dev/null | grep -q '^\s*\$2'; then
    echo -e "    ${GREEN}✓${NC} Works with schema prefix"
    SCHEMA_PREFIX_WORKS=true
else
    echo -e "    ${RED}✗${NC} Failed with schema prefix"
    SCHEMA_PREFIX_WORKS=false
fi

# Test 2: Call without prefix (check if in search_path)
echo "  Test 2: gen_salt() without schema"
if docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT gen_salt('bf');" 2>/dev/null | grep -q '^\s*\$2'; then
    echo -e "    ${GREEN}✓${NC} Works without schema prefix"
    NO_PREFIX_WORKS=true
else
    echo -e "    ${YELLOW}⚠${NC} Needs schema prefix or search_path update"
    NO_PREFIX_WORKS=false
fi

echo ""

# If schema prefix works but no prefix doesn't, update search_path
if [ "$SCHEMA_PREFIX_WORKS" = "true" ] && [ "$NO_PREFIX_WORKS" = "false" ]; then
    echo -e "${BLUE}[Fix]${NC} Adding extensions schema to search_path..."
    docker exec supabase-db psql -U postgres -d postgres <<'SQL'
-- Update database search_path to include extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Show current search_path
SHOW search_path;
SQL
    
    echo ""
    echo -e "${YELLOW}⚠${NC} Note: Existing connections need to reconnect to use new search_path"
    echo "  You may need to restart services: docker restart supabase-auth"
    echo ""
fi

# Final test with crypt function
echo -e "${BLUE}[Final Test]${NC} Testing password hashing..."
if HASH=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT crypt('testpassword', gen_salt('bf', 10));" 2>&1); then
    if echo "$HASH" | grep -q '^\s*\$2'; then
        echo -e "${GREEN}✓✓✓ SUCCESS!${NC} pgcrypto is fully functional"
        echo "  Sample hash: ${HASH:0:30}..."
        echo ""
        echo "You can now create users with bcrypt passwords."
    else
        echo -e "${RED}✗${NC} crypt() returned unexpected output"
        echo "  Output: $HASH"
    fi
else
    echo -e "${RED}✗${NC} crypt() function failed"
    echo "  Error: $HASH"
fi

echo ""
echo "=============================================="
