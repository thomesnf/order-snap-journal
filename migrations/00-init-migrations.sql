-- Migration runner script for /migrations/
-- This script runs AFTER init-db-runtime.sql (01-init-roles.sql) and applies all migrations in order
-- FULLY IDEMPOTENT - safe to run multiple times
-- Migrations are mounted to /migrations/ (NOT in entrypoint dir) to prevent double execution

\echo '============================================'
\echo 'Running Supabase Migrations'
\echo '============================================'

-- Migration 00: Initial schema (publications only, roles already created by 01-init-roles.sql)
\ir /migrations/00000000000000-initial-schema.sql

-- Migration 01: Auth schema
\ir /migrations/00000000000001-auth-schema.sql

-- Migration 02: Storage schema
\ir /migrations/00000000000002-storage-schema.sql

-- Migration 03: Realtime schema
\ir /migrations/00000000000003-realtime-schema.sql

-- Migration 04: Additional schemas
\ir /migrations/00000000000004-additional-schemas.sql

-- Migration 05: App schema
\ir /migrations/00000000000005-app-schema.sql

\echo '============================================'
\echo 'All migrations completed successfully'
\echo '============================================'
