# Complete Deployment Guide

This guide covers deploying your Order Manager Pro application on a local server with Docker and building an Android APK that connects to it.

## Part 1: Docker Deployment on Local Server

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 80, 3000, 5432, 9999, and 5000 available

### Step 1: Prepare Environment

1. **Clone or export your project**
   ```bash
   git clone <your-repo-url>
   cd order-snap-journal
   ```

2. **Configure environment variables**
   ```bash
   cp .env.docker .env.local
   nano .env.local
   ```

3. **Generate secure credentials**
   ```bash
   # PostgreSQL password
   openssl rand -base64 24
   
   # JWT secret (min 32 chars)
   openssl rand -base64 32
   
   # Supabase keys
   openssl rand -base64 32
   openssl rand -base64 32
   ```

4. **Update .env.local with your values and server IP**
   - Replace all placeholder passwords and keys
   - Set your server's IP address (e.g., `192.168.1.100` or domain name)

### Step 2: Build and Deploy

```bash
# Build all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 3: Access Your Application

- Frontend: `http://YOUR_SERVER_IP`
- API: `http://YOUR_SERVER_IP:3000`
- Auth: `http://YOUR_SERVER_IP:9999`

### Step 4: Database Initialization

```bash
# Initialize database
docker-compose exec supabase-db psql -U postgres -f /docker-entrypoint-initdb.d/init-db.sql
```

## Part 2: Building Android APK

### Prerequisites
- Node.js 20+ installed
- Android Studio installed
- Java JDK 17+ installed
- Your local server running and accessible

### Step 1: Prepare Project Locally

1. **Export to GitHub** (use Lovable's GitHub export button)

2. **Clone locally**
   ```bash
   git clone <your-github-repo>
   cd order-snap-journal
   npm install
   ```

### Step 2: Configure for Local Server

1. **Update capacitor.config.ts**
   
   Replace the `server.url` with your local server IP:
   ```typescript
   server: {
     url: 'http://YOUR_SERVER_IP',  // e.g., 'http://192.168.1.100'
     cleartext: true
   }
   ```

2. **Update environment variables**
   
   Create `.env.production.local`:
   ```env
   VITE_SUPABASE_URL=http://YOUR_SERVER_IP:3000
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-from-env-local
   VITE_SUPABASE_PROJECT_ID=local-project
   ```

### Step 3: Build the App

```bash
# Build the web app
npm run build

# Add Android platform (first time only)
npx cap add android

# Sync web build with Android
npx cap sync android

# Copy assets
npx cap copy android
```

### Step 4: Generate APK with Android Studio

1. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **For Release APK:**
   - Go to `Build` → `Generate Signed Bundle / APK`
   - Select `APK`
   - Create or select your keystore
   - Choose `release` build variant
   - APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

### Step 5: Distribute APK

**For testing (Debug APK):**
```bash
# Copy APK to easily shareable location
cp android/app/build/outputs/apk/debug/app-debug.apk ~/OrderManagerPro-debug.apk
```

**For production (Release APK):**
```bash
# Copy release APK
cp android/app/build/outputs/apk/release/app-release.apk ~/OrderManagerPro-v1.0.apk
```

Transfer the APK to Android devices via:
- USB transfer
- Email/cloud storage
- Internal file server
- Local web server

### Step 6: Install on Android Devices

1. Enable "Install from Unknown Sources" in Android settings
2. Transfer APK to device
3. Open APK file and install
4. App will connect to your local server at the configured IP address

## Network Configuration

### For Local Network Access

If users are on the same local network (e.g., office WiFi):
- Use your server's local IP (e.g., `192.168.1.100`)
- No additional configuration needed

### For Remote Access (VPN)

If users need remote access:
1. Set up OpenVPN or WireGuard on your server
2. Configure users to connect to VPN
3. Use the VPN IP address in Capacitor config

### For Remote Access (Public Internet)

1. Set up reverse proxy with SSL (nginx/Caddy)
2. Configure domain and SSL certificates
3. Use HTTPS URL in Capacitor config
4. Update `cleartext: true` to `cleartext: false`

## Updating the App

### Update Server (Docker)
```bash
git pull
docker-compose build
docker-compose up -d
```

### Update Android App
```bash
git pull
npm install
npm run build
npx cap sync android
npx cap open android
# Build new APK in Android Studio
```

## Troubleshooting

### Android App Can't Connect to Server

1. **Check network connectivity:**
   ```bash
   # From Android device browser
   http://YOUR_SERVER_IP
   ```

2. **Verify server is accessible:**
   - Same WiFi network?
   - Firewall rules allow connections?
   - Server ports open?

3. **Check capacitor.config.ts URL:**
   - Should match server IP exactly
   - Use `http://` (not `https://`) for local network
   - `cleartext: true` for HTTP connections

### Docker Services Not Starting

```bash
# Check logs
docker-compose logs supabase-db
docker-compose logs app

# Restart specific service
docker-compose restart app

# Complete reset
docker-compose down -v
docker-compose up -d
```

### APK Build Fails

1. **Check Java version:**
   ```bash
   java -version  # Should be 17+
   ```

2. **Clear Gradle cache:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **Update Android SDK in Android Studio:**
   - Tools → SDK Manager → Update all

## Security Considerations

### Production Checklist

- [ ] Change all default passwords in `.env.local`
- [ ] Use strong JWT secret (32+ characters)
- [ ] Configure firewall to limit port access
- [ ] Set up SSL/TLS for HTTPS
- [ ] Regular database backups
- [ ] Keep Docker images updated
- [ ] Use release APK (not debug) for production
- [ ] Sign APK with secure keystore
- [ ] Limit network access to authorized users only

## Backup and Restore

### Backup Database
```bash
docker-compose exec supabase-db pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql
```

### Backup Storage Files
```bash
docker run --rm -v order-snap-journal_storage-data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/storage-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore Database
```bash
docker-compose exec -T supabase-db psql -U postgres postgres < backup-20250101.sql
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify network connectivity
3. Review this guide's troubleshooting section
