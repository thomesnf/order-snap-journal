#!/bin/bash

# Create admin user directly in database (bypass GoTrue)
# This is a workaround for when GoTrue API is not working

set -e

echo "=========================================="
echo "Create Admin User (Direct DB Method)"
echo "=========================================="
echo ""

# Prompt for admin details
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars): " ADMIN_PASSWORD
echo ""

read -p "Enter full name (default: Admin User): " FULL_NAME
FULL_NAME=${FULL_NAME:-Admin User}

echo ""
echo "Creating admin user: $ADMIN_EMAIL"
echo "Full name: $FULL_NAME"
echo ""

# Check if database container is running
if ! docker ps | grep -q supabase-db; then
    echo "❌ ERROR: supabase-db container is not running"
    exit 1
fi

# Generate bcrypt hash for password (using htpasswd which uses bcrypt)
# Check if htpasswd is available
if command -v htpasswd &> /dev/null; then
    PASSWORD_HASH=$(htpasswd -bnBC 10 "" "$ADMIN_PASSWORD" | tr -d ':\n' | sed 's/^//')
else
    # Fallback: use Python to generate bcrypt hash
    echo "Generating password hash..."
    PASSWORD_HASH=$(python3 << PYTHON_EOF
import crypt
import random
import string

password = "$ADMIN_PASSWORD"
# Generate a salt for bcrypt
salt = '\$2b\$10\$' + ''.join(random.choices(string.ascii_letters + string.digits + './', k=22))
hashed = crypt.crypt(password, salt)
print(hashed)
PYTHON_EOF
    )
fi

if [ -z "$PASSWORD_HASH" ]; then
    echo "❌ ERROR: Failed to generate password hash"
    exit 1
fi

echo "Password hash generated"
echo ""

# Create SQL script
SQL_SCRIPT=$(cat <<EOF
-- Start transaction
BEGIN;

-- Create user in auth.users if not exists
DO \$\$
DECLARE
  new_user_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = '$ADMIN_EMAIL') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Generate new UUID for user
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      aud,
      role
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      '$ADMIN_EMAIL',
      '$PASSWORD_HASH',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"$FULL_NAME"}'::jsonb,
      now(),
      now(),
      '',
      'authenticated',
      'authenticated'
    );
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', '$ADMIN_EMAIL'),
      'email',
      now(),
      now(),
      now()
    );
    
    RAISE NOTICE 'Created user with ID: %', new_user_id;
  ELSE
    -- Get existing user ID
    SELECT id INTO new_user_id FROM auth.users WHERE email = '$ADMIN_EMAIL';
    RAISE NOTICE 'User already exists with ID: %', new_user_id;
  END IF;
  
  -- Create app_role enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    RAISE NOTICE 'Created app_role enum';
  END IF;
  
  -- Create user_roles table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL,
      role public.app_role NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Created user_roles table';
  END IF;
  
  -- Create profiles table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
      id uuid NOT NULL PRIMARY KEY,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      full_name text,
      phone text,
      email text,
      address text,
      hourly_rate numeric DEFAULT 0,
      employment_contract_url text,
      emergency_contact text
    );
    
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Created profiles table';
  END IF;
  
  -- Insert or update admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Granted admin role';
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new_user_id, '$FULL_NAME', '$ADMIN_EMAIL')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = now();
  
  RAISE NOTICE 'Created/updated profile';
END
\$\$;

COMMIT;

-- Verify user was created
SELECT 
  u.id, 
  u.email, 
  u.email_confirmed_at,
  ur.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = '$ADMIN_EMAIL';
EOF
)

echo "Executing SQL..."
echo "$SQL_SCRIPT" | docker exec -i supabase-db psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Admin user created successfully!"
    echo "=========================================="
    echo ""
    echo "Email: $ADMIN_EMAIL"
    echo "Password: [as entered]"
    echo ""
    echo "You can now log in to your application!"
else
    echo ""
    echo "❌ Failed to create admin user"
    exit 1
fi
