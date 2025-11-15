#!/bin/bash

# Diagnose pgcrypto extension configuration and timing issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  PostgreSQL Extension Diagnostic Tool"
echo "=============================================="
echo ""

echo -e "${BLUE}[1/8]${NC} Checking if pgcrypto extension exists..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT 
  e.extname AS extension_name,
  n.nspname AS schema_name,
  e.extversion AS version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto'
ORDER BY n.nspname;
EOF
echo ""

echo -e "${BLUE}[2/8]${NC} Checking available schemas..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'extensions', 'auth', 'storage')
ORDER BY schema_name;
EOF
echo ""

echo -e "${BLUE}[3/8]${NC} Checking if extensions schema exists and its permissions..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
-- Check if extensions schema exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') 
    THEN 'extensions schema EXISTS'
    ELSE 'extensions schema DOES NOT EXIST'
  END AS schema_status;

-- Check permissions on extensions schema (if it exists)
SELECT 
  nspname AS schema_name,
  nspacl AS permissions
FROM pg_namespace
WHERE nspname = 'extensions';
EOF
echo ""

echo -e "${BLUE}[4/8]${NC} Testing if pgcrypto functions are accessible..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
-- Try to find gen_salt function in different schemas
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('gen_salt', 'crypt')
ORDER BY n.nspname, p.proname;
EOF
echo ""

echo -e "${BLUE}[5/8]${NC} Testing bcrypt hash generation with different approaches..."

echo "  Testing: public.gen_salt('bf', 10)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -5
SELECT public.gen_salt('bf', 10) AS test_result;
EOF

echo ""
echo "  Testing: public.gen_salt('bf'::text, 10)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -5
SELECT public.gen_salt('bf'::text, 10) AS test_result;
EOF

echo ""
echo "  Testing: extensions.gen_salt('bf', 10)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -5
SELECT extensions.gen_salt('bf', 10) AS test_result;
EOF

echo ""
echo "  Testing: extensions.gen_salt('bf'::text, 10)"
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1 | head -5
SELECT extensions.gen_salt('bf'::text, 10) AS test_result;
EOF
echo ""

echo -e "${BLUE}[6/8]${NC} Testing full bcrypt password generation..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF' 2>&1
DO $$
DECLARE
  test_hash text;
BEGIN
  -- Try to generate a bcrypt hash
  BEGIN
    SELECT extensions.crypt('testpassword', extensions.gen_salt('bf'::text, 10)) INTO test_hash;
    RAISE NOTICE 'SUCCESS: Generated hash using extensions.crypt: %', SUBSTRING(test_hash, 1, 20);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED with extensions.crypt: %', SQLERRM;
  END;
  
  BEGIN
    SELECT public.crypt('testpassword', public.gen_salt('bf'::text, 10)) INTO test_hash;
    RAISE NOTICE 'SUCCESS: Generated hash using public.crypt: %', SUBSTRING(test_hash, 1, 20);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED with public.crypt: %', SQLERRM;
  END;
END $$;
EOF
echo ""

echo -e "${BLUE}[7/8]${NC} Checking GoTrue's search_path and database connection..."
echo "  GoTrue DATABASE_URL:"
docker exec supabase-auth printenv DATABASE_URL 2>/dev/null | sed 's/\(postgres:\/\/[^:]*:\)[^@]*/\1[HIDDEN]/' || echo "  Not found"
echo ""

echo "  Testing if GoTrue container can access pgcrypto functions:"
docker exec -i supabase-db psql -U supabase_auth_admin -d postgres <<'EOF' 2>&1 | head -10
-- Check current search_path
SHOW search_path;

-- Try to access pgcrypto functions
SELECT extensions.gen_salt('bf'::text, 10) AS test_gen_salt;
EOF
echo ""

echo -e "${BLUE}[8/8]${NC} Checking auth.users table and existing users..."
docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
SELECT 
  email,
  LENGTH(encrypted_password) AS pwd_length,
  SUBSTRING(encrypted_password, 1, 4) AS pwd_prefix,
  email_confirmed_at IS NOT NULL AS email_confirmed,
  confirmed_at IS NOT NULL AS confirmed,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
EOF
echo ""

echo "=============================================="
echo -e "${GREEN}  Diagnostic Complete${NC}"
echo "=============================================="
echo ""
echo "Key findings to look for:"
echo "  1. pgcrypto should exist in BOTH 'public' AND 'extensions' schemas"
echo "  2. gen_salt and crypt functions should be accessible from both schemas"
echo "  3. extensions.gen_salt('bf'::text, 10) should work without errors"
echo "  4. GoTrue's search_path should include 'extensions' schema"
echo "  5. Admin user should exist with a bcrypt hash (starting with \$2)"
echo ""
