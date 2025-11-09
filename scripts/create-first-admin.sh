#!/bin/bash

# Script to create the first admin user in self-hosted Supabase
# Uses GoTrue API to create user and then grants admin role via database

set -e

# Load environment variables
if [ -f .env.self-hosted ]; then
  export $(cat .env.self-hosted | grep -v '^#' | xargs)
else
  echo "Error: .env.self-hosted file not found"
  exit 1
fi

echo "=========================================="
echo "Create First Admin User"
echo "=========================================="
echo ""

# Prompt for admin details
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars, must include upper, lower, digit, special): " ADMIN_PASSWORD
echo ""

read -p "Enter full name (default: Admin User): " FULL_NAME
FULL_NAME=${FULL_NAME:-Admin User}

echo ""
echo "Creating admin user: $ADMIN_EMAIL"
echo "Full name: $FULL_NAME"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
  echo "❌ Error: Docker is not running or you don't have permission to access it"
  echo "Please start Docker and try again"
  exit 1
fi

# Check if required containers are running
echo "Checking required Docker containers..."
echo ""

REQUIRED_CONTAINERS=("auth" "postgres" "kong")
MISSING_CONTAINERS=()

for container in "${REQUIRED_CONTAINERS[@]}"; do
  if docker ps --format '{{.Names}}' | grep -q "$container"; then
    echo "✅ $container container is running"
  else
    echo "❌ $container container is NOT running"
    MISSING_CONTAINERS+=("$container")
  fi
done

echo ""

if [ ${#MISSING_CONTAINERS[@]} -ne 0 ]; then
  echo "❌ Error: Required containers are not running: ${MISSING_CONTAINERS[*]}"
  echo ""
  echo "Please start your Supabase services first:"
  echo "  docker-compose -f docker-compose.self-hosted.yml up -d"
  echo ""
  echo "Or if you used the setup script:"
  echo "  ./scripts/setup-self-hosted.sh"
  echo ""
  echo "Then wait for services to be ready (about 30 seconds) and run this script again."
  exit 1
fi

echo "Checking GoTrue auth service..."

# Verify SERVICE_ROLE_KEY is set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set in .env.self-hosted"
  exit 1
fi

# Check if GoTrue is accessible
echo "Testing connection to GoTrue at http://localhost:9999..."
if ! curl -s -f -o /dev/null "http://localhost:9999/health" 2>/dev/null; then
  echo "⚠️  Warning: GoTrue health check failed. Waiting 10 seconds..."
  sleep 10
else
  echo "✅ GoTrue is accessible"
fi

# Step 1: Create user via GoTrue API
echo "Creating user via GoTrue API..."
echo "Using endpoint: http://localhost:9999/admin/users"

# Add timeout and better error handling
CREATE_USER_RESPONSE=$(curl --max-time 10 -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:9999/admin/users" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"$FULL_NAME\"
    }
  }" 2>&1)

CURL_EXIT_CODE=$?

# Check curl exit code first
if [ $CURL_EXIT_CODE -ne 0 ]; then
  echo "❌ Error: Failed to connect to GoTrue API (curl exit code: $CURL_EXIT_CODE)"
  echo ""
  echo "This usually means the GoTrue auth service is not running."
  echo ""
  echo "Please verify:"
  echo "1. Docker containers are running: docker ps"
  echo "2. Check for 'supabase-auth' or similar auth container"
  echo "3. Check GoTrue logs: docker logs supabase-auth"
  echo "4. Verify docker-compose is using the correct file: docker-compose -f docker-compose.self-hosted.yml ps"
  echo ""
  exit 1
fi

echo "Response received:"
echo "$CREATE_USER_RESPONSE"
echo ""

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$CREATE_USER_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$CREATE_USER_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"

# Extract user ID from response
USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ Error: Failed to create user via GoTrue API"
  echo "Full response: $RESPONSE_BODY"
  
  # Check if user already exists
  if echo "$CREATE_USER_RESPONSE" | grep -q "already been registered"; then
    echo ""
    echo "User already exists. Attempting to get user ID..."
    
    # Get user by email
    GET_USER_RESPONSE=$(curl -s -X GET "http://localhost:9999/admin/users?filter=email.eq.$ADMIN_EMAIL" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
    
    USER_ID=$(echo "$GET_USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$USER_ID" ]; then
      echo "❌ Failed to retrieve existing user ID"
      exit 1
    fi
    
    echo "Found existing user: $USER_ID"
  else
    exit 1
  fi
fi

echo "User created/found with ID: $USER_ID"

# Step 2: Create database tables and grant admin role via SQL
echo "Setting up database tables and admin role..."

SQL_SCRIPT=$(cat <<EOF
-- Create app_role enum if it doesn't exist
DO \$\$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END \$\$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant admin role (insert or update)
INSERT INTO public.user_roles (user_id, role)
VALUES ('$USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create/update profile
INSERT INTO public.profiles (id, full_name)
VALUES ('$USER_ID', '$FULL_NAME')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Display success
SELECT 'Admin user setup completed!' as message;
EOF
)

# Execute SQL
RESULT=$(echo "$SQL_SCRIPT" | PGPASSWORD="$POSTGRES_PASSWORD" docker exec -i supabase-db psql -U postgres -d postgres 2>&1)
EXIT_CODE=$?

echo "$RESULT"

if [ $EXIT_CODE -eq 0 ] && ! echo "$RESULT" | grep -qi "^error"; then
  echo ""
  echo "=========================================="
  echo "✅ Admin user created successfully!"
  echo "=========================================="
  echo "Email: $ADMIN_EMAIL"
  echo "User ID: $USER_ID"
  echo ""
  echo "You can now log in to your application"
  echo "at http://localhost (or your configured URL)"
  echo "=========================================="
else
  echo ""
  echo "⚠️  User created but database setup had issues"
  echo "Check the error messages above"
  exit 1
fi
