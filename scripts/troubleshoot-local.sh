#!/bin/bash

# Troubleshooting script for local Supabase setup
# This script verifies the entire local setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Local Supabase Troubleshooting Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 1. Check if containers are running
echo -e "${BLUE}1. Checking Docker containers...${NC}"
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}" | grep -E "(NAMES|supabase)"
echo ""

# 2. Check environment variables
echo -e "${BLUE}2. Checking environment variables in .env.self-hosted...${NC}"
if [ -f .env.self-hosted ]; then
    echo -e "${GREEN}✓ .env.self-hosted exists${NC}"
    echo "VITE_SUPABASE_URL: $(grep VITE_SUPABASE_URL .env.self-hosted | cut -d '=' -f2)"
    echo "SITE_URL: $(grep '^SITE_URL' .env.self-hosted | cut -d '=' -f2)"
    echo "API_EXTERNAL_URL: $(grep API_EXTERNAL_URL .env.self-hosted | cut -d '=' -f2)"
else
    echo -e "${RED}✗ .env.self-hosted not found!${NC}"
fi
echo ""

# 3. Check if users exist in LOCAL database
echo -e "${BLUE}3. Checking users in LOCAL database...${NC}"
echo "Running: docker exec -it supabase-db psql -U postgres -c \"SELECT email, created_at FROM auth.users;\""
docker exec -it supabase-db psql -U postgres -c "SELECT email, created_at, email_confirmed_at FROM auth.users;"
echo ""

# 4. Check if admin role exists
echo -e "${BLUE}4. Checking admin roles in LOCAL database...${NC}"
docker exec -it supabase-db psql -U postgres -c "SELECT u.email, ur.role FROM auth.users u JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role = 'admin';"
echo ""

# 5. Check Kong is accessible
echo -e "${BLUE}5. Testing Kong API Gateway (port 8000)...${NC}"
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Kong is accessible on port 8000${NC}"
else
    echo -e "${RED}✗ Kong is NOT accessible on port 8000${NC}"
fi
echo ""

# 6. Check if app container has correct env vars
echo -e "${BLUE}6. Checking app container build args...${NC}"
echo "To verify, rebuild the app with:"
echo "sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
echo ""

# 7. Provide access URLs
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Access URLs (use these, NOT Lovable preview):${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Frontend App:${NC}     http://13.37.0.96"
echo -e "${GREEN}Supabase Studio:${NC}  http://13.37.0.96:3001"
echo -e "${GREEN}API Gateway:${NC}      http://13.37.0.96:8000"
echo ""

# 8. Check what the frontend is actually connecting to
echo -e "${BLUE}============================================${NC}"
echo -e "${YELLOW}IMPORTANT: The Lovable preview (right side) will ALWAYS connect to Lovable Cloud.${NC}"
echo -e "${YELLOW}You MUST access http://13.37.0.96 in a separate browser to test your local instance.${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 9. Provide next steps
echo -e "${BLUE}Next steps if issues persist:${NC}"
echo "1. Verify you're accessing http://13.37.0.96 (NOT the Lovable preview)"
echo "2. If no users found, run: sudo ./scripts/create-admin-direct.sh"
echo "3. If users exist but login fails, rebuild app: sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
echo "4. Check auth logs: sudo docker logs supabase-auth"
echo "5. Check app logs: sudo docker logs order-snap-journal-app-1"
echo ""
