#!/bin/bash

# Complete JWT fix and admin creation script
# This regenerates JWT tokens, updates .env, restarts services, and creates admin

set -e

echo "=============================================="
echo "  JWT Token Fix & Admin Creation"
echo "=============================================="
echo ""

# Check if .env.self-hosted exists
if [ ! -f .env.self-hosted ]; then
    echo "❌ Error: .env.self-hosted not found"
    exit 1
fi

# Load current JWT_SECRET
export $(grep "^JWT_SECRET=" .env.self-hosted | xargs)

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET not found in .env.self-hosted"
    exit 1
fi

echo "Found JWT_SECRET: ${JWT_SECRET:0:20}..."
echo ""

# Generate new JWT tokens using Python
echo "Generating new JWT tokens with Python..."

python3 << PYTHON_SCRIPT
import jwt
import os
import re
from datetime import datetime, timedelta

# Get JWT secret from environment
jwt_secret = os.environ['JWT_SECRET']

# Generate ANON token
anon_payload = {
    "role": "anon",
    "iss": "supabase",
    "iat": 1577836800,
    "exp": 2147483647
}
anon_token = jwt.encode(anon_payload, jwt_secret, algorithm="HS256")

# Generate SERVICE_ROLE token
service_payload = {
    "role": "service_role",
    "iss": "supabase",
    "iat": 1577836800,
    "exp": 2147483647
}
service_token = jwt.encode(service_payload, jwt_secret, algorithm="HS256")

# Read current .env file
with open('.env.self-hosted', 'r') as f:
    content = f.read()

# Update tokens in .env file
content = re.sub(
    r'SUPABASE_ANON_KEY=.*',
    f'SUPABASE_ANON_KEY={anon_token}',
    content
)
content = re.sub(
    r'SUPABASE_SERVICE_ROLE_KEY=.*',
    f'SUPABASE_SERVICE_ROLE_KEY={service_token}',
    content
)
content = re.sub(
    r'VITE_SUPABASE_PUBLISHABLE_KEY=.*',
    f'VITE_SUPABASE_PUBLISHABLE_KEY={anon_token}',
    content
)

# Write updated .env file
with open('.env.self-hosted', 'w') as f:
    f.write(content)

print("✅ Updated .env.self-hosted with new JWT tokens")
print(f"ANON_KEY: {anon_token[:50]}...")
print(f"SERVICE_KEY: {service_token[:50]}...")

# Export for bash script
with open('/tmp/new_tokens.sh', 'w') as f:
    f.write(f'export NEW_ANON_KEY="{anon_token}"\n')
    f.write(f'export NEW_SERVICE_KEY="{service_token}"\n')
PYTHON_SCRIPT

# Load the new tokens
source /tmp/new_tokens.sh
rm /tmp/new_tokens.sh

echo ""
echo "Restarting Docker containers with new tokens..."
docker-compose -f docker-compose.self-hosted.yml down
docker-compose -f docker-compose.self-hosted.yml up -d

echo ""
echo "Waiting for services to be ready (30 seconds)..."
sleep 30

echo ""
echo "=============================================="
echo "  Creating Admin User"
echo "=============================================="
echo ""

# Get admin credentials
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars): " ADMIN_PASSWORD
echo ""

read -p "Enter full name (default: Admin User): " FULL_NAME
FULL_NAME=${FULL_NAME:-Admin User}

echo ""
echo "Creating admin user via GoTrue API..."

# Create user via GoTrue admin API with new SERVICE_KEY
RESPONSE=$(curl -s -X POST \
  http://localhost:8000/auth/v1/admin/users \
  -H "apikey: ${NEW_SERVICE_KEY}" \
  -H "Authorization: Bearer ${NEW_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"$FULL_NAME\"
    }
  }")

echo ""
echo "GoTrue Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract user ID
USER_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null || echo "")

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user. Checking if user already exists..."
    
    # Try to get existing user
    docker exec -i supabase-db psql -U postgres -c "SELECT id, email FROM auth.users WHERE email='$ADMIN_EMAIL';" > /tmp/user_check.txt
    
    USER_ID=$(grep "$ADMIN_EMAIL" /tmp/user_check.txt | awk '{print $1}')
    
    if [ -z "$USER_ID" ]; then
        echo "❌ User creation failed and user doesn't exist. Check GoTrue logs:"
        docker logs supabase-auth --tail 50
        exit 1
    fi
    
    echo "✅ User already exists with ID: $USER_ID"
fi

echo ""
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
WHERE u.email = '$ADMIN_EMAIL';
SQL

echo ""
echo "=============================================="
echo "✅ COMPLETE! JWT tokens fixed and admin created"
echo "=============================================="
echo ""
echo "Email: $ADMIN_EMAIL"
echo "Password: [as entered]"
echo ""
echo "IMPORTANT: Rebuild the app container with new tokens:"
echo "sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
echo ""
echo "Then log in at: http://13.37.0.96"
echo "=============================================="
