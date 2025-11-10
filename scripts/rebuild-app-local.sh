#!/bin/bash

# Quick script to rebuild ONLY the app container with local settings
# Use this after making frontend changes or when environment variables aren't taking effect

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Rebuild App for Local Instance"
echo "=============================================="
echo ""

# Check if .env.self-hosted exists
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

# Show current configuration
echo -e "${BLUE}Step 1:${NC} Verifying local configuration..."
source .env.self-hosted
echo "  VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
echo ""

# Stop and remove old app container
echo -e "${BLUE}Step 2:${NC} Stopping old app container..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted stop app 2>/dev/null || true
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted rm -f app 2>/dev/null || true
docker rmi order-snap-journal-app 2>/dev/null || true
echo -e "${GREEN}✓${NC} Old container removed"
echo ""

# Build with explicit environment variables
echo -e "${BLUE}Step 3:${NC} Building app with local settings..."
echo -e "${YELLOW}⚠${NC} This will take a few minutes..."
echo ""
echo "Build arguments:"
echo "  VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY:0:20}..."
echo "  VITE_SUPABASE_PROJECT_ID=local"
echo ""

docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted build --no-cache app

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Build failed!"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build complete"
echo ""

# Start the app container
echo -e "${BLUE}Step 4:${NC} Starting app container..."
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d app
echo -e "${GREEN}✓${NC} App container started"
echo ""

# Wait for app to start
echo -e "${BLUE}Step 5:${NC} Waiting for app to start (15 seconds)..."
sleep 15

# Verify the environment variables in the running container
echo ""
echo -e "${BLUE}Step 6:${NC} Verifying container configuration..."
echo ""
echo "Checking environment variables inside container:"
docker exec order-snap-journal-app sh -c 'cat /etc/nginx/conf.d/default.conf' 2>/dev/null | head -20
echo ""

echo "=============================================="
echo -e "${GREEN}  Rebuild Complete!${NC}"
echo "=============================================="
echo ""
echo "Access your local app:"
echo "  🌐 Frontend: http://13.37.0.96"
echo "  🔐 Login: admin@localhost"
echo ""
echo "Run verification:"
echo "  sudo ./scripts/verify-local-connection.sh"
echo ""
