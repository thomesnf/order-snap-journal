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
docker rm -f order-snap-journal-app-1 2>/dev/null || true
docker rmi order-snap-journal-app 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleanup complete"
echo ""

# Step 3: Setup environment files
echo -e "${BLUE}[3/10]${NC} Setting up environment files..."
# Backup cloud .env if it exists
if [ -f .env ]; then
    cp .env .env.cloud-backup
    echo -e "${YELLOW}⚠${NC} Backed up cloud .env to .env.cloud-backup"
fi

# Copy .env.self-hosted to all needed locations
cp .env.self-hosted .env
cp .env.self-hosted .env.docker
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

# Step 5: Start Supabase services
echo -e "${BLUE}[5/10]${NC} Starting Supabase services..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d postgres kong auth rest realtime storage meta analytics inbucket studio
echo -e "${GREEN}✓${NC} Supabase services started"
echo ""

# Step 6: Wait for database to be ready
echo -e "${BLUE}[6/10]${NC} Waiting for database to be ready (30 seconds)..."
sleep 30

# Verify postgres is accepting connections
echo "Testing database connection..."
for i in {1..10}; do
    if docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database is ready"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗${NC} Database failed to start"
        exit 1
    fi
    echo "  Waiting... ($i/10)"
    sleep 3
done
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

# Step 9: Create admin user
echo -e "${BLUE}[9/10]${NC} Creating admin user..."
if [ -f scripts/create-admin-direct.sh ]; then
    chmod +x scripts/create-admin-direct.sh
    ./scripts/create-admin-direct.sh
    echo -e "${GREEN}✓${NC} Admin user created"
else
    echo -e "${RED}✗${NC} Admin creation script not found!"
    echo "Please create admin manually"
fi
echo ""

# Step 10: Build and start app
echo -e "${BLUE}[10/10]${NC} Building and starting application..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --build app
echo -e "${GREEN}✓${NC} Application started"
echo ""

echo "Waiting for app to initialize (15 seconds)..."
sleep 15
echo ""

echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Access your application:"
echo -e "  ${GREEN}Frontend:${NC} http://13.37.0.96"
echo -e "  ${GREEN}Supabase Studio:${NC} http://localhost:3001"
echo -e "  ${GREEN}API Gateway:${NC} http://13.37.0.96:8000"
echo ""
echo "Admin credentials:"
echo "  Check the output above for admin email/password"
echo ""
echo "Verify setup:"
echo "  sudo ./scripts/verify-local-connection.sh"
echo ""
echo "Test login:"
echo "  sudo ./scripts/test-local-login.sh"
echo ""
