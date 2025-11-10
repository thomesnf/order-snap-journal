#!/bin/bash

# Fix GoTrue JWT_SECRET mismatch
# This ensures GoTrue uses the same JWT_SECRET as configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Fix GoTrue JWT Configuration"
echo "=============================================="
echo ""

# Load environment
if [ ! -f .env.self-hosted ]; then
    echo -e "${RED}✗${NC} .env.self-hosted not found!"
    exit 1
fi

source .env.self-hosted

echo -e "${BLUE}[1/4]${NC} Verifying JWT_SECRET in .env.self-hosted..."
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}✗${NC} JWT_SECRET not found!"
    exit 1
fi
echo -e "${GREEN}✓${NC} JWT_SECRET found: ${JWT_SECRET:0:10}..."
echo ""

echo -e "${BLUE}[2/4]${NC} Checking GoTrue container JWT_SECRET..."
GOTRUE_JWT=$(docker exec supabase-auth printenv GOTRUE_JWT_SECRET 2>/dev/null || echo "NOT_FOUND")
echo "  GoTrue JWT_SECRET: ${GOTRUE_JWT:0:10}..."
echo ""

if [ "$GOTRUE_JWT" != "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠${NC} JWT_SECRET mismatch detected!"
    echo "  .env.self-hosted: ${JWT_SECRET:0:10}..."
    echo "  GoTrue container: ${GOTRUE_JWT:0:10}..."
    echo ""
    echo -e "${BLUE}[3/4]${NC} Restarting all services with correct JWT_SECRET..."
    docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted down
    sleep 3
    docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d
    echo -e "${GREEN}✓${NC} Services restarted"
    echo ""
    
    echo -e "${BLUE}Waiting for services to be ready (30 seconds)...${NC}"
    sleep 30
else
    echo -e "${GREEN}✓${NC} JWT_SECRET matches"
    echo ""
    
    echo -e "${BLUE}[3/4]${NC} Restarting GoTrue service..."
    docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted restart auth
    sleep 10
    echo -e "${GREEN}✓${NC} GoTrue restarted"
    echo ""
fi

echo -e "${BLUE}[4/4]${NC} Verifying GoTrue is responding..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/auth/v1/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓${NC} GoTrue is responding"
else
    echo -e "${YELLOW}⚠${NC} GoTrue health check returned: $HEALTH_CHECK"
    echo "  Checking GoTrue logs..."
    docker logs --tail 20 supabase-auth
fi
echo ""

echo "=============================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Reset admin password: sudo ./scripts/reset-admin-password.sh"
echo "  2. Test login: sudo ./scripts/test-local-login.sh"
echo ""
