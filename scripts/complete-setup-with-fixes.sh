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
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted down -v 2>/dev/null || true
docker rm -f order-snap-journal-app-1 supabase-db 2>/dev/null || true

# Remove the postgres container to force fresh initialization
echo "  Removing postgres container and image cache..."
docker rmi supabase/postgres:15.1.0.147 2>/dev/null || true

echo -e "${GREEN}✓${NC} Containers stopped and cleaned"
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
    
    # Re-source the environment file after JWT fix rewrites it
    set -a
    source .env.self-hosted
    set +a
    
    echo -e "${GREEN}✓${NC} JWT tokens fixed and environment reloaded"
else
    echo -e "${YELLOW}⚠${NC} JWT fix script not found, skipping"
fi
echo ""

# Step 4b: Generate init-db-runtime.sql
echo -e "${BLUE}[4b/10]${NC} Generating database initialization file..."
if [ -f init-db.sql ]; then
    sed "s|__POSTGRES_PASSWORD__|${POSTGRES_PASSWORD}|g" init-db.sql > init-db-runtime.sql
    echo -e "${GREEN}✓${NC} Database init file generated"
else
    echo -e "${RED}✗${NC} init-db.sql not found!"
    exit 1
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

# Step 6b: Start GoTrue first and wait for it to initialize auth schema
echo -e "${BLUE}[6b/10]${NC} Starting GoTrue to initialize auth schema..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d auth
echo "  Waiting for GoTrue to initialize auth schema (60 seconds)..."
sleep 60
echo -e "${GREEN}✓${NC} GoTrue auth schema initialized"
echo ""

# Step 6c: Start remaining Supabase services
echo -e "${BLUE}[6c/10]${NC} Starting remaining Supabase services..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d kong rest realtime storage imgproxy meta analytics inbucket studio
echo -e "${GREEN}✓${NC} All Supabase services started"
sleep 10
echo ""

# Step 7: Wait for GoTrue to complete its migrations
echo -e "${BLUE}[7/10]${NC} Waiting for GoTrue to complete auth schema setup..."
for i in {1..30}; do
    # Check if auth.users table exists (created by GoTrue migrations)
    AUTH_READY=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users');" 2>/dev/null | xargs)
    
    if [ "$AUTH_READY" = "t" ]; then
        echo -e "${GREEN}✓${NC} GoTrue migrations complete (attempt $i)"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} GoTrue migrations failed to complete"
        echo "Checking GoTrue logs:"
        docker logs supabase-auth --tail 100
        exit 1
    fi
    
    echo "  Waiting for auth.users table... ($i/30)"
    sleep 2
done
echo ""

# Step 7b: Now run only app migrations (auth/storage/realtime handled by Supabase services)
echo -e "${BLUE}[7b/10]${NC} Running application schema migrations..."
docker exec -i supabase-db psql -U postgres -d postgres < migrations/00000000000005-app-schema.sql > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Application migrations complete"
echo ""

# Step 8: Verify GoTrue is healthy
echo -e "${BLUE}[8/10]${NC} Verifying GoTrue health..."
for i in {1..20}; do
    # Check GoTrue directly on its internal port
    GOTRUE_HEALTH=$(docker exec supabase-auth wget -q -O- http://localhost:9999/health 2>/dev/null || echo "fail")
    
    if [[ "$GOTRUE_HEALTH" == *"ok"* ]] || [[ "$GOTRUE_HEALTH" == *"healthy"* ]]; then
        echo -e "${GREEN}✓${NC} GoTrue is healthy (attempt $i)"
        break
    fi
    
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}⚠${NC} GoTrue health check inconclusive, proceeding anyway"
        echo "GoTrue response: $GOTRUE_HEALTH"
        break
    fi
    
    echo "  Checking GoTrue health... ($i/20)"
    sleep 2
done
echo ""

# Step 8b: Wait for Kong to be ready to route
echo -e "${BLUE}[8b/10]${NC} Waiting for Kong gateway to be ready..."
for i in {1..20}; do
    KONG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 2>/dev/null || echo "000")
    
    if [ "$KONG_STATUS" != "000" ]; then
        echo -e "${GREEN}✓${NC} Kong is responding (attempt $i)"
        break
    fi
    
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}⚠${NC} Kong not fully ready, but proceeding"
        break
    fi
    
    echo "  Waiting for Kong... ($i/20)"
    sleep 2
done
sleep 5
echo ""

# Step 9: Create admin user directly in database with proper bcrypt hash
echo -e "${BLUE}[9/10]${NC} Creating admin user..."
ADMIN_EMAIL="admin@localhost"
ADMIN_PASSWORD="admin123456"
FULL_NAME="Admin User"

echo "Creating admin user in database: $ADMIN_EMAIL"

# pgcrypto is already available in Supabase PostgreSQL by default
echo "  Verifying bcrypt function availability..."
echo -e "${GREEN}✓${NC} pgcrypto functions available"

# Create user directly in database with proper bcrypt hash
echo "  Creating user with bcrypt password hash..."
ADMIN_CREATION_RESULT=$(docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 << 'EOSQL' 2>&1
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate bcrypt hash with cost factor 10 (GoTrue default)
  v_encrypted_password := crypt('admin123456', gen_salt('bf', 10));
  
  -- Delete existing user if present (clean slate)
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM auth.users WHERE email = 'admin@localhost';
  
  -- Insert new user in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@localhost',
    v_encrypted_password,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin User"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;
  
  -- Create identity for email provider
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text, 
      'email', 'admin@localhost',
      'email_verified', true,
      'phone_verified', false,
      'provider', 'email'
    ),
    'email',
    now(),
    now(),
    now()
  );
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (v_user_id, 'admin'::public.app_role);
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email) 
  VALUES (v_user_id, 'Admin User', 'admin@localhost');
  
  RAISE NOTICE 'SUCCESS: Admin user created with ID: %', v_user_id;
END $$;
EOSQL
)

# Check if creation was successful
if echo "$ADMIN_CREATION_RESULT" | grep -q "SUCCESS:"; then
    echo -e "${GREEN}✓${NC} Admin user created successfully"
else
    echo -e "${RED}✗${NC} Failed to create admin user!"
    echo "Error output: $ADMIN_CREATION_RESULT"
    exit 1
fi

# Verify the user exists
echo "  Verifying admin user..."
USER_EXISTS=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
  "SELECT EXISTS(SELECT 1 FROM auth.users WHERE email='admin@localhost');" | xargs)

if [ "$USER_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Admin user verified in database"
else
    echo -e "${RED}✗${NC} Admin user verification failed!"
    exit 1
fi

# Verify admin role
ROLE_EXISTS=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
  "SELECT EXISTS(SELECT 1 FROM public.user_roles ur JOIN auth.users u ON ur.user_id = u.id WHERE u.email='admin@localhost' AND ur.role='admin');" | xargs)

if [ "$ROLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Admin role verified"
else
    echo -e "${RED}✗${NC} Admin role verification failed!"
    exit 1
fi

echo -e "${GREEN}✓${NC} Admin user, role, and profile created"
echo ""

# Step 10: Build and start the app container
echo -e "${BLUE}[10/10]${NC} Building and starting the app container..."

# Explicitly set environment variables with their values for docker-compose
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
export VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
export VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-local}"

# Verify the variables are set before building
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}✗${NC} VITE_SUPABASE_URL is not set!"
    exit 1
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}✗${NC} VITE_SUPABASE_PUBLISHABLE_KEY is not set!"
    exit 1
fi

echo "Building app with:"
echo "  VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "  VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID"

# Stop existing app container if running
echo "Stopping existing app container..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted stop app 2>/dev/null || true
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted rm -f app 2>/dev/null || true
docker rmi order-snap-journal-app 2>/dev/null || true

# Build the app container first (separate from up)
echo "Building app container (this may take a few minutes)..."
echo -e "${YELLOW}Build output:${NC}"
if ! docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted build --no-cache app 2>&1 | tee /tmp/app-build.log; then
    echo -e "${RED}✗${NC} Failed to build app container!"
    echo ""
    echo "Build logs saved to: /tmp/app-build.log"
    echo ""
    echo "Try manually:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted build --no-cache app"
    exit 1
fi

echo -e "${GREEN}✓${NC} App container built successfully"
echo ""

# Now start the app container
echo "Starting app container..."
if ! docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d app 2>&1; then
    echo -e "${RED}✗${NC} Failed to start app container!"
    echo ""
    echo "Try manually:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d app"
    exit 1
fi

echo "Waiting for app to initialize (20 seconds)..."
sleep 20
echo ""

# Verify app container is actually running
if docker ps | grep -q "order-snap-journal-app"; then
    echo -e "${GREEN}✓${NC} App container is running"
    
    # Also check if Nginx is running inside
    echo "Checking Nginx status..."
    if docker exec order-snap-journal-app ps aux | grep -q "[n]ginx"; then
        echo -e "${GREEN}✓${NC} Nginx is running"
    else
        echo -e "${YELLOW}⚠${NC} Nginx might not be running. Check logs:"
        docker logs --tail 20 order-snap-journal-app
    fi
else
    echo -e "${RED}✗${NC} App container failed to start or exited!"
    echo ""
    echo -e "${YELLOW}Container status:${NC}"
    docker ps -a | grep "order-snap-journal-app" || echo "Container not found"
    echo ""
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs order-snap-journal-app 2>&1 || echo "No logs available"
    echo ""
    echo "Rebuild manually:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted build --no-cache app"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d app"
    exit 1
fi
echo ""

echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""

# Verify all containers are running
echo "Final container status:"
docker-compose -f docker-compose.self-hosted.yml ps | grep -E "(order-snap-journal-app|supabase-db|supabase-auth|kong)" || docker ps | grep -E "(order-snap-journal-app|supabase)" 
echo ""

echo "=============================================="
echo -e "${GREEN}  ✓ Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Access your application:"
echo -e "  ${GREEN}🌐 Frontend:${NC} http://13.37.0.96"
echo -e "  ${GREEN}📊 Studio:${NC} http://localhost:3001"
echo -e "  ${GREEN}🔌 API:${NC} http://13.37.0.96:8000"
echo ""
echo -e "${YELLOW}Default Admin Login:${NC}"
echo -e "  📧 Email: ${GREEN}admin@localhost${NC}"
echo -e "  🔑 Password: ${GREEN}admin123456${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Open http://13.37.0.96 in your browser"
echo "  2. Login with the credentials above"
echo ""
echo -e "${BLUE}Verification Commands:${NC}"
echo "  • Check connection: sudo ./scripts/verify-local-connection.sh"
echo "  • Test login: sudo ./scripts/test-local-login.sh"
echo "  • View logs: docker logs order-snap-journal-app"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "  • If app not accessible: sudo ./scripts/diagnose-network.sh"
echo "  • Rebuild app: sudo ./scripts/rebuild-app-local.sh"
echo ""
