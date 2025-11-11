# Self-Hosted Setup Architecture

## Initialization Flow

When starting the self-hosted Supabase instance, initialization happens in this order:

### 1. Role Creation (`01-init-roles.sql`)
- **Source**: `init-db-runtime.sql` (generated from `init-db.sql` with password substitution)
- **Purpose**: Creates all required PostgreSQL roles for Supabase services
- **Features**: 
  - Fully idempotent with `IF NOT EXISTS` checks
  - Creates: `supabase_admin`, `authenticator`, `anon`, `authenticated`, `service_role`, etc.
  - Sets up role permissions and grants

### 2. Schema Migrations (`02-run-migrations.sql`)
- **Source**: `migrations/00-init-migrations.sql`
- **Purpose**: Runs all application schema migrations in order
- **Includes**:
  - Core Supabase schemas (auth, storage, realtime) - minimal placeholders
  - Application schema (`00000000000005-app-schema.sql`) - app_role enum, user_roles, profiles, etc.

### 3. Supabase Internal Scripts (DISABLED)
- **File**: `migrate.sh` → Mounted as `/dev/null` to prevent execution
- **Reason**: The Supabase Docker image contains internal initialization scripts that attempt to create roles without idempotent checks
- **Issue**: Would cause "role already exists" errors since our `01-init-roles.sql` already created them
- **Solution**: Override with empty file to prevent double initialization

## Why This Approach?

1. **Full Control**: We manage all role creation and permissions explicitly
2. **Idempotency**: Can safely restart containers without conflicts
3. **Transparency**: All database setup is visible in our migration files
4. **Flexibility**: Can customize roles and permissions for specific needs

## Key Files

- `init-db.sql` - Template with role creation logic (has `__POSTGRES_PASSWORD__` placeholder)
- `init-db-runtime.sql` - Generated file with actual password (created by setup scripts)
- `migrations/00000000000005-app-schema.sql` - Application-specific tables and RLS policies
- `docker-compose.self-hosted.yml` - Orchestrates all services with proper initialization order

## Common Issues Solved

❌ **Problem**: `ERROR: role "supabase_admin" already exists`
✅ **Solution**: Disabled Supabase image's internal `migrate.sh` to prevent double role creation

❌ **Problem**: Migrations run before roles exist
✅ **Solution**: Alphabetical ordering ensures `01-init-roles.sql` runs before `02-run-migrations.sql`

❌ **Problem**: Permission denied errors
✅ **Solution**: Proper grants in `init-db.sql` for all schemas (auth, storage, public, etc.)
