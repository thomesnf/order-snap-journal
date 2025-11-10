#!/bin/bash

# Apply Supabase migrations to create auth, storage, and other required tables
set -e

echo "============================================"
echo "Applying Supabase Migrations"
echo "============================================"
echo ""

# Check if migration files exist
if [ ! -d "migrations" ]; then
    echo "ERROR: migrations directory not found"
    exit 1
fi

# Check if database container is running
if ! docker ps | grep -q supabase-db; then
    echo "ERROR: supabase-db container is not running"
    echo "Start it with: docker-compose -f docker-compose.self-hosted.yml up -d"
    exit 1
fi

echo "Applying migrations to database..."
echo ""

# Apply each migration file in order
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying: $(basename $migration)"
        docker exec -i supabase-db psql -U postgres -d postgres < "$migration"
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Success"
        else
            echo "  ❌ Failed"
            exit 1
        fi
        echo ""
    fi
done

echo "============================================"
echo "✅ All migrations applied successfully!"
echo "============================================"
echo ""
echo "You can now create the admin user:"
echo "  sudo ./scripts/create-first-admin.sh"
