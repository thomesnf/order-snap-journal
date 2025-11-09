#!/bin/bash

# Cleanup script for self-hosted Supabase
# This script forcefully removes all containers, networks, and volumes
set -e

echo "============================================"
echo "Supabase Self-Hosted Cleanup"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Warning
echo -e "${RED}WARNING: This will remove all containers, networks, and volumes!${NC}"
echo -e "${YELLOW}All data in the local Supabase instance will be permanently deleted.${NC}"
echo ""
echo -e "${YELLOW}Do you want to continue? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${GREEN}Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Stopping all containers...${NC}"
docker-compose -f docker-compose.self-hosted.yml down --remove-orphans 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"

echo ""
echo -e "${BLUE}Step 2: Removing all project containers...${NC}"
docker ps -a --filter "name=supabase-" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=order-snap-journal" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ Containers removed${NC}"

echo ""
echo -e "${BLUE}Step 3: Removing volumes...${NC}"
docker volume ls --filter "name=order-snap-journal" --format "{{.Name}}" | xargs -r docker volume rm -f 2>/dev/null || true
echo -e "${GREEN}✓ Volumes removed${NC}"

echo ""
echo -e "${BLUE}Step 4: Removing networks...${NC}"
docker network ls --filter "name=order-snap-journal" --format "{{.Name}}" | xargs -r docker network rm 2>/dev/null || true
echo -e "${GREEN}✓ Networks removed${NC}"

echo ""
echo -e "${BLUE}Step 5: Pruning Docker system...${NC}"
docker system prune -f --volumes 2>/dev/null || true
echo -e "${GREEN}✓ Docker system pruned${NC}"

echo ""
echo -e "${BLUE}Step 6: Checking for processes using required ports...${NC}"
PORTS="80 3000 3001 4001 4040 5000 5001 8000 8080 9000 9999"
PORT_CONFLICTS=""

for PORT in $PORTS; do
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo -e "${YELLOW}  Port $PORT is still in use:${NC}"
        lsof -i :$PORT | tail -n +2
        PORT_CONFLICTS="yes"
    fi
done

if [ -z "$PORT_CONFLICTS" ]; then
    echo -e "${GREEN}✓ All required ports are available${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠ Some ports are still in use. You may need to stop those processes.${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}To start fresh:${NC}"
echo "  ./scripts/setup-self-hosted.sh"
echo ""
echo -e "${YELLOW}Optional: Remove environment file${NC}"
echo "  rm .env.self-hosted  # This will force regeneration of keys"
