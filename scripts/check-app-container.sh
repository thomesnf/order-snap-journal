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

echo -e "${BLUE}Container Status:${NC}"
docker ps -a | grep "order-snap-journal-app" || echo "Container not found"
echo ""

echo -e "${BLUE}Last 30 lines of container logs:${NC}"
docker logs --tail 30 order-snap-journal-app 2>&1 || echo "Could not get logs"
echo ""

echo -e "${BLUE}Checking if Nginx is running inside container:${NC}"
docker exec order-snap-journal-app ps aux | grep nginx || echo "Nginx not running"
echo ""

echo -e "${BLUE}Checking if files exist in container:${NC}"
docker exec order-snap-journal-app ls -la /usr/share/nginx/html/ | head -10 || echo "Cannot access container files"
echo ""

echo -e "${BLUE}Checking nginx config:${NC}"
docker exec order-snap-journal-app nginx -t 2>&1 || echo "Cannot test nginx config"
echo ""
