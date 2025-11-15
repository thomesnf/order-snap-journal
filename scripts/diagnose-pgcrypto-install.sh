#!/bin/bash

# Diagnose pgcrypto installation issue during setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  pgcrypto Installation Diagnostic"
echo "=============================================="
echo ""

echo -e "${BLUE}[1/6]${NC} Checking if pgcrypto extension is installed..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT 
  e.extname AS extension_name,
  n.nspname AS schema_name,
  e.extversion AS version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto';
EOF
echo ""

echo -e "${BLUE}[2/6]${NC} Checking available schemas..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT schema_name 
FROM information_schema.schemata 
ORDER BY schema_name;
EOF
echo ""

echo -e "${BLUE}[3/6]${NC} Checking current search_path..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SHOW search_path;
EOF
echo ""

echo -e "${BLUE}[4/6]${NC} Finding gen_salt function in all schemas..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'gen_salt'
ORDER BY n.nspname;
EOF
echo ""

echo -e "${BLUE}[5/6]${NC} Testing different gen_salt call approaches..."

echo "  Test 1: gen_salt('bf')"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -3
SELECT gen_salt('bf') AS result;
EOF

echo ""
echo "  Test 2: gen_salt('bf'::text)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -3
SELECT gen_salt('bf'::text) AS result;
EOF

echo ""
echo "  Test 3: public.gen_salt('bf'::text)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -3
SELECT public.gen_salt('bf'::text) AS result;
EOF

echo ""
echo "  Test 4: extensions.gen_salt('bf'::text)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -3
SELECT extensions.gen_salt('bf'::text) AS result;
EOF
echo ""

echo -e "${BLUE}[6/6]${NC} Attempting fresh pgcrypto installation..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
-- Try to install in extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Verify it worked
SELECT 
  'Installed in: ' || n.nspname AS status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto';

-- Test function access
SELECT 'Test Result: ' || extensions.gen_salt('bf'::text) AS test;
EOF
echo ""

echo "=============================================="
echo -e "${GREEN}  Diagnostic Complete${NC}"
echo "=============================================="
