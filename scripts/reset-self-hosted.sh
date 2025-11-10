#!/bin/bash
set -e

echo "=========================================="
echo "Reset Self-Hosted Supabase Installation"
echo "=========================================="
echo ""
echo "WARNING: This will delete all data!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Stop all containers
echo "Stopping all containers..."
docker-compose -f docker-compose.self-hosted.yml down

# Remove volumes (this deletes all data)
echo "Removing volumes..."
docker volume rm order-snap-journal_postgres-data 2>/dev/null || true
docker volume rm order-snap-journal_storage-data 2>/dev/null || true

# Remove any orphaned containers
echo "Cleaning up..."
docker-compose -f docker-compose.self-hosted.yml rm -f

echo ""
echo "✅ Reset complete!"
echo ""
echo "Next steps:"
echo "1. Start services: docker-compose -f docker-compose.self-hosted.yml up -d"
echo "2. Wait 30 seconds for initialization"
echo "3. Create admin user: sudo ./scripts/create-first-admin.sh"
