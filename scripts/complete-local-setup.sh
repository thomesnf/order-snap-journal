#!/bin/bash

# Complete local setup - One command to rule them all
# This combines all setup steps into a single script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Complete Local Supabase Setup"
echo "=============================================="
echo ""

# Check prerequisites
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

if [ ! -f docker-compose.self-hosted.yml ]; then
    echo -e "${RED}✗${NC} docker-compose.self-hosted.yml not found!"
    exit 1
fi

# Step 1: Setup environment
echo -e "${BLUE}[1/7]${NC} Setting up environment variables..."
if [ -f .env ]; then
    cp .env .env.cloud-backup
    echo -e "${YELLOW}  ⚠${NC} Backed up cloud .env to .env.cloud-backup"
fi

source .env.self-hosted

# Create .env file for local instance
cat > .env << EOF
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=local
EOF

echo -e "${GREEN}  ✓${NC} Environment configured for local instance"
echo ""
echo "  VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:0:20}..."
echo "  VITE_SUPABASE_PROJECT_ID=local"

# Step 2: Stop any running containers and remove old app image
echo ""
echo -e "${BLUE}[2/7]${NC} Stopping existing containers..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted down 2>/dev/null || true
docker rmi order-snap-journal-app 2>/dev/null || true
echo -e "${GREEN}  ✓${NC} Containers stopped and old images removed"

# Step 3: Start Supabase services
echo ""
echo -e "${BLUE}[3/7]${NC} Starting Supabase services..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d postgres kong auth rest realtime storage meta
echo -e "${GREEN}  ✓${NC} Services started"

# Step 4: Wait for database
echo ""
echo -e "${BLUE}[4/7]${NC} Waiting for database to be ready (20 seconds)..."
sleep 20

# Step 5: Apply schema migration
echo ""
echo -e "${BLUE}[5/7]${NC} Applying application schema..."
if [ -f migrations/00000000000005-app-schema.sql ]; then
    docker exec -i supabase-db psql -U postgres -f - < migrations/00000000000005-app-schema.sql 2>/dev/null || echo -e "${YELLOW}  ⚠${NC} Schema already exists"
    echo -e "${GREEN}  ✓${NC} Schema applied"
else
    echo -e "${YELLOW}  ⚠${NC} Migration file not found, skipping"
fi

# Step 6: Create admin user
echo ""
echo -e "${BLUE}[6/7]${NC} Creating admin user..."
read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

read -sp "Enter admin password (min 10 chars): " ADMIN_PASSWORD
echo ""

if [ ${#ADMIN_PASSWORD} -lt 10 ]; then
    echo -e "${RED}  ✗${NC} Password must be at least 10 characters!"
    exit 1
fi

read -p "Enter admin full name (default: Admin User): " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Admin User}

# Create admin user in database
docker exec -i supabase-db psql -U postgres << SQL
DO \$\$
BEGIN
  -- Enable pgcrypto
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- Create or update user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '$ADMIN_EMAIL',
    crypt('$ADMIN_PASSWORD', gen_salt('bf')),
    now(),
    '{"full_name": "$ADMIN_NAME"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE
  SET encrypted_password = crypt('$ADMIN_PASSWORD', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"full_name": "$ADMIN_NAME"}'::jsonb;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::app_role
  FROM auth.users
  WHERE email = '$ADMIN_EMAIL'
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  SELECT id, '$ADMIN_NAME'
  FROM auth.users
  WHERE email = '$ADMIN_EMAIL'
  ON CONFLICT (id) DO UPDATE
  SET full_name = '$ADMIN_NAME';
END
\$\$;
SQL

echo -e "${GREEN}  ✓${NC} Admin user created: $ADMIN_EMAIL"

# Step 7: Build and start app (force clean build)
echo ""
echo -e "${BLUE}[7/7]${NC} Building and starting app container..."
echo -e "${YELLOW}  ⚠${NC} This may take a few minutes for a clean build..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted build --no-cache app
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d app
echo -e "${GREEN}  ✓${NC} App container started"

echo ""
echo -e "${BLUE}Waiting for app to start (15 seconds)...${NC}"
sleep 15

# Final verification
echo ""
echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Access your local app:"
echo "  🌐 Frontend: http://13.37.0.96"
echo "  🔐 Login: $ADMIN_EMAIL"
echo "  🎨 Supabase Studio: http://localhost:3000"
echo ""
echo "Run verification:"
echo "  sudo ./scripts/verify-local-connection.sh"
echo ""
echo "To restore Lovable Cloud:"
echo "  cp .env.cloud-backup .env && docker-compose -f docker-compose.self-hosted.yml down"
echo ""
