#!/bin/bash

# Export schema from Lovable Cloud and import to local Supabase
# This script requires pg_dump and psql to be installed

set -e

echo "============================================"
echo "Supabase Schema Migration Tool"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}ERROR: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

# Lovable Cloud database connection (from .env)
CLOUD_DB_URL="${SUPABASE_DB_URL}"

# Local database connection
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"
LOCAL_DB_NAME="postgres"
LOCAL_DB_USER="postgres"

# Load local password
if [ -f .env.self-hosted ]; then
    export $(cat .env.self-hosted | grep POSTGRES_PASSWORD | xargs)
else
    echo -e "${RED}ERROR: .env.self-hosted file not found${NC}"
    echo "Please create it from .env.self-hosted.example"
    exit 1
fi

LOCAL_DB_PASSWORD="${POSTGRES_PASSWORD}"

echo -e "${YELLOW}Step 1: Exporting schema from Lovable Cloud...${NC}"

# Export only schema (no data)
pg_dump "$CLOUD_DB_URL" \
    --schema-only \
    --no-owner \
    --no-acl \
    --schema=public \
    --schema=storage \
    --file=./migrations/lovable-cloud-schema.sql

echo -e "${GREEN}✓ Schema exported to ./migrations/lovable-cloud-schema.sql${NC}"
echo ""

echo -e "${YELLOW}Step 2: Exporting data from Lovable Cloud...${NC}"

# Export data only (excluding auth tables which are managed by GoTrue)
pg_dump "$CLOUD_DB_URL" \
    --data-only \
    --no-owner \
    --no-acl \
    --schema=public \
    --exclude-table='auth.*' \
    --file=./migrations/lovable-cloud-data.sql

echo -e "${GREEN}✓ Data exported to ./migrations/lovable-cloud-data.sql${NC}"
echo ""

echo -e "${YELLOW}Step 3: Importing schema to local Supabase...${NC}"

# Wait for local database to be ready
echo "Waiting for local database to be ready..."
for i in {1..30}; do
    if PGPASSWORD="$LOCAL_DB_PASSWORD" psql -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}ERROR: Database not ready after 30 seconds${NC}"
        exit 1
    fi
    sleep 1
done

# Import schema
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
    -h "$LOCAL_DB_HOST" \
    -p "$LOCAL_DB_PORT" \
    -U "$LOCAL_DB_USER" \
    -d "$LOCAL_DB_NAME" \
    -f ./migrations/lovable-cloud-schema.sql

echo -e "${GREEN}✓ Schema imported${NC}"
echo ""

echo -e "${YELLOW}Step 4: Importing data to local Supabase...${NC}"

# Import data
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
    -h "$LOCAL_DB_HOST" \
    -p "$LOCAL_DB_PORT" \
    -U "$LOCAL_DB_USER" \
    -d "$LOCAL_DB_NAME" \
    -f ./migrations/lovable-cloud-data.sql

echo -e "${GREEN}✓ Data imported${NC}"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Migration completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your frontend .env to point to local Supabase:"
echo "   VITE_SUPABASE_URL=http://localhost:8000"
echo "   VITE_SUPABASE_ANON_KEY=<your-local-anon-key>"
echo ""
echo "2. Access Supabase Studio at http://localhost:3001"
echo ""
echo "3. Test email at http://localhost:9000 (Inbucket)"
