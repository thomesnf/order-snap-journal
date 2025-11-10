#!/bin/bash

# Check GoTrue authentication logs for errors

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  GoTrue Authentication Logs"
echo "=============================================="
echo ""

echo -e "${BLUE}Recent GoTrue logs:${NC}"
echo ""
docker logs --tail 50 supabase-auth 2>&1 | grep -i -E "(error|password|auth|jwt|secret|invalid|failed)" || echo "No auth-related errors found"

echo ""
echo "=============================================="
echo "Full logs (last 30 lines):"
echo "=============================================="
docker logs --tail 30 supabase-auth 2>&1

echo ""
echo ""
echo "To follow logs in real-time:"
echo "  docker logs -f supabase-auth"
echo ""
