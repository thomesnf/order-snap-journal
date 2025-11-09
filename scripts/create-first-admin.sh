#!/bin/bash

# Script to create the first admin user in self-hosted Supabase
# This bypasses the edge function authentication requirement

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

# Generate UUID for the user
USER_ID=$(cat /proc/sys/kernel/random/uuid)

# SQL script to create admin user
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

-- Create the admin user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '$USER_ID',
  'authenticated',
  'authenticated',
  '$ADMIN_EMAIL',
  crypt('$ADMIN_PASSWORD', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"$FULL_NAME"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Create identity entry (required for auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '$USER_ID',
  format('{"sub":"%s","email":"%s"}', '$USER_ID', '$ADMIN_EMAIL')::jsonb,
  'email',
  now(),
  now(),
  now()
);

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('$USER_ID', 'admin');

-- Create profile
INSERT INTO public.profiles (id, full_name)
VALUES ('$USER_ID', '$FULL_NAME');

-- Display success
SELECT 'Admin user created successfully!' as message;
SELECT 'Email: $ADMIN_EMAIL' as login_email;
SELECT 'User ID: $USER_ID' as user_id;
EOF
)

# Execute SQL via docker with proper error handling
echo "Executing SQL..."
RESULT=$(echo "$SQL_SCRIPT" | PGPASSWORD="$POSTGRES_PASSWORD" docker exec -i supabase-db psql -U postgres -d postgres 2>&1)
EXIT_CODE=$?

echo "$RESULT"

if [ $EXIT_CODE -eq 0 ] && ! echo "$RESULT" | grep -qi "error"; then
  echo ""
  echo "=========================================="
  echo "✅ Admin user created successfully!"
  echo "=========================================="
  echo "Email: $ADMIN_EMAIL"
  echo "User ID: $USER_ID"
  echo ""
  echo "You can now log in to your application"
  echo "=========================================="
else
  echo ""
  echo "❌ Failed to create admin user"
  echo "Check the error messages above"
  exit 1
fi
