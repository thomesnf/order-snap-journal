-- Early initialization - runs as postgres superuser
-- Only create extensions here, roles are created by migrations

-- Enable required PostgreSQL extensions (as postgres superuser)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

RAISE NOTICE 'Extensions created successfully';
