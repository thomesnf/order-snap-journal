#!/bin/bash

# Apply application schema migration to local database
# This creates user_roles, profiles tables and RLS policies

set -e

echo "=============================================="
echo "  Applying Application Schema Migration"
echo "=============================================="
echo ""

# Check if migration file exists
if [ ! -f migrations/00000000000005-app-schema.sql ]; then
    echo "❌ Error: Migration file not found"
    exit 1
fi

echo "Applying app schema migration to local database..."
docker exec -i supabase-db psql -U postgres -f - < migrations/00000000000005-app-schema.sql

echo ""
echo "✅ Application schema applied successfully!"
echo ""

# Verify tables were created
echo "Verifying tables and policies..."
docker exec -i supabase-db psql -U postgres <<SQL

-- Check if tables exist
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles')
ORDER BY tablename;

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'profiles')
ORDER BY tablename;

-- Count policies
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'profiles')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify admin user and role
SELECT 
    u.id,
    u.email,
    ur.role,
    p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'admin@localhost';

SQL

echo ""
echo "=============================================="
echo "Schema migration complete!"
echo ""
echo "NEXT STEP: Rebuild app container:"
echo "sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
echo ""
echo "Then test login at: http://13.37.0.96"
echo "=============================================="
