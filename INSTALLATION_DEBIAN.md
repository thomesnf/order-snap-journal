# Complete Debian Installation Guide

This guide will walk you through installing the Order Management System on a Debian server with local file storage and database.

## Prerequisites

- Fresh Debian 11 or 12 installation
- Root or sudo access
- At least 2GB RAM
- 20GB free disk space
- Static IP address (recommended)

## Step 1: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 2: Install Docker

```bash
# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
```

**Log out and back in** for the group changes to take effect.

## Step 3: Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

## Step 4: Install Git

```bash
sudo apt install -y git
```

## Step 5: Clone the Repository

```bash
# Navigate to your preferred installation directory
cd /opt

# Clone the repository (replace with your actual repository URL)
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git order-management

# Change to project directory
cd order-management

# Set proper permissions
sudo chown -R $USER:$USER /opt/order-management
```

**Note:** Get your repository URL from GitHub:
1. Go to your repository on GitHub
2. Click the green "Code" button
3. Copy the HTTPS URL

## Step 6: Generate Security Keys

Generate strong passwords and secrets for your installation:

```bash
# Generate PostgreSQL password (save this!)
openssl rand -base64 32

# Generate JWT secret (save this!)
openssl rand -base64 64
```

**Important:** Save these values somewhere safe - you'll need them in the next step.

## Step 7: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

Replace the placeholder values with your generated secrets:

```env
# PostgreSQL Password (use the first generated password)
POSTGRES_PASSWORD=YOUR_GENERATED_POSTGRES_PASSWORD_HERE

# JWT Secret (use the second generated secret)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE

# Supabase Keys (generate these)
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# SMTP Configuration (optional - for email functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-app-password
SMTP_SENDER_NAME=Order Management System
```

**Generating Supabase Keys:**
```bash
# Generate anon key (this can be a random string)
openssl rand -base64 32

# Generate service role key (this should be different)
openssl rand -base64 32
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 8: Configure Docker Compose

The `docker-compose.yml` should already be configured, but verify the ports aren't in use:

```bash
# Check if ports are available
sudo netstat -tlnp | grep -E ':(80|3000|5432|9999|5000)'
```

If any ports are in use, you'll need to either stop those services or modify the ports in `docker-compose.yml`.

## Step 9: Build and Start Services

```bash
# Build the application
docker-compose build

# Start all services in detached mode
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

You should see 5 services running:
- app (frontend)
- supabase-db (PostgreSQL)
- supabase-api (PostgREST)
- supabase-auth (GoTrue)
- supabase-storage (Storage API)

## Step 10: Initialize Database

```bash
# Access the database container
docker-compose exec supabase-db psql -U postgres -d postgres

# You should see the postgres=# prompt
```

Run the initialization SQL (you'll need your migration files from `supabase/migrations/`):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exit when done
\q
```

If you have migration files, run them:

```bash
# List your migration files
ls supabase/migrations/

# Run each migration (replace with actual filename)
docker-compose exec -T supabase-db psql -U postgres -d postgres < supabase/migrations/XXXXXX_migration_name.sql
```

## Step 11: Create Admin User

Now create your first admin user:

```bash
# Access the database
docker-compose exec supabase-db psql -U postgres -d postgres
```

Run this SQL (replace the email and password):

```sql
-- Insert admin user into auth.users (simplified version)
-- Note: In production, you'd use the GoTrue API, but for initial setup:

-- First, create a profile
INSERT INTO public.profiles (id, full_name)
VALUES (gen_random_uuid(), 'System Administrator');

-- Get the ID you just created
SELECT id FROM public.profiles WHERE full_name = 'System Administrator';

-- Copy that ID and use it below (replace YOUR_USER_ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin');

-- Exit
\q
```

**Better approach - Create user via Auth API:**

```bash
# Create a temporary script to create the admin user
cat > create_admin.sh << 'EOF'
#!/bin/bash
curl -X POST 'http://localhost:9999/signup' \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@localhost",
    "password": "ChangeThisPassword123!"
  }'
EOF

chmod +x create_admin.sh
./create_admin.sh
```

Then grant admin role:

```bash
docker-compose exec supabase-db psql -U postgres -d postgres -c "
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@localhost'
ON CONFLICT DO NOTHING;
"
```

## Step 12: Access the Application

Open your browser and navigate to:

```
http://YOUR_SERVER_IP
```

Or if on the same machine:
```
http://localhost
```

Login with:
- Email: `admin@localhost`
- Password: `ChangeThisPassword123!` (or whatever you set)

**Change the password immediately after first login!**

## Step 13: Configure Firewall (Optional but Recommended)

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (if setting up SSL)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 14: Set Up SSL/HTTPS (Recommended)

### Option A: Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot

# Stop the application temporarily
cd /opt/order-management
docker-compose stop app

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com

# Restart application
docker-compose start app
```

### Option B: Using Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/order-management
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/order-management /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

Update `docker-compose.yml` to only expose port 80 to localhost:

```yaml
app:
  ports:
    - "127.0.0.1:80:80"  # Only accessible via localhost
```

Restart:
```bash
docker-compose down
docker-compose up -d
```

## Maintenance Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f supabase-db
docker-compose logs -f supabase-auth
```

### Backup Database

```bash
# Create backup directory
mkdir -p /opt/backups

# Backup database
docker-compose exec supabase-db pg_dump -U postgres postgres > /opt/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Docker volumes
docker run --rm \
  -v order-management_db-data:/data \
  -v /opt/backups:/backup \
  ubuntu tar czf /backup/db-volume_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restore Database

```bash
# Restore from SQL backup
docker-compose exec -T supabase-db psql -U postgres postgres < /opt/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Update Application

```bash
cd /opt/order-management

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Everything (including volumes)

```bash
docker-compose down -v
```

## Automated Backups (Optional)

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-order-management.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /opt/order-management/docker-compose.yml exec -T supabase-db pg_dump -U postgres postgres > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-order-management.sh
```

Schedule daily backups:

```bash
# Edit crontab
sudo crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /usr/local/bin/backup-order-management.sh >> /var/log/order-management-backup.log 2>&1
```

## Troubleshooting

### Check Service Status

```bash
docker-compose ps
docker-compose logs
```

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps supabase-db

# Check database logs
docker-compose logs supabase-db

# Test database connection
docker-compose exec supabase-db psql -U postgres -c "SELECT version();"
```

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Rebuild
docker-compose build --no-cache app
docker-compose up -d app
```

### Reset Everything

```bash
cd /opt/order-management
docker-compose down -v
docker-compose up -d
```

Then recreate admin user (Step 11).

## Security Recommendations

1. **Change default passwords immediately**
2. **Enable firewall** (UFW)
3. **Set up SSL/HTTPS** for production
4. **Regular backups** - automate them
5. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
6. **Monitor logs regularly**
7. **Restrict database access** - don't expose port 5432 to public
8. **Use strong passwords** for all accounts

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Review the `README.Docker.md` file
4. Check `docs/ADMIN_SETUP.md` for user management

## Quick Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Backup database
docker-compose exec supabase-db pg_dump -U postgres postgres > backup.sql

# Access database
docker-compose exec supabase-db psql -U postgres

# Update application
git pull && docker-compose build && docker-compose up -d
```
