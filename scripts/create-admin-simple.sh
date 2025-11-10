#!/bin/bash

# Simple admin creation using database-level password encryption
# This bypasses GoTrue API issues entirely

set -e

echo "=============================================="
echo "  Create Admin User (Database Method)"
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
echo "Creating admin user directly in database..."

# Create user with pgcrypto for proper password hashing
docker exec -i supabase-db psql -U postgres <<SQL
BEGIN;

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Generate UUID for new user
DO \$\$
DECLARE
    new_user_id UUID := gen_random_uuid();
    encrypted_password TEXT;
BEGIN
    -- Generate bcrypt password hash using pgcrypto
    encrypted_password := crypt('$ADMIN_PASSWORD', gen_salt('bf'));
    
    -- Insert or update user in auth.users
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
        aud,
        role
    )
    VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        '$ADMIN_EMAIL',
        encrypted_password,
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"$FULL_NAME"}',
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = NOW(),
        updated_at = NOW(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data
    RETURNING id INTO new_user_id;
    
    -- Get the user ID if it was an update
    IF new_user_id IS NULL THEN
        SELECT id INTO new_user_id FROM auth.users WHERE email = '$ADMIN_EMAIL';
    END IF;
    
    -- Insert identity record
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        new_user_id,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', '$ADMIN_EMAIL'),
        'email',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (provider, id) DO UPDATE SET
        last_sign_in_at = NOW(),
        updated_at = NOW();
    
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create or update profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (new_user_id, '$FULL_NAME')
    ON CONFLICT (user_id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
        
    RAISE NOTICE 'Admin user created/updated with ID: %', new_user_id;
END \$\$;

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
echo "✅ Admin user created successfully!"
echo "=============================================="
echo ""
echo "Email: $ADMIN_EMAIL"
echo "Password: [as entered]"
echo ""
echo "NEXT STEP: Rebuild app container with correct tokens:"
echo "sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
echo ""
echo "Then login at: http://13.37.0.96"
echo "=============================================="
