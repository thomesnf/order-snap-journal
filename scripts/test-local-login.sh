#!/bin/bash

# Test login against LOCAL Supabase directly and through the app
# This verifies both the backend auth and frontend configuration

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Local Login Test"
echo "=============================================="
echo ""

# Load environment
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

source .env.self-hosted

# Get credentials
read -p "Enter email (default: admin@localhost): " EMAIL
EMAIL=${EMAIL:-admin@localhost}

read -sp "Enter password: " PASSWORD
echo ""
echo ""

echo -e "${BLUE}[1/4]${NC} Testing direct auth API (Kong)..."
echo "  Endpoint: http://localhost:8000/auth/v1/token"
echo ""

RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓${NC} Direct auth API works!"
    ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "  Access token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC} Direct auth API failed!"
    echo "  Response: $RESPONSE"
    echo ""
    echo "Common issues:"
    echo "  1. Wrong password"
    echo "  2. Email not confirmed in database"
    echo "  3. GoTrue service not running"
    exit 1
fi
echo ""

echo -e "${BLUE}[2/4]${NC} Checking user in database..."
USER_CONFIRMED=$(docker exec -i supabase-db psql -U postgres -t -c \
  "SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE email='$EMAIL';")

if [ "$USER_CONFIRMED" = " t" ]; then
    echo -e "${GREEN}✓${NC} User email is confirmed"
else
    echo -e "${RED}✗${NC} User email is NOT confirmed!"
    echo "  Fix with: docker exec -i supabase-db psql -U postgres -c \"UPDATE auth.users SET email_confirmed_at=now() WHERE email='$EMAIL';\""
    exit 1
fi
echo ""

echo -e "${BLUE}[3/4]${NC} Testing app container configuration..."
if docker ps | grep -q "order-snap-journal-app"; then
    APP_URL=$(docker exec order-snap-journal-app sh -c 'grep -o "http://[^\"]*" /usr/share/nginx/html/assets/index-*.js 2>/dev/null | head -1' || echo "NOT FOUND")
    
    echo "  Built-in Supabase URL: $APP_URL"
    
    if [ "$APP_URL" = "$VITE_SUPABASE_URL" ]; then
        echo -e "${GREEN}✓${NC} App is configured for local instance"
    else
        echo -e "${RED}✗${NC} App is configured for WRONG instance!"
        echo "  Expected: $VITE_SUPABASE_URL"
        echo "  Found: $APP_URL"
        echo ""
        echo "  Fix: sudo ./scripts/rebuild-app-local.sh"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} App container not running"
fi
echo ""

echo -e "${BLUE}[4/4]${NC} Testing browser login simulation..."
echo "  Simulating login from http://13.37.0.96..."

# Test if the app endpoint is accessible
APP_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://13.37.0.96/)
if [ "$APP_TEST" = "200" ]; then
    echo -e "${GREEN}✓${NC} App is accessible at http://13.37.0.96"
else
    echo -e "${RED}✗${NC} App is not accessible (HTTP $APP_TEST)"
fi
echo ""

echo "=============================================="
echo -e "${GREEN}  Test Complete!${NC}"
echo "=============================================="
echo ""
echo "If all tests passed, you should be able to:"
echo "  1. Open: http://13.37.0.96"
echo "  2. Login with: $EMAIL"
echo "  3. Access the app successfully"
echo ""
echo "If login still fails in browser:"
echo "  1. Check browser console (F12) for errors"
echo "  2. Clear browser cache and cookies"
echo "  3. Try incognito/private mode"
echo ""
