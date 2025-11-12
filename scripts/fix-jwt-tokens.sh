#!/bin/bash

# Ultimate JWT Token Fix Script
# This script reads the JWT_SECRET and COMPLETELY rebuilds .env.self-hosted with VALID tokens

set -e

echo "============================================"
echo "JWT Token Fix - Complete Rebuild"
echo "============================================"
echo ""

# Check if .env.self-hosted exists
if [ ! -f .env.self-hosted ]; then
    echo "ERROR: .env.self-hosted not found"
    exit 1
fi

# Extract current values
JWT_SECRET=$(grep "^JWT_SECRET=" .env.self-hosted | cut -d'=' -f2-)
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.self-hosted | cut -d'=' -f2-)
LOGFLARE_API_KEY=$(grep "^LOGFLARE_API_KEY=" .env.self-hosted | cut -d'=' -f2-)
SITE_URL=$(grep "^SITE_URL=" .env.self-hosted | cut -d'=' -f2- || echo "http://localhost")
API_EXTERNAL_URL=$(grep "^API_EXTERNAL_URL=" .env.self-hosted | cut -d'=' -f2- || echo "http://localhost:8000")
GOTRUE_SITE_URL=$(grep "^GOTRUE_SITE_URL=" .env.self-hosted | cut -d'=' -f2- || echo "http://localhost")
VITE_SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env.self-hosted | cut -d'=' -f2- || echo "http://13.37.0.96:8000")
VITE_SUPABASE_PROJECT_ID=$(grep "^VITE_SUPABASE_PROJECT_ID=" .env.self-hosted | cut -d'=' -f2- || echo "local")

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET not found in .env.self-hosted"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD not found in .env.self-hosted"
    exit 1
fi

if [ -z "$LOGFLARE_API_KEY" ]; then
    echo "ERROR: LOGFLARE_API_KEY not found in .env.self-hosted"
    exit 1
fi

echo "Found existing secrets:"
echo "  JWT_SECRET: ${JWT_SECRET:0:20}..."
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:0:20}..."
echo "  LOGFLARE_API_KEY: ${LOGFLARE_API_KEY:0:20}..."
echo ""

# Generate JWT tokens using Python
echo "Generating new JWT tokens with Python..."

python3 << PYTHON_EOF
import base64
import hmac
import hashlib
import json
import time

def base64url_encode(data):
    """Base64 URL encode without padding"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    encoded = base64.urlsafe_b64encode(data).decode('utf-8')
    return encoded.rstrip('=')

def create_jwt(payload, secret):
    """Create a JWT token"""
    # Header
    header = {
        "alg": "HS256",
        "typ": "JWT"
    }
    
    # Encode header and payload
    header_encoded = base64url_encode(json.dumps(header, separators=(',', ':')))
    payload_encoded = base64url_encode(json.dumps(payload, separators=(',', ':')))
    
    # Create signature
    message = f"{header_encoded}.{payload_encoded}"
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_encoded = base64url_encode(signature)
    
    # Combine all parts
    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

secret = """$JWT_SECRET"""

# Current timestamp
iat = int(time.time())
# Expire in 10 years
exp = iat + (10 * 365 * 24 * 60 * 60)

# Anon token
anon_payload = {
    "role": "anon",
    "iss": "supabase",
    "iat": iat,
    "exp": exp
}
anon_token = create_jwt(anon_payload, secret)

# Service role token
service_payload = {
    "role": "service_role",
    "iss": "supabase",
    "iat": iat,
    "exp": exp
}
service_token = create_jwt(service_payload, secret)

# Save to temp file
with open('/tmp/jwt_tokens.txt', 'w') as f:
    f.write(f"ANON={anon_token}\n")
    f.write(f"SERVICE={service_token}\n")

print(f"✅ Generated ANON_KEY: {anon_token[:60]}...")
print(f"✅ Generated SERVICE_KEY: {service_token[:60]}...")
PYTHON_EOF

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate JWT tokens with Python"
    exit 1
fi

# Read the generated tokens
ANON_KEY=$(grep "^ANON=" /tmp/jwt_tokens.txt | cut -d'=' -f2-)
SERVICE_KEY=$(grep "^SERVICE=" /tmp/jwt_tokens.txt | cut -d'=' -f2-)

rm -f /tmp/jwt_tokens.txt

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
    echo "ERROR: Failed to extract generated tokens"
    exit 1
fi

# Backup original file
cp .env.self-hosted .env.self-hosted.backup.$(date +%Y%m%d_%H%M%S)

# Create completely NEW .env.self-hosted file
cat > .env.self-hosted << ENV_EOF
############
# SECURITY #
############

# Generate with: openssl rand -base64 32
JWT_SECRET=$JWT_SECRET
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
LOGFLARE_API_KEY=$LOGFLARE_API_KEY

# JWT tokens (generated from JWT_SECRET above)
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

############
# GOTRUE   #
############

# These are required for GoTrue auth service
SITE_URL=$SITE_URL
API_EXTERNAL_URL=$API_EXTERNAL_URL
GOTRUE_SITE_URL=$GOTRUE_SITE_URL

############
# FRONTEND #
############

# Frontend environment variables (for the React app)
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

############
# OPTIONAL #
############

# Email settings (if you want real emails instead of Inbucket)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_ADMIN_EMAIL=admin@yourdomain.com

# S3 Storage (if you want to use S3 instead of local file storage)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# S3_BUCKET=
ENV_EOF

echo ""
echo "✅ Created new .env.self-hosted file with valid tokens"
echo ""
echo "📋 Summary:"
echo "  JWT_SECRET:     ${JWT_SECRET:0:30}..."
echo "  ANON_KEY:       ${ANON_KEY:0:60}..."
echo "  SERVICE_KEY:    ${SERVICE_KEY:0:60}..."
echo ""
echo "✅ Backup saved to: .env.self-hosted.backup.$(date +%Y%m%d_%H%M%S)"
echo ""
echo "Next steps:"
echo "  1. Restart containers:  sudo docker-compose -f docker-compose.self-hosted.yml down"
echo "                          sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d"
echo "  2. Verify setup:        sudo ./scripts/verify-jwt-setup.sh"
echo "  3. Create admin:        sudo ./scripts/create-first-admin.sh"
