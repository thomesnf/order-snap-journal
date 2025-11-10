#!/bin/bash

# Diagnose .env configuration issues
# Check if the app is properly configured for local instance

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Environment Configuration Diagnosis"
echo "=============================================="
echo ""

# Check .env file
echo -e "${BLUE}[1/4]${NC} Checking .env file..."
if [ -f .env ]; then
    echo -e "${GREEN}  ✓${NC} .env file exists"
    echo ""
    echo "  Current .env content:"
    cat .env | sed 's/^/    /'
    echo ""
else
    echo -e "${RED}  ✗${NC} .env file not found!"
fi

# Check .env.self-hosted file
echo -e "${BLUE}[2/4]${NC} Checking .env.self-hosted file..."
if [ -f .env.self-hosted ]; then
    echo -e "${GREEN}  ✓${NC} .env.self-hosted file exists"
    echo ""
    echo "  Expected values from .env.self-hosted:"
    grep "^VITE_" .env.self-hosted | sed 's/^/    /'
    echo ""
else
    echo -e "${RED}  ✗${NC} .env.self-hosted file not found!"
fi

# Check if app container is running
echo -e "${BLUE}[3/4]${NC} Checking app container..."
if docker ps | grep -q "order-snap-journal-app"; then
    echo -e "${GREEN}  ✓${NC} App container is running"
    echo ""
    echo "  Environment variables inside app container:"
    docker exec order-snap-journal-app sh -c 'env | grep VITE_' | sed 's/^/    /'
    echo ""
else
    echo -e "${YELLOW}  ⚠${NC} App container is not running"
fi

# Compare values
echo -e "${BLUE}[4/4]${NC} Comparing configurations..."
if [ -f .env ] && [ -f .env.self-hosted ]; then
    source .env.self-hosted
    EXPECTED_URL=$VITE_SUPABASE_URL
    
    ACTUAL_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d '=' -f2)
    
    if [ "$EXPECTED_URL" == "$ACTUAL_URL" ]; then
        echo -e "${GREEN}  ✓${NC} .env matches .env.self-hosted"
    else
        echo -e "${RED}  ✗${NC} Mismatch detected!"
        echo "    Expected: $EXPECTED_URL"
        echo "    Found:    $ACTUAL_URL"
    fi
    echo ""
fi

echo "=============================================="
echo "  Diagnosis Complete"
echo "=============================================="
echo ""
echo "If there are mismatches:"
echo "  1. Run: cp .env.self-hosted .env"
echo "  2. Then: sudo docker-compose -f docker-compose.self-hosted.yml build --no-cache app"
echo "  3. Finally: sudo docker-compose -f docker-compose.self-hosted.yml up -d app"
echo ""
