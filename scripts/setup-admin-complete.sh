#!/bin/bash

# Complete self-hosted admin setup
# This script creates all necessary tables and the admin user

set -e

echo "=========================================="
echo "Complete Self-Hosted Admin Setup"
echo "=========================================="
echo ""

# Check if database container is running
if ! docker ps | grep -q supabase-db; then
    echo "❌ ERROR: supabase-db container is not running"
    exit 1
fi

# Prompt for admin details
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars): " ADMIN_PASSWORD
echo ""

read -p "Enter full name (default: Admin User): " FULL_NAME
FULL_NAME=${FULL_NAME:-Admin User}

echo ""
echo "Creating admin user: $ADMIN_EMAIL"
echo ""

# Generate bcrypt hash for password
if command -v htpasswd &> /dev/null; then
    PASSWORD_HASH=$(htpasswd -bnBC 10 "" "$ADMIN_PASSWORD" | tr -d ':\n' | sed 's/^//')
else
    PASSWORD_HASH=$(python3 -c "import crypt; import random; import string; salt = '\$2b\$10\$' + ''.join(random.choices(string.ascii_letters + string.digits + './', k=22)); print(crypt.crypt('$ADMIN_PASSWORD', salt))")
fi

if [ -z "$PASSWORD_HASH" ]; then
    echo "❌ ERROR: Failed to generate password hash"
    exit 1
fi

# Create complete SQL script
SQL_SCRIPT=$(cat <<'EOF'
BEGIN;

-- Create auth.identities table with correct schema
CREATE TABLE IF NOT EXISTS auth.identities (
  id text NOT NULL,
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text GENERATED ALWAYS AS (lower((identity_data->>'email')::text)) STORED,
  PRIMARY KEY (provider, id)
);

CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);

-- Create app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$func$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT SELECT ON auth.identities TO anon, authenticated;
GRANT ALL ON auth.identities TO service_role;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own role, admins view all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role, admins view all"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMIT;
EOF
)

echo "Creating database schema..."
echo "$SQL_SCRIPT" | docker exec -i supabase-db psql -U postgres -d postgres

# Now create the admin user
USER_SQL=$(cat <<EOF
BEGIN;

DO \$\$
DECLARE
  new_user_id uuid;
  user_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = '$ADMIN_EMAIL') INTO user_exists;
  
  IF NOT user_exists THEN
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, aud, role
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      '$ADMIN_EMAIL',
      '$PASSWORD_HASH',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"$FULL_NAME"}'::jsonb,
      now(), now(), '', 'authenticated', 'authenticated'
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      new_user_id::text, new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', '$ADMIN_EMAIL'),
      'email', now(), now(), now()
    ) ON CONFLICT (provider, id) DO NOTHING;
    
    RAISE NOTICE 'Created user: %', new_user_id;
  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = '$ADMIN_EMAIL';
    RAISE NOTICE 'User exists: %', new_user_id;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new_user_id, '$FULL_NAME', '$ADMIN_EMAIL')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now();
  
  RAISE NOTICE 'Admin setup complete';
END \$\$;

COMMIT;

SELECT u.id, u.email, ur.role, p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = '$ADMIN_EMAIL';
EOF
)

echo "Creating admin user..."
echo "$USER_SQL" | docker exec -i supabase-db psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Setup complete!"
    echo "=========================================="
    echo "Email: $ADMIN_EMAIL"
    echo "Password: [as entered]"
else
    echo "❌ Failed"
    exit 1
fi
