#!/bin/bash

# Quick script to check app container status and logs

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  App Container Status Check"
echo "=============================================="
echo ""

# Get the actual container name (Docker Compose may add suffix)
CONTAINER_NAME=$(docker ps -a --filter "name=order-snap-journal-app" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${RED}✗${NC} No app container found!"
    echo ""
    echo "Available containers:"
    docker ps -a
    exit 1
fi

echo -e "${BLUE}Container Name:${NC} $CONTAINER_NAME"
echo ""

echo -e "${BLUE}Container Status:${NC}"
docker ps -a --filter "name=order-snap-journal-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${BLUE}Last 30 lines of container logs:${NC}"
docker logs --tail 30 "$CONTAINER_NAME" 2>&1 || echo "Could not get logs"
echo ""

echo -e "${BLUE}Checking if Nginx is running inside container:${NC}"
docker exec "$CONTAINER_NAME" ps aux 2>/dev/null | grep nginx || echo "Nginx not running or cannot access container"
echo ""

echo -e "${BLUE}Checking if files exist in container:${NC}"
docker exec "$CONTAINER_NAME" ls -la /usr/share/nginx/html/ 2>/dev/null | head -10 || echo "Cannot access container files"
echo ""

echo -e "${BLUE}Checking nginx config:${NC}"
docker exec "$CONTAINER_NAME" nginx -t 2>&1 || echo "Cannot test nginx config"
echo ""

echo -e "${BLUE}Checking container exit code (if stopped):${NC}"
docker inspect "$CONTAINER_NAME" --format='Exit Code: {{.State.ExitCode}}, Error: {{.State.Error}}' 2>&1 || echo "Cannot inspect"
echo ""
