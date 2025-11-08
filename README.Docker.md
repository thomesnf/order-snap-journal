# Docker Deployment Guide

This guide explains how to deploy the Order Management System on your own private server using Docker.

**📱 For complete deployment including Android APK, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

## ⚠️ Important: Admin Setup First

**Before deploying, you MUST create an admin user.** See `ADMIN_SETUP.md` for detailed instructions.

Quick summary:
1. Create user via Lovable Cloud backend
2. Run SQL to grant admin role
3. Then proceed with Docker deployment

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM available
- Port 80, 3000, 5432, 9999, and 5000 available

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd order-snap-journal
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your secure passwords and keys
   ```

3. **Generate secure keys**
   ```bash
   # Generate a secure JWT secret (at least 32 characters)
   openssl rand -base64 32
   
   # Generate a secure PostgreSQL password
   openssl rand -base64 24
   ```

4. **Build and start services**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost
   - API: http://localhost:3000
   - Auth: http://localhost:9999

## Services

The Docker setup includes:
- **app**: React frontend (Nginx)
- **supabase-db**: PostgreSQL database
- **supabase-api**: PostgREST API server
- **supabase-auth**: GoTrue authentication server
- **supabase-storage**: File storage service

## Database Setup

After starting the containers, run the database migrations:

```bash
# Access the database
docker-compose exec supabase-db psql -U postgres

# Run your migration SQL files
\i /path/to/your/migration.sql
```

## Backup and Restore

### Backup Database
```bash
docker-compose exec supabase-db pg_dump -U postgres postgres > backup.sql
```

### Restore Database
```bash
docker-compose exec -T supabase-db psql -U postgres postgres < backup.sql
```

### Backup Volumes
```bash
docker run --rm -v order-snap-journal_db-data:/data -v $(pwd):/backup ubuntu tar czf /backup/db-backup.tar.gz /data
docker run --rm -v order-snap-journal_storage-data:/data -v $(pwd):/backup ubuntu tar czf /backup/storage-backup.tar.gz /data
```

## Monitoring

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f supabase-db
```

## Troubleshooting

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

### Check service health
```bash
docker-compose ps
```

## Production Considerations

1. **SSL/TLS**: Use a reverse proxy (nginx, Caddy) for HTTPS
2. **Backups**: Set up automated backups using cron
3. **Monitoring**: Consider using Prometheus + Grafana
4. **Security**: 
   - Change all default passwords
   - Use strong JWT secrets
   - Configure firewall rules
   - Keep Docker images updated

## Updates

```bash
git pull
docker-compose build
docker-compose up -d
```

## Support

For issues or questions, please open an issue on GitHub.
