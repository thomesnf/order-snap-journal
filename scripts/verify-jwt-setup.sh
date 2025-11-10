#!/bin/bash

# Verify JWT configuration matches between .env file and running containers
set -e

echo "============================================"
echo "JWT Configuration Verification"
echo "============================================"
echo ""

# Load .env.self-hosted
if [ ! -f .env.self-hosted ]; then
    echo "ERROR: .env.self-hosted not found"
    exit 1
fi

export $(cat .env.self-hosted | grep -E '^[A-Z_]+=' | xargs)

echo "1. Environment file JWT_SECRET:"
echo "   ${JWT_SECRET:0:30}..."
echo ""

echo "2. Environment file SERVICE_ROLE_KEY:"
echo "   ${SUPABASE_SERVICE_ROLE_KEY:0:60}..."
echo ""

echo "3. GoTrue container JWT_SECRET:"
GOTRUE_JWT=$(docker exec supabase-auth printenv GOTRUE_JWT_SECRET 2>/dev/null || echo "ERROR")
if [ "$GOTRUE_JWT" = "ERROR" ]; then
    echo "   ERROR: Could not read from container"
else
    echo "   ${GOTRUE_JWT:0:30}..."
fi
echo ""

echo "4. Comparing secrets:"
if [ "$JWT_SECRET" = "$GOTRUE_JWT" ]; then
    echo "   ✅ MATCH: Container and file secrets match"
else
    echo "   ❌ MISMATCH: Container secret differs from file!"
    echo "   File:      ${JWT_SECRET:0:20}..."
    echo "   Container: ${GOTRUE_JWT:0:20}..."
    echo ""
    echo "   FIX: Recreate containers with:"
    echo "   sudo docker-compose -f docker-compose.self-hosted.yml down"
    echo "   sudo docker-compose -f docker-compose.self-hosted.yml --env-file .env.self-hosted up -d"
fi
echo ""

echo "5. Testing JWT validation with Python:"
cat > /tmp/test_jwt.py << 'PYTHON_EOF'
import sys
import base64
import hmac
import hashlib
import json

def base64url_decode(data):
    """Decode base64url"""
    # Add padding if needed
    missing_padding = len(data) % 4
    if missing_padding:
        data += '=' * (4 - missing_padding)
    return base64.urlsafe_b64decode(data)

def verify_jwt(token, secret):
    """Verify JWT signature"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return False, "Invalid token format"
        
        header_encoded, payload_encoded, signature_encoded = parts
        
        # Recreate signature
        message = f"{header_encoded}.{payload_encoded}"
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Decode provided signature
        provided_signature = base64url_decode(signature_encoded)
        
        if expected_signature == provided_signature:
            # Decode payload to check role
            payload = json.loads(base64url_decode(payload_encoded))
            return True, payload.get('role', 'unknown')
        else:
            return False, "Signature mismatch"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    token = sys.argv[1]
    secret = sys.argv[2]
    
    valid, result = verify_jwt(token, secret)
    if valid:
        print(f"✅ VALID: Token verified successfully (role: {result})")
    else:
        print(f"❌ INVALID: {result}")
        sys.exit(1)
PYTHON_EOF

if python3 /tmp/test_jwt.py "$SUPABASE_SERVICE_ROLE_KEY" "$JWT_SECRET" 2>/dev/null; then
    echo "   Token validation successful"
else
    echo "   ❌ Token FAILED validation against current JWT_SECRET"
    echo ""
    echo "   This means the tokens need to be regenerated!"
    echo "   Run: sudo ./scripts/regenerate-jwt-tokens.sh"
fi

rm -f /tmp/test_jwt.py

echo ""
echo "============================================"
echo "Verification complete"
echo "============================================"
