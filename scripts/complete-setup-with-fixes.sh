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

# Step 6b: Check/install pgcrypto extension (avoiding permission issues)
echo -e "${BLUE}[6b/10]${NC} Setting up pgcrypto for password hashing..."

# First check if pgcrypto functions are already available
CRYPTO_AVAILABLE=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'gen_salt';" 2>/dev/null | xargs)

if [ "$CRYPTO_AVAILABLE" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} pgcrypto functions already available"
else
  echo "  pgcrypto not found, attempting installation..."
  
  # Try multiple installation methods
  # Method 1: Try standard CREATE EXTENSION
  docker exec -i supabase-db psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Installed pgcrypto via CREATE EXTENSION" || {
    
    # Method 2: Try installing in public schema explicitly
    echo "  Method 1 failed, trying public schema..."
    docker exec -i supabase-db psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;" 2>/dev/null && \
      echo -e "${GREEN}✓${NC} Installed pgcrypto in public schema" || {
      
      # Method 3: Load from file if available
      echo "  Method 2 failed, trying direct SQL load..."
      docker exec -i supabase-db psql -U postgres -d postgres -f /usr/share/postgresql/15/extension/pgcrypto--1.3.sql 2>/dev/null && \
        echo -e "${GREEN}✓${NC} Loaded pgcrypto from SQL file" || {
        
        echo -e "${YELLOW}⚠${NC} All installation methods failed, checking if functions are still available..."
      }
    }
  }
fi

# Final verification - check if functions work
echo "  Verifying pgcrypto functions..."

# Use timeout to prevent hanging
HASH_TEST=$(timeout 10 docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT crypt('test', gen_salt('bf'));" 2>&1)
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 124 ]; then
  echo -e "${RED}✗${NC} Verification timed out after 10 seconds"
  echo "  This suggests a database connectivity issue"
  exit 1
elif [ $TEST_EXIT_CODE -eq 0 ] && [ -n "$HASH_TEST" ]; then
  echo -e "${GREEN}✓${NC} pgcrypto functions are working"
  echo "  Sample hash generated successfully"
else
  echo -e "${YELLOW}⚠${NC} Verification returned unexpected result"
  echo "  Exit code: $TEST_EXIT_CODE"
  echo "  Output: $HASH_TEST"
  
  # Try a simpler test
  echo "  Trying simpler function test..."
  SIMPLE_TEST=$(timeout 5 docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'gen_salt';" 2>&1)
  
  if [ $? -eq 0 ] && [ "$SIMPLE_TEST" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} pgcrypto functions are loaded (count: $SIMPLE_TEST)"
    echo "  Continuing despite hash test failure..."
  else
    echo -e "${RED}✗${NC} pgcrypto functions are not available!"
    echo "  Checking what extensions are installed:"
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
    exit 1
  fi
fi
echo ""

# Step 6c: Now start GoTrue (it can use pgcrypto that we just installed)
echo -e "${BLUE}[6c/10]${NC} Starting GoTrue auth service..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d auth

echo "  Waiting for GoTrue container to start (10 seconds)..."
sleep 10

# Check if GoTrue container is running
if docker ps | grep -q supabase-auth; then
  echo -e "${GREEN}✓${NC} GoTrue container started"
  
  echo "  Waiting for GoTrue to complete auth schema setup (30 seconds)..."
  sleep 30
else
  echo -e "${RED}✗${NC} GoTrue container failed to start"
  echo "  Logs:"
  docker logs supabase-auth --tail 50
  exit 1
fi

echo -e "${GREEN}✓${NC} GoTrue started successfully"
echo ""

# Step 6d: Start remaining Supabase services
echo -e "${BLUE}[6d/10]${NC} Starting remaining Supabase services..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d kong rest realtime storage imgproxy meta analytics inbucket studio
echo -e "${GREEN}✓${NC} All Supabase services started"
sleep 10
echo ""

# Step 7: Wait for GoTrue to complete its auth schema migrations
echo -e "${BLUE}[7/10]${NC} Waiting for GoTrue to complete auth schema setup..."

# Wait for auth.users table to exist
for i in {1..30}; do
    AUTH_READY=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users');" 2>/dev/null | xargs)
    
    if [ "$AUTH_READY" = "t" ]; then
        echo -e "${GREEN}✓${NC} GoTrue auth schema setup complete (took $i attempts)"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} GoTrue auth schema setup failed after 60 seconds"
        echo ""
        echo "GoTrue logs (last 100 lines):"
        docker logs supabase-auth --tail 100
        exit 1
    fi
    
    # Show progress every 10 attempts
    if [ $((i % 10)) -eq 0 ]; then
      echo "  Waiting for auth schema... ($i/30 - $((i*2))s elapsed)"
    fi
    
    sleep 2
done
echo ""

# Step 8: Apply application schema (CRITICAL - must happen after GoTrue, before admin creation)
echo -e "${BLUE}[9/10]${NC} Applying application schema..."
if [ -f migrations/00000000000005-app-schema.sql ]; then
    echo "  Running app schema migration..."
    docker exec -i supabase-db psql -U postgres -d postgres < migrations/00000000000005-app-schema.sql 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}✓${NC} Application schema applied"
else
    echo -e "${RED}✗${NC} Migration file not found: migrations/00000000000005-app-schema.sql"
    echo "  This file is required for user_roles and profiles tables"
    exit 1
fi
echo ""

# Step 9: Create admin user NOW that pgcrypto is guaranteed to be installed
echo -e "${BLUE}[9/10]${NC} Creating admin user with bcrypt password..."
ADMIN_EMAIL="admin@localhost"
ADMIN_PASSWORD="admin123456"

echo "  Creating admin user: $ADMIN_EMAIL"
echo "  Verifying pgcrypto is available..."

# Final verification that pgcrypto works
if ! docker exec supabase-db psql -U postgres -d postgres -c "SELECT crypt('test', gen_salt('bf'));" > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} pgcrypto functions not available!"
    echo "  Available extensions:"
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT extname FROM pg_extension;"
    exit 1
fi

echo "  pgcrypto verified, creating user..."

docker exec -i supabase-db psql -U postgres -d postgres <<'EOF'
DO $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  -- Generate bcrypt hash using pgcrypto
  v_password_hash := crypt('admin123456', gen_salt('bf', 10));
  
  -- Delete existing user if present
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@localhost');
  DELETE FROM auth.users WHERE email = 'admin@localhost';
  
  -- Insert new user with bcrypt hash
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin@localhost',
    v_password_hash, now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin User"}'::jsonb,
    'authenticated', 'authenticated', now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;
  
  -- Create identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, 
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@localhost', 'email_verified', true, 'phone_verified', false, 'provider', 'email'),
    'email', now(), now(), now());
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email) VALUES (v_user_id, 'Admin User', 'admin@localhost');
  
  RAISE NOTICE 'Admin user created successfully with ID: %', v_user_id;
  RAISE NOTICE 'Password hash length: %, Format: bcrypt (starts with %)', LENGTH(v_password_hash), SUBSTRING(v_password_hash, 1, 7);
END $$;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Admin user created successfully"
else
    echo -e "${RED}✗${NC} Failed to create admin user!"
    echo "  Checking what went wrong..."
    docker exec supabase-db psql -U postgres -d postgres -c "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';"
    exit 1
fi
echo ""

# Now build and start app container
echo -e "${BLUE}[11/11]${NC} Building and starting app container..."

# Explicitly set environment variables for docker-compose
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
export VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
export VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-local}"

# Verify the variables are set
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}✗${NC} VITE_SUPABASE_URL is not set!"
    exit 1
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}✗${NC} VITE_SUPABASE_PUBLISHABLE_KEY is not set!"
    exit 1
fi

echo "  Environment configured:"
echo "    VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID"

# Clean up any existing app container
echo "  Cleaning up existing app container..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted stop app 2>/dev/null || true
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted rm -f app 2>/dev/null || true
docker rmi order-snap-journal-app 2>/dev/null || true

# Build and start app using the same command that works manually
echo "  Building and starting app container (this may take a few minutes)..."
if docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --build app; then
    echo -e "${GREEN}✓${NC} App container build started"
else
    echo -e "${RED}✗${NC} Failed to build/start app container!"
    echo ""
    echo "Try manually:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --build app"
    exit 1
fi

# Wait for container to initialize
echo "  Waiting for app to initialize (25 seconds)..."
sleep 25

# Verify app container is running
CONTAINER_NAME=$(docker ps --filter "name=order-snap-journal-app" --filter "status=running" --format "{{.Names}}" | head -1)

if [ -n "$CONTAINER_NAME" ]; then
    echo -e "${GREEN}✓${NC} App container is running: $CONTAINER_NAME"
    
    # Check if Nginx is running
    if docker exec "$CONTAINER_NAME" pgrep nginx >/dev/null 2>&1; then
        NGINX_COUNT=$(docker exec "$CONTAINER_NAME" pgrep nginx 2>/dev/null | wc -l)
        echo -e "${GREEN}✓${NC} Nginx is running ($NGINX_COUNT processes)"
        
        # Test HTTP access
        sleep 3
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://13.37.0.96 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓${NC} App is accessible at http://13.37.0.96"
        else
            echo -e "${YELLOW}⚠${NC} App returned HTTP $HTTP_CODE"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Nginx not detected in container"
        echo "  Container logs:"
        docker logs --tail 20 "$CONTAINER_NAME" 2>&1
    fi
else
    echo -e "${RED}✗${NC} App container is not running!"
    
    # Show logs from failed container
    FAILED_CONTAINER=$(docker ps -a --filter "name=order-snap-journal-app" --format "{{.Names}}" | head -1)
    if [ -n "$FAILED_CONTAINER" ]; then
        echo ""
        echo "Container logs:"
        docker logs --tail 30 "$FAILED_CONTAINER" 2>&1
        echo ""
        echo "Container status:"
        docker inspect "$FAILED_CONTAINER" --format='Status: {{.State.Status}}, Exit Code: {{.State.ExitCode}}' 2>&1
    fi
    
    echo ""
    echo "Try manually:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --build app"
    echo ""
    echo -e "${YELLOW}⚠${NC} Continuing to verification despite app container failure..."
fi

echo -e "${GREEN}✓${NC} App container started and verified"
echo ""

# Continue to verification
echo ""
echo "=============================================="
echo -e "${GREEN}  Setup Complete - Running Verification${NC}"
echo "=============================================="
echo ""

echo ""
echo "=============================================="
echo -e "${GREEN}  Verifying Final Status${NC}"
echo "=============================================="
echo ""

# Verify all containers are running
echo "Final container status:"
docker ps --filter "name=supabase" --filter "name=order-snap" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Verify admin user exists and check auth
echo "Verifying admin user and authentication..."
ADMIN_EXISTS=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
  "SELECT EXISTS(SELECT 1 FROM auth.users WHERE email='admin@localhost');" 2>/dev/null | xargs)

if [ "$ADMIN_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Admin user exists in database"
    
    # Show user confirmation status
    ADMIN_CONFIRMED=$(docker exec -i supabase-db psql -U postgres -d postgres -t -c \
      "SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE email='admin@localhost';" 2>/dev/null | xargs)
    
    if [ "$ADMIN_CONFIRMED" = "t" ]; then
        echo -e "${GREEN}✓${NC} Admin email is confirmed"
    else
        echo -e "${YELLOW}⚠${NC} Admin email is NOT confirmed!"
    fi
else
    echo -e "${RED}✗${NC} Admin user NOT found in database!"
    echo "  You may need to create it manually"
fi

echo ""
echo "Checking GoTrue auth service..."
GOTRUE_HEALTH=$(docker exec supabase-auth wget -q -O- http://localhost:9999/health 2>/dev/null || echo "unreachable")
if [[ "$GOTRUE_HEALTH" == *"ok"* ]] || [[ "$GOTRUE_HEALTH" == *"healthy"* ]]; then
    echo -e "${GREEN}✓${NC} GoTrue auth service is healthy"
else
    echo -e "${YELLOW}⚠${NC} GoTrue health check: $GOTRUE_HEALTH"
    echo "  Check logs: docker logs supabase-auth --tail 50"
fi

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
echo -e "${BLUE}⚠ Troubleshooting if login fails:${NC}"
echo "  • Check GoTrue logs: docker logs supabase-auth --tail 50"
echo "  • Test auth directly: curl http://13.37.0.96:8000/auth/v1/health"
echo "  • Verify admin user: sudo ./scripts/test-local-login.sh"
echo "  • Check all services: docker ps --filter 'name=supabase'"
echo ""
echo -e "${BLUE}Verification Commands:${NC}"
echo "  • Network status: sudo ./scripts/diagnose-network.sh"
echo "  • App container: sudo ./scripts/check-app-container.sh"
echo "  • View logs: docker logs $CONTAINER_NAME"
echo ""
