# Complete Self-Hosting Guide

This guide will help you set up a fully self-hosted instance of the Order Journal application with local Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Setup](#manual-setup)
4. [Data Migration](#data-migration)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

- **Docker** (20.10+) and **Docker Compose** (2.0+)
  ```bash
  docker --version
  docker-compose --version
  ```

- **PostgreSQL Client Tools** (for migrations)
  ```bash
  # Ubuntu/Debian
  sudo apt-get install postgresql-client
  
  # macOS
  brew install postgresql
  
  # Windows
  # Download from https://www.postgresql.org/download/windows/
  ```

- **Node.js** (16+) - Optional, for generating JWT tokens
  ```bash
  node --version
  ```

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Disk**: 20GB free space
- **Network**: Ports 80, 443, 5432, 8000, 3001, 9000 available

---

## Quick Start

The fastest way to get started:

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Run setup script
./scripts/setup-self-hosted.sh
```

This will:
- Generate secure keys and tokens
- Start all Supabase services
- Optionally migrate data from Lovable Cloud
- Create initial admin user

**That's it!** Your self-hosted instance is ready at:
- Frontend: http://localhost
- Supabase Studio: http://localhost:3001
- Email Testing: http://localhost:9000

---

## Manual Setup

If you prefer step-by-step control:

### Step 1: Generate Secrets

```bash
# Generate all required secrets
./scripts/generate-keys.sh > .env.self-hosted

# Review and customize if needed
nano .env.self-hosted
```

You'll see output like:
```bash
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTGRES_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxx
LOGFLARE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Step 2: Start Services

```bash
# Start all services in background
docker-compose -f docker-compose.self-hosted.yml up -d

# Check status
docker-compose -f docker-compose.self-hosted.yml ps

# View logs
docker-compose -f docker-compose.self-hosted.yml logs -f
```

### Step 3: Verify Services

Wait about 30 seconds for all services to be healthy, then check:

```bash
# Check PostgreSQL
docker-compose -f docker-compose.self-hosted.yml exec postgres pg_isready

# Check Kong API Gateway
curl http://localhost:8000

# Check Auth
curl http://localhost:8000/auth/v1/health
```

### Step 4: Access Supabase Studio

Open http://localhost:3001 in your browser. You should see the Supabase Studio interface.

---

## Data Migration

### Option A: Fresh Start

If starting fresh with no existing data:

1. Access Studio at http://localhost:3001
2. Go to SQL Editor
3. Run initialization queries:
   ```sql
   -- Your table creation scripts
   -- Copy from Lovable Cloud or write from scratch
   ```

### Option B: Migrate from Lovable Cloud

If you have existing data in Lovable Cloud:

```bash
# Ensure your .env file has Lovable Cloud credentials
./scripts/migrate-schema.sh
```

This script will:
1. Export schema from Lovable Cloud
2. Export data from Lovable Cloud
3. Import schema to local Supabase
4. Import data to local Supabase

**Important:** The migration preserves:
- All table structures
- Row Level Security policies
- Database functions
- Storage buckets
- User data (excluding passwords - users must reset)

---

## Configuration

### Environment Variables

Edit `.env.self-hosted` to customize:

```bash
# Security
POSTGRES_PASSWORD=change-this-password
JWT_SECRET=change-this-secret

# Email (optional - uses Inbucket by default)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Storage (optional - uses local files by default)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket
```

### Frontend Configuration

Update your frontend `.env`:

```bash
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-.env.self-hosted>
```

### Custom Domain

To use a custom domain:

1. Update Kong configuration in `kong.yml`
2. Set up reverse proxy (nginx/traefik)
3. Configure SSL certificates

Example nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

---

## Creating Admin User

### Via Supabase Studio

1. Go to http://localhost:3001
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Fill in:
   - Email: admin@localhost
   - Password: (choose strong password)
   - Auto Confirm User: ✓
5. Copy the User ID
6. Go to **Table Editor** → **user_roles**
7. Insert row:
   - user_id: (paste copied ID)
   - role: admin

### Via SQL

```bash
# Connect to database
docker-compose -f docker-compose.self-hosted.yml exec postgres psql -U postgres

# In psql:
\c postgres

-- Create user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role
) VALUES (
  gen_random_uuid(),
  'admin@localhost',
  crypt('your-password', gen_salt('bf')),
  now(),
  '{"full_name":"Admin User"}',
  'authenticated'
);

-- Get user ID
SELECT id FROM auth.users WHERE email = 'admin@localhost';

-- Grant admin role (replace <user-id> with actual ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-id>', 'admin');
```


---

## Cleanup and Reset

If you need to completely remove the self-hosted setup and start fresh:

```bash
# Run the cleanup script
./scripts/cleanup-self-hosted.sh
```

This will:
- Stop all containers
- Remove all volumes (⚠️ **destroys all data**)
- Remove networks
- Prune Docker system
- Check for port conflicts

After cleanup, you can start fresh:
```bash
./scripts/setup-self-hosted.sh
```

---


## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.self-hosted.yml logs

# Common issues:
# 1. Port conflicts
sudo lsof -i :8000  # Check what's using port 8000
# Solution: Stop conflicting service or change port

# 2. Permission issues
ls -la /var/lib/docker/volumes/
# Solution: Fix Docker volume permissions

# 3. Memory issues
docker stats
# Solution: Increase Docker memory limit
```

### Cannot Connect to Database

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.self-hosted.yml ps postgres

# Check logs
docker-compose -f docker-compose.self-hosted.yml logs postgres

# Test connection
docker-compose -f docker-compose.self-hosted.yml exec postgres psql -U postgres -c "SELECT 1"
```

### Auth Not Working

```bash
# Check GoTrue logs
docker-compose -f docker-compose.self-hosted.yml logs auth

# Verify JWT secret matches
grep JWT_SECRET .env.self-hosted

# Test auth endpoint
curl http://localhost:8000/auth/v1/health
```

### Storage Upload Fails

```bash
# Check storage logs
docker-compose -f docker-compose.self-hosted.yml logs storage

# Verify volume permissions
docker-compose -f docker-compose.self-hosted.yml exec storage ls -la /var/lib/storage

# Test storage endpoint
curl http://localhost:8000/storage/v1/
```

### Email Not Sending

```bash
# Check Inbucket (local email testing)
open http://localhost:9000

# For real SMTP, verify settings in .env.self-hosted
docker-compose -f docker-compose.self-hosted.yml logs auth | grep SMTP
```

---

## Maintenance

### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.self-hosted.yml exec postgres \
  pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql

# Restore backup
cat backup-20250101.sql | \
  docker-compose -f docker-compose.self-hosted.yml exec -T postgres \
  psql -U postgres postgres
```

### Update Services

```bash
# Pull latest images
docker-compose -f docker-compose.self-hosted.yml pull

# Restart services
docker-compose -f docker-compose.self-hosted.yml up -d

# Remove old images
docker image prune -a
```

### Monitor Resources

```bash
# View resource usage
docker stats

# View disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.self-hosted.yml logs

# Follow specific service
docker-compose -f docker-compose.self-hosted.yml logs -f postgres

# Save logs to file
docker-compose -f docker-compose.self-hosted.yml logs > logs.txt
```

---

## Production Recommendations

### Security

1. **Change all default passwords** in `.env.self-hosted`
2. **Enable HTTPS** using Let's Encrypt:
   ```bash
   # Use traefik or nginx with certbot
   ```
3. **Set up firewall**:
   ```bash
   # Only expose ports 80 and 443
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
4. **Regular security updates**:
   ```bash
   # Update Docker images monthly
   docker-compose -f docker-compose.self-hosted.yml pull
   ```

### Performance

1. **Increase PostgreSQL resources** in `docker-compose.self-hosted.yml`:
   ```yaml
   postgres:
     deploy:
       resources:
         limits:
           memory: 2G
   ```

2. **Enable PostgreSQL connection pooling**
3. **Configure CDN** for static assets
4. **Set up Redis** for caching (optional)

### Backups

1. **Automated daily backups**:
   ```bash
   # Add to crontab
   0 2 * * * /path/to/backup-script.sh
   ```

2. **Off-site backup storage**:
   ```bash
   # Sync to S3/B2
   rclone sync /backups remote:backups
   ```

3. **Test restores monthly**

---

## Getting Help

- **Documentation**: https://supabase.com/docs
- **Community**: https://github.com/supabase/supabase/discussions
- **Issues**: Create issue in your project repository

---

## Next Steps

Once your self-hosted instance is running:

1. ✅ Create admin user
2. ✅ Configure custom domain
3. ✅ Set up SSL certificates
4. ✅ Configure automated backups
5. ✅ Set up monitoring
6. ✅ Invite team members
7. ✅ Migrate production data
