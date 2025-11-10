#!/bin/bash

# Switch app from Lovable Cloud to local self-hosted Supabase
# This script ensures the app uses local environment variables

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Switch to Local Self-Hosted Supabase"
echo "=============================================="
echo ""

# Check if .env.self-hosted exists
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

echo -e "${BLUE}Step 1:${NC} Stopping all containers..."
docker-compose -f docker-compose.self-hosted.yml down
echo -e "${GREEN}✓${NC} Containers stopped"

echo ""
echo -e "${BLUE}Step 2:${NC} Verifying environment configuration..."
source .env.self-hosted

echo "  VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY:0:50}..."
echo "  JWT_SECRET: ${JWT_SECRET:0:20}..."

if [ "$VITE_SUPABASE_URL" != "http://13.37.0.96:8000" ]; then
    echo -e "${RED}✗${NC} VITE_SUPABASE_URL is not set to local instance!"
    exit 1
fi
echo -e "${GREEN}✓${NC} Environment variables verified"

echo ""
echo -e "${BLUE}Step 3:${NC} Starting Supabase services..."
docker-compose -f docker-compose.self-hosted.yml up -d postgres kong auth rest realtime storage meta analytics
echo -e "${GREEN}✓${NC} Supabase services started"

echo ""
echo -e "${BLUE}Step 4:${NC} Waiting for services to be ready (30 seconds)..."
sleep 30
echo -e "${GREEN}✓${NC} Services should be ready"

echo ""
echo -e "${BLUE}Step 5:${NC} Building and starting app container..."
docker-compose -f docker-compose.self-hosted.yml up -d --build app
echo -e "${GREEN}✓${NC} App container started"

echo ""
echo -e "${BLUE}Step 6:${NC} Waiting for app to start (10 seconds)..."
sleep 10

echo ""
echo "=============================================="
echo -e "${GREEN}  Switch Complete!${NC}"
echo "=============================================="
echo ""
echo "Your app is now using the local self-hosted Supabase instance."
echo ""
echo "Access points:"
echo "  • Frontend: http://13.37.0.96"
echo "  • Supabase Studio: http://localhost:3000"
echo "  • API Gateway: http://13.37.0.96:8000"
echo ""
echo "Next steps:"
echo "  1. Verify connection: ./scripts/verify-local-connection.sh"
echo "  2. Create admin user if needed: ./scripts/create-admin-simple.sh"
echo "  3. Apply app schema: ./scripts/apply-app-schema.sh"
echo ""
