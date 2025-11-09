#!/bin/bash

# Diagnostic script for PostgreSQL container issues
# This will help identify why the container is failing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "PostgreSQL Container Diagnostics"
echo "============================================"
echo ""

# Load environment
if [ -f .env.self-hosted ]; then
    export $(cat .env.self-hosted | grep -E '^[A-Z_]+=' | xargs)
else
    echo -e "${RED}ERROR: .env.self-hosted not found${NC}"
    exit 1
fi

echo -e "${BLUE}1. Checking if init-db-runtime.sql exists...${NC}"
if [ -f init-db-runtime.sql ]; then
    echo -e "${GREEN}✓ init-db-runtime.sql found${NC}"
    echo -e "${YELLOW}First 20 lines:${NC}"
    head -n 20 init-db-runtime.sql
else
    echo -e "${RED}✗ init-db-runtime.sql NOT found${NC}"
    echo "Creating it now..."
    sed "s|__POSTGRES_PASSWORD__|${POSTGRES_PASSWORD}|g" init-db.sql > init-db-runtime.sql
fi

echo ""
echo -e "${BLUE}2. Stopping any running containers...${NC}"
docker-compose -f docker-compose.self-hosted.yml down -v 2>/dev/null || true

echo ""
echo -e "${BLUE}3. Starting ONLY the postgres container...${NC}"
docker-compose -f docker-compose.self-hosted.yml up -d postgres

echo ""
echo -e "${BLUE}4. Waiting 5 seconds for container to initialize...${NC}"
sleep 5

echo ""
echo -e "${BLUE}5. Checking container status...${NC}"
docker ps -a --filter "name=supabase-db"

echo ""
echo -e "${BLUE}6. Fetching last 100 lines of PostgreSQL logs...${NC}"
echo -e "${YELLOW}==================== LOGS ====================${NC}"
docker logs supabase-db --tail 100
echo -e "${YELLOW}=============================================${NC}"

echo ""
echo -e "${BLUE}7. Checking if container is still running...${NC}"
if docker ps | grep -q supabase-db; then
    echo -e "${GREEN}✓ Container is running${NC}"
    echo ""
    echo -e "${BLUE}8. Testing database connection...${NC}"
    sleep 5
    docker exec supabase-db psql -U postgres -c "SELECT version();" || echo -e "${RED}✗ Cannot connect to database${NC}"
else
    echo -e "${RED}✗ Container has stopped${NC}"
    echo ""
    echo -e "${BLUE}Exit code:${NC}"
    docker inspect supabase-db --format='{{.State.ExitCode}}'
fi

echo ""
echo -e "${GREEN}Diagnostics complete!${NC}"
