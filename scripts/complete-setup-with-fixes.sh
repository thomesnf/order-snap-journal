#!/bin/bash

# Complete Local Self-Hosted Setup with All Fixes
# This script combines all discovered workarounds into a single setup process

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Complete Local Setup with All Fixes"
echo "=============================================="
echo ""

# Step 1: Check prerequisites
echo -e "${BLUE}[1/10]${NC} Checking prerequisites..."
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

if [ ! -f docker-compose.self-hosted.yml ]; then
    echo -e "${RED}✗${NC} docker-compose.self-hosted.yml not found!"
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites OK"
echo ""

# Step 2: Stop and clean existing containers
echo -e "${BLUE}[2/10]${NC} Stopping and removing existing containers..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted down 2>/dev/null || true
docker rm -f order-snap-journal-app-1 2>/dev/null || true
echo -e "${GREEN}✓${NC} Containers stopped"
echo ""

# Step 2b: Clean volumes and fix permissions
echo -e "${BLUE}[2b/10]${NC} Cleaning volumes and fixing permissions..."
docker volume rm order-snap-journal_postgres-data 2>/dev/null || true
docker volume rm order-snap-journal_storage-data 2>/dev/null || true
docker volume create order-snap-journal_postgres-data
docker volume create order-snap-journal_storage-data
echo -e "${GREEN}✓${NC} Volumes recreated"
echo ""

# Step 3: Setup environment files
echo -e "${BLUE}[3/10]${NC} Setting up environment files..."
# Backup cloud .env if it exists
if [ -f .env ]; then
    cp .env .env.cloud-backup
    echo -e "${YELLOW}⚠${NC} Backed up cloud .env to .env.cloud-backup"
fi

# Copy .env.self-hosted to .env (docker-compose reads this automatically)
cp .env.self-hosted .env

# Export all variables so docker-compose can use them
set -a
source .env.self-hosted
set +a

echo -e "${GREEN}✓${NC} Environment files configured"
echo ""

# Step 4: Fix JWT tokens
echo -e "${BLUE}[4/10]${NC} Fixing JWT tokens..."
if [ -f scripts/fix-jwt-tokens.sh ]; then
    chmod +x scripts/fix-jwt-tokens.sh
    ./scripts/fix-jwt-tokens.sh
    echo -e "${GREEN}✓${NC} JWT tokens fixed"
else
    echo -e "${YELLOW}⚠${NC} JWT fix script not found, skipping"
fi
echo ""

# Step 5: Start database first
echo -e "${BLUE}[5/10]${NC} Starting PostgreSQL database..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d postgres
echo -e "${GREEN}✓${NC} Database starting"
echo ""

# Step 6: Wait for database to be ready
echo -e "${BLUE}[6/10]${NC} Waiting for database to be ready..."
echo "  This may take up to 3 minutes for first-time initialization..."

# Wait for container to be healthy first
for i in {1..60}; do
    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' supabase-db 2>/dev/null || echo "not_found")
    
    if [ "$CONTAINER_STATUS" != "running" ]; then
        if [ $i -eq 60 ]; then
            echo -e "${RED}✗${NC} Database container failed to start"
            docker logs supabase-db --tail 100
            exit 1
        fi
        echo "  Container starting... ($i/60)"
        sleep 3
        continue
    fi
    
    # Container is running, now check if PostgreSQL is ready
    if docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database is ready (took $i attempts / $((i*3)) seconds)"
        break
    fi
    
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗${NC} Database failed to become ready after 3 minutes"
        echo ""
        echo "Container status: $CONTAINER_STATUS"
        echo "Last 100 lines of logs:"
        docker logs supabase-db --tail 100
        exit 1
    fi
    
    # Show progress every 10 attempts
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Still waiting for PostgreSQL... ($i/60 - $((i*3))s elapsed)"
    fi
    
    sleep 3
done
echo ""

# Step 6b: Start remaining Supabase services
echo -e "${BLUE}[6b/10]${NC} Starting remaining Supabase services..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d kong auth rest realtime storage imgproxy meta analytics inbucket studio
echo -e "${GREEN}✓${NC} All Supabase services started"
sleep 10
echo ""

# Step 7: Apply app schema
echo -e "${BLUE}[7/10]${NC} Applying app schema..."
if [ -f migrations/00000000000005-app-schema.sql ]; then
    # Check if schema already exists
    SCHEMA_EXISTS=$(docker exec -i supabase-db psql -U postgres -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders');" | tr -d '[:space:]')
    
    if [ "$SCHEMA_EXISTS" = "t" ]; then
        echo -e "${YELLOW}⚠${NC} App schema already exists, skipping"
    else
        docker exec -i supabase-db psql -U postgres < migrations/00000000000005-app-schema.sql
        echo -e "${GREEN}✓${NC} App schema applied"
    fi
else
    echo -e "${YELLOW}⚠${NC} App schema migration not found, skipping"
fi
echo ""

# Step 8: Restart GoTrue to ensure it picks up DATABASE_URL
echo -e "${BLUE}[8/10]${NC} Restarting GoTrue with correct configuration..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted restart auth
sleep 10
echo -e "${GREEN}✓${NC} GoTrue restarted"
echo ""

# Step 9: Create admin user with default password
echo -e "${BLUE}[9/10]${NC} Creating admin user..."
ADMIN_EMAIL="admin@localhost"
ADMIN_PASSWORD="admin123456"
FULL_NAME="Admin User"

echo "Creating admin: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"

# Generate password hash using Python
PASSWORD_HASH=$(docker exec -i supabase-db python3 << 'PYTHON_EOF'
import crypt
import random
import string

password = "admin123456"
salt = '$2b$10$' + ''.join(random.choices(string.ascii_letters + string.digits + './', k=22))
hashed = crypt.crypt(password, salt)
print(hashed)
PYTHON_EOF
)

if [ -z "$PASSWORD_HASH" ]; then
    echo -e "${RED}✗${NC} Failed to generate password hash"
    exit 1
fi

# Create admin user directly in database
SQL_SCRIPT=$(cat <<EOF
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
      new_user_id, '00000000-0000-0000-0000-000000000000', '$ADMIN_EMAIL',
      '$PASSWORD_HASH', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"$FULL_NAME"}'::jsonb, now(), now(), '', 'authenticated', 'authenticated'
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (new_user_id::text, new_user_id, jsonb_build_object('sub', new_user_id::text, 'email', '$ADMIN_EMAIL'),
            'email', now(), now(), now())
    ON CONFLICT (provider, id) DO NOTHING;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
      CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
      CREATE TABLE public.user_roles (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL, role public.app_role NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        UNIQUE(user_id, role)
      );
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE TABLE public.profiles (
        id uuid NOT NULL PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(), full_name text, phone text,
        email text, address text, hourly_rate numeric DEFAULT 0, employment_contract_url text, emergency_contact text
      );
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.profiles (id, full_name, email) VALUES (new_user_id, '$FULL_NAME', '$ADMIN_EMAIL')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now();
  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = '$ADMIN_EMAIL';
  END IF;
END \$\$;

COMMIT;
EOF
)

echo "$SQL_SCRIPT" | docker exec -i supabase-db psql -U postgres -d postgres > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Admin user created"
echo ""

# Step 10: Build and start all containers
echo -e "${BLUE}[10/10]${NC} Building and starting all containers..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --build
echo -e "${GREEN}✓${NC} All containers started"
echo ""

echo "Waiting for services to stabilize (10 seconds)..."
sleep 10
echo ""

echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""

# Verify all containers are running
echo "Container status:"
docker-compose -f docker-compose.self-hosted.yml ps
echo ""

echo "Access your application:"
echo -e "  ${GREEN}Frontend:${NC} http://13.37.0.96"
echo -e "  ${GREEN}Supabase Studio:${NC} http://localhost:3001"
echo -e "  ${GREEN}API Gateway:${NC} http://13.37.0.96:8000"
echo ""
echo -e "${YELLOW}Default Admin Credentials:${NC}"
echo -e "  Email: ${GREEN}admin@localhost${NC}"
echo -e "  Password: ${GREEN}admin123456${NC}"
echo ""
echo "Verify setup:"
echo "  sudo ./scripts/verify-local-connection.sh"
echo ""
echo "Test login:"
echo "  sudo ./scripts/test-local-login.sh"
echo ""
