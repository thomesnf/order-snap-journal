#!/bin/bash

# Create admin user via GoTrue API (proper method)
# This ensures password hashing is done correctly

set -e

echo "=============================================="
echo "  Create Admin User via GoTrue API"
echo "=============================================="
echo ""

# Load environment variables
if [ -f .env.self-hosted ]; then
    export $(grep -v '^#' .env.self-hosted | xargs)
else
    echo "❌ Error: .env.self-hosted not found"
    exit 1
fi

# Get admin credentials
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars): " ADMIN_PASSWORD
echo ""

read -p "Enter full name (default: Admin User): " FULL_NAME
FULL_NAME=${FULL_NAME:-Admin User}

echo ""
echo "Creating admin user via GoTrue API..."
echo ""

# Create user via GoTrue admin API
RESPONSE=$(curl -s -X POST \
  http://localhost:8000/auth/v1/admin/users \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"$FULL_NAME\"
    }
  }")

echo "GoTrue Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract user ID
USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user via GoTrue API"
    echo "Check if containers are running and try again"
    exit 1
fi

echo "✅ User created with ID: $USER_ID"
echo ""

# Now add admin role and profile in database
echo "Setting up admin role and profile..."

docker exec -i supabase-db psql -U postgres <<SQL
BEGIN;

-- Create app_role enum if it doesn't exist
DO \$\$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('$USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create profile
INSERT INTO public.profiles (user_id, full_name)
VALUES ('$USER_ID', '$FULL_NAME')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

COMMIT;

-- Verify the user
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    ur.role,
    p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.id = '$USER_ID';
SQL

echo ""
echo "=============================================="
echo "✅ Admin user created successfully!"
echo "=============================================="
echo ""
echo "Email: $ADMIN_EMAIL"
echo "Password: [as entered]"
echo ""
echo "You can now log in at http://13.37.0.96"
echo "=============================================="
