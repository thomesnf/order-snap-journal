#!/bin/bash

# Verify app connection to local self-hosted Supabase
# Tests both backend services and frontend configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Local Supabase Connection Verification"
echo "=============================================="
echo ""

# Load environment variables
if [ -f .env.self-hosted ]; then
    source .env.self-hosted
    echo -e "${GREEN}✓${NC} Loaded .env.self-hosted"
else
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

echo ""
echo "Environment Configuration:"
echo "  VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "  Expected: http://13.37.0.96:8000"
echo ""

# Test 1: Check if Docker containers are running
echo -e "${BLUE}[1/6]${NC} Checking Docker containers..."
if docker ps | grep -q "supabase"; then
    echo -e "${GREEN}✓${NC} Supabase containers are running:"
    docker ps --filter "name=supabase" --format "  - {{.Names}} ({{.Status}})"
else
    echo -e "${RED}✗${NC} No Supabase containers running!"
    echo "  Run: docker-compose -f docker-compose.self-hosted.yml up -d"
    exit 1
fi

# Test 2: Test Kong API Gateway
echo ""
echo -e "${BLUE}[2/6]${NC} Testing Kong API Gateway (http://13.37.0.96:8000)..."
if curl -s -o /dev/null -w "%{http_code}" http://13.37.0.96:8000 | grep -q "404\|200"; then
    echo -e "${GREEN}✓${NC} Kong API Gateway is accessible"
else
    echo -e "${RED}✗${NC} Cannot reach Kong API Gateway"
    exit 1
fi

# Test 3: Test GoTrue Auth endpoint
echo ""
echo -e "${BLUE}[3/6]${NC} Testing GoTrue Auth service..."
HEALTH_RESPONSE=$(curl -s http://13.37.0.96:8000/auth/v1/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✓${NC} GoTrue Auth service is healthy"
else
    echo -e "${YELLOW}⚠${NC} GoTrue response: $HEALTH_RESPONSE"
fi

# Test 4: Test REST API with anon key
echo ""
echo -e "${BLUE}[4/6]${NC} Testing REST API with anon key..."
REST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    http://13.37.0.96:8000/rest/v1/ \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY")

HTTP_CODE=$(echo "$REST_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} REST API responds successfully"
else
    echo -e "${RED}✗${NC} REST API returned HTTP $HTTP_CODE"
    echo "$REST_RESPONSE" | head -n-1
fi

# Test 5: Check if admin user exists in local database
echo ""
echo -e "${BLUE}[5/6]${NC} Checking admin user in local database..."
ADMIN_CHECK=$(docker exec -i supabase-db psql -U postgres -t -c \
    "SELECT email, email_confirmed_at IS NOT NULL as confirmed FROM auth.users WHERE email = 'admin@localhost';" 2>/dev/null || echo "")

if [ -n "$ADMIN_CHECK" ]; then
    echo -e "${GREEN}✓${NC} Admin user found:"
    echo "  $ADMIN_CHECK"
else
    echo -e "${RED}✗${NC} No admin@localhost user found in local database"
    echo "  Run: ./scripts/create-admin-simple.sh"
fi

# Test 6: Verify app container environment
echo ""
echo -e "${BLUE}[6/6]${NC} Checking app container environment variables..."
if docker ps | grep -q "app"; then
    APP_SUPABASE_URL=$(docker exec self-hosted-app-1 sh -c 'echo $VITE_SUPABASE_URL' 2>/dev/null || echo "")
    if [ "$APP_SUPABASE_URL" = "http://13.37.0.96:8000" ]; then
        echo -e "${GREEN}✓${NC} App container has correct VITE_SUPABASE_URL"
    else
        echo -e "${RED}✗${NC} App container VITE_SUPABASE_URL mismatch!"
        echo "  Found: $APP_SUPABASE_URL"
        echo "  Expected: http://13.37.0.96:8000"
        echo ""
        echo "  Fix: Rebuild app container with:"
        echo "  sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
    fi
else
    echo -e "${RED}✗${NC} App container not running!"
fi

# Summary
echo ""
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo ""
echo "Access points:"
echo "  • Frontend: http://13.37.0.96"
echo "  • API Gateway: http://13.37.0.96:8000"
echo "  • Supabase Studio: http://localhost:3000"
echo "  • Inbucket (Email): http://localhost:54324"
echo ""

# Final recommendations
if [ "$HTTP_CODE" = "200" ] && [ -n "$ADMIN_CHECK" ] && [ "$APP_SUPABASE_URL" = "http://13.37.0.96:8000" ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You should now be able to log in at http://13.37.0.96"
    echo "with admin@localhost and your password."
else
    echo -e "${YELLOW}⚠ Some issues detected${NC}"
    echo ""
    echo "Recommended actions:"
    [ -z "$ADMIN_CHECK" ] && echo "  1. Create admin user: ./scripts/create-admin-simple.sh"
    [ "$APP_SUPABASE_URL" != "http://13.37.0.96:8000" ] && echo "  2. Rebuild app: sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
fi

echo ""
