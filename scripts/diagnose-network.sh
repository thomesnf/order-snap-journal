#!/bin/bash

# Diagnose network connectivity issues for self-hosted setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  Network Connectivity Diagnostics"
echo "=============================================="
echo ""

# Check if app container is running
echo -e "${BLUE}[1/6]${NC} Checking app container status..."
if docker ps | grep -q "order-snap-journal-app"; then
    echo -e "${GREEN}✓${NC} App container is running"
    
    # Get container IP and port
    APP_PORT=$(docker port order-snap-journal-app 80 2>/dev/null | cut -d: -f2 || echo "NOT MAPPED")
    echo "  Mapped to host port: $APP_PORT"
else
    echo -e "${RED}✗${NC} App container is NOT running!"
    echo ""
    echo "  Fix: Start the app container with:"
    echo "  sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
    exit 1
fi
echo ""

# Check nginx process inside container
echo -e "${BLUE}[2/6]${NC} Checking nginx inside container..."
NGINX_RUNNING=$(docker exec order-snap-journal-app pgrep nginx >/dev/null 2>&1 && echo "yes" || echo "no")
if [ "$NGINX_RUNNING" = "yes" ]; then
    echo -e "${GREEN}✓${NC} Nginx is running inside container"
else
    echo -e "${RED}✗${NC} Nginx is NOT running inside container!"
    echo "  Check logs: docker logs order-snap-journal-app"
fi
echo ""

# Check if port 80 is listening on host
echo -e "${BLUE}[3/6]${NC} Checking if port 80 is listening on host..."
if netstat -tuln 2>/dev/null | grep -q ":80 " || ss -tuln 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✓${NC} Port 80 is listening"
    
    # Check what's listening
    LISTEN_ADDRESS=$(ss -tuln 2>/dev/null | grep ":80 " | awk '{print $5}' | head -1 || echo "unknown")
    echo "  Listening on: $LISTEN_ADDRESS"
    
    if [[ "$LISTEN_ADDRESS" == "127.0.0.1:80" ]]; then
        echo -e "${YELLOW}⚠${NC}  WARNING: Only listening on localhost!"
        echo "  This means external connections will be refused."
        echo "  Check docker-compose port mapping."
    fi
else
    echo -e "${RED}✗${NC} Port 80 is NOT listening!"
    echo "  This means nothing is bound to port 80 on the host."
fi
echo ""

# Check firewall status
echo -e "${BLUE}[4/6]${NC} Checking firewall configuration..."
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep -i "Status:" | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        echo -e "${YELLOW}⚠${NC}  UFW firewall is active"
        
        if sudo ufw status | grep -q "80.*ALLOW"; then
            echo -e "${GREEN}✓${NC} Port 80 is allowed in UFW"
        else
            echo -e "${RED}✗${NC} Port 80 is NOT allowed in UFW!"
            echo ""
            echo "  Fix with: sudo ufw allow 80/tcp"
        fi
    else
        echo -e "${GREEN}✓${NC} UFW firewall is inactive"
    fi
elif command -v firewall-cmd >/dev/null 2>&1; then
    if sudo firewall-cmd --state 2>/dev/null | grep -q "running"; then
        echo -e "${YELLOW}⚠${NC}  firewalld is running"
        
        if sudo firewall-cmd --list-ports | grep -q "80/tcp"; then
            echo -e "${GREEN}✓${NC} Port 80 is allowed in firewalld"
        else
            echo -e "${RED}✗${NC} Port 80 is NOT allowed in firewalld!"
            echo ""
            echo "  Fix with:"
            echo "  sudo firewall-cmd --permanent --add-port=80/tcp"
            echo "  sudo firewall-cmd --reload"
        fi
    else
        echo -e "${GREEN}✓${NC} firewalld is not active"
    fi
else
    echo -e "${GREEN}✓${NC} No common firewall detected (ufw/firewalld)"
fi
echo ""

# Test local connection
echo -e "${BLUE}[5/6]${NC} Testing local connection to app..."
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "FAILED")
if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Local connection successful (HTTP $LOCAL_RESPONSE)"
elif [ "$LOCAL_RESPONSE" = "000" ] || [ "$LOCAL_RESPONSE" = "FAILED" ]; then
    echo -e "${RED}✗${NC} Local connection failed - can't reach nginx"
    echo "  Check: docker logs order-snap-journal-app"
else
    echo -e "${YELLOW}⚠${NC}  Local connection returned HTTP $LOCAL_RESPONSE"
fi
echo ""

# Get server IP addresses
echo -e "${BLUE}[6/6]${NC} Server network information..."
echo "Network interfaces:"
ip -4 addr show | grep -E "inet " | grep -v "127.0.0.1" | awk '{print "  "$2" ("$NF")"}' || \
    ifconfig 2>/dev/null | grep -E "inet " | grep -v "127.0.0.1" | awk '{print "  "$2}'

echo ""
echo "=============================================="
echo -e "${BLUE}  Summary & Recommendations${NC}"
echo "=============================================="
echo ""

# Provide specific recommendations
if docker ps | grep -q "order-snap-journal-app" && [ "$LOCAL_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} App is running and accessible locally"
    echo ""
    echo "If you still can't access from other PCs:"
    echo ""
    echo "1. Allow port 80 through firewall:"
    if command -v ufw >/dev/null 2>&1; then
        echo "   sudo ufw allow 80/tcp"
        echo "   sudo ufw reload"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        echo "   sudo firewall-cmd --permanent --add-port=80/tcp"
        echo "   sudo firewall-cmd --reload"
    else
        echo "   Configure your firewall to allow TCP port 80"
    fi
    echo ""
    echo "2. Verify the server IP from other PC:"
    echo "   The server should be accessible at: http://13.37.0.96"
    echo ""
    echo "3. Check router/network configuration:"
    echo "   - Ensure client PC can reach server's network"
    echo "   - Check for any network segmentation or VLANs"
    echo "   - Verify no router firewall is blocking"
else
    echo -e "${RED}✗${NC} App is not responding correctly"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check app logs: docker logs order-snap-journal-app"
    echo "2. Rebuild app: sudo docker-compose -f docker-compose.self-hosted.yml up -d --build app"
    echo "3. Check all containers: docker ps -a"
fi
echo ""
