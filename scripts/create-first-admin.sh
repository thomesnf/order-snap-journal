#!/bin/bash

# Script to create the first admin user in self-hosted Supabase
# This bypasses the edge function authentication requirement

set -e

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
-- Create the admin user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
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
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"$FULL_NAME"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

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

# Execute SQL via docker
echo "Executing SQL..."
echo "$SQL_SCRIPT" | docker exec -i supabase-db psql -U supabase_admin -d postgres

if [ $? -eq 0 ]; then
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
