#!/bin/bash

# Complete setup script for self-hosted Supabase
set -e

echo "============================================"
echo "Supabase Self-Hosted Setup"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p migrations

# Make scripts executable
chmod +x scripts/generate-keys.sh 2>/dev/null || true
chmod +x scripts/migrate-schema.sh 2>/dev/null || true
chmod +x scripts/cleanup-self-hosted.sh 2>/dev/null || true

# Check for port conflicts
echo ""
echo -e "${BLUE}Checking port availability...${NC}"
PORTS="80 3000 3001 4000 4001 4040 5000 5001 8000 8080 9000 9999"
PORT_CONFLICTS=""

for PORT in $PORTS; do
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo -e "${RED}✗ Port $PORT is already in use${NC}"
        PORT_CONFLICTS="yes"
    fi
done

if [ -n "$PORT_CONFLICTS" ]; then
    echo ""
    echo -e "${RED}ERROR: Some required ports are in use${NC}"
    echo -e "${YELLOW}Run the following to see what's using the ports:${NC}"
    echo "  sudo lsof -i :<port_number>"
    echo ""
    echo -e "${YELLOW}Or run cleanup script to remove old containers:${NC}"
    echo "  ./scripts/cleanup-self-hosted.sh"
    exit 1
fi

echo -e "${GREEN}✓ All required ports are available${NC}"

# Generate keys if .env.self-hosted doesn't exist
if [ ! -f .env.self-hosted ]; then
    echo -e "${YELLOW}Generating secrets...${NC}"
    ./scripts/generate-keys.sh > .env.self-hosted
    echo -e "${GREEN}✓ Secrets generated and saved to .env.self-hosted${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Review and update .env.self-hosted before proceeding${NC}"
    echo "Press Enter to continue once you've reviewed the file..."
    read
else
    echo -e "${GREEN}✓ Using existing .env.self-hosted${NC}"
fi

# Load and validate environment variables
if [ -f .env.self-hosted ]; then
    # Display the file contents for debugging
    echo -e "${YELLOW}Checking .env.self-hosted contents:${NC}"
    cat .env.self-hosted | grep -E '^[A-Z_]+=' || echo -e "${RED}No valid KEY=VALUE pairs found!${NC}"
    echo ""
    
    # Filter out any lines that don't match KEY=value format
    export $(cat .env.self-hosted | grep -E '^[A-Z_]+=' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
    
    # Verify critical variables are set
    if [ -z "$POSTGRES_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}ERROR: Critical environment variables are missing!${NC}"
        echo "Please delete .env.self-hosted and run this script again:"
        echo "  rm .env.self-hosted"
        echo "  bash scripts/setup-self-hosted.sh"
        exit 1
    fi
else
    echo -e "${RED}ERROR: .env.self-hosted file not found${NC}"
    echo "Please ensure .env.self-hosted exists with all required variables"
    exit 1
fi

# Replace password placeholder in init-db.sql
echo ""
echo -e "${BLUE}Preparing database initialization script...${NC}"
# Remove any existing runtime file first
rm -f init-db-runtime.sql
# Create a working copy with the password substituted (using | as delimiter to handle special chars)
sed "s|__POSTGRES_PASSWORD__|${POSTGRES_PASSWORD}|g" init-db.sql > init-db-runtime.sql
# Verify the file was created
if [ ! -f init-db-runtime.sql ]; then
  echo -e "${RED}ERROR: Failed to create init-db-runtime.sql${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Database script prepared${NC}"
echo -e "${BLUE}First 20 lines of init-db-runtime.sql:${NC}"
head -n 20 init-db-runtime.sql

# Clean up any existing containers AND volumes (critical for fixing corrupted data)
echo ""
echo -e "${BLUE}Cleaning up existing containers and volumes...${NC}"
echo -e "${YELLOW}⚠️  This will delete all existing database data!${NC}"

# Stop containers and remove volumes
docker-compose -f docker-compose.self-hosted.yml down -v --remove-orphans 2>/dev/null || true

# Extra cleanup for any orphaned volumes
docker volume rm order-snap-journal_postgres-data 2>/dev/null || echo "  (no old postgres volume found)"
docker volume rm order-snap-journal_storage-data 2>/dev/null || echo "  (no old storage volume found)"

echo -e "${GREEN}✓ Cleanup complete${NC}"

# Start services
echo ""
echo -e "${BLUE}Starting Supabase services with fresh volumes...${NC}"
docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d --force-recreate

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check if services are running and show logs on failure
if ! docker-compose -f docker-compose.self-hosted.yml ps | grep -q "Up"; then
    echo -e "${RED}ERROR: Some services failed to start${NC}"
    echo ""
    echo -e "${YELLOW}Checking database logs:${NC}"
    docker logs supabase-db 2>&1 | tail -50
    echo ""
    echo -e "${RED}Setup failed. Check the logs above for details.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All services started successfully${NC}"
echo ""

# Ask if user wants to migrate data
echo -e "${YELLOW}Do you want to migrate data from Lovable Cloud? (y/n)${NC}"
read -r MIGRATE

if [ "$MIGRATE" = "y" ]; then
    echo ""
    echo -e "${BLUE}Migrating data from Lovable Cloud...${NC}"
    ./scripts/migrate-schema.sh
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Services running:${NC}"
echo "  • Frontend:         http://localhost"
echo "  • Supabase API:     http://localhost:8000"
echo "  • Supabase Studio:  http://localhost:3001"
echo "  • Email Testing:    http://localhost:9000"
echo "  • PostgreSQL:       localhost:5432"
echo ""
echo -e "${YELLOW}Default credentials:${NC}"
echo "  • Database: postgres / (see POSTGRES_PASSWORD in .env.self-hosted)"
echo ""
echo -e "${YELLOW}To create your first admin user:${NC}"
echo "  1. Go to http://localhost:3001"
echo "  2. Navigate to Authentication → Users"
echo "  3. Create a new user"
echo "  4. Add admin role in user_roles table"
echo ""
echo -e "${YELLOW}To stop services:${NC}"
echo "  docker-compose -f docker-compose.self-hosted.yml down"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  docker-compose -f docker-compose.self-hosted.yml logs -f"
