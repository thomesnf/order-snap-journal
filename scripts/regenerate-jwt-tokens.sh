#!/bin/bash

# Regenerate JWT tokens for existing .env.self-hosted
# This fixes the "invalid JWT" error when JWT_SECRET doesn't match tokens

set -e

echo "============================================"
echo "Regenerate JWT Tokens"
echo "============================================"
echo ""

# Load existing JWT_SECRET
if [ ! -f .env.self-hosted ]; then
    echo "ERROR: .env.self-hosted not found"
    exit 1
fi

# Extract JWT_SECRET
JWT_SECRET=$(grep "^JWT_SECRET=" .env.self-hosted | cut -d'=' -f2)

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET not found in .env.self-hosted"
    exit 1
fi

echo "Found JWT_SECRET: ${JWT_SECRET:0:20}..."
echo ""

# Create Python script to generate JWT tokens
cat > /tmp/generate_jwt.py << 'PYTHON_EOF'
import sys
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

if __name__ == "__main__":
    secret = sys.argv[1]
    
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
    
    print(f"SUPABASE_ANON_KEY={anon_token}")
    print(f"SUPABASE_SERVICE_ROLE_KEY={service_token}")
PYTHON_EOF

# Generate new tokens using Python
echo "Generating new JWT tokens..."
NEW_TOKENS=$(python3 /tmp/generate_jwt.py "$JWT_SECRET")

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate JWT tokens"
    rm -f /tmp/generate_jwt.py
    exit 1
fi

# Extract tokens
ANON_KEY=$(echo "$NEW_TOKENS" | grep "SUPABASE_ANON_KEY=" | cut -d'=' -f2)
SERVICE_KEY=$(echo "$NEW_TOKENS" | grep "SUPABASE_SERVICE_ROLE_KEY=" | cut -d'=' -f2)

# Backup original file
cp .env.self-hosted .env.self-hosted.backup

# Update .env.self-hosted with new tokens
sed -i "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|" .env.self-hosted
sed -i "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env.self-hosted

# Cleanup
rm -f /tmp/generate_jwt.py

echo "✅ JWT tokens regenerated successfully!"
echo ""
echo "New tokens have been written to .env.self-hosted"
echo "Backup saved to .env.self-hosted.backup"
echo ""
echo "ANON_KEY: ${ANON_KEY:0:50}..."
echo "SERVICE_KEY: ${SERVICE_KEY:0:50}..."
echo ""
echo "Next steps:"
echo "  1. Restart services: docker-compose -f docker-compose.self-hosted.yml restart"
echo "  2. Run admin creation: sudo ./scripts/create-first-admin.sh"
