#!/bin/bash

# Generate JWT keys for self-hosted Supabase
# This script generates the necessary keys and tokens

set -e

echo "============================================"
echo "Supabase Self-Hosted Key Generator"
echo "============================================"
echo ""

# Generate JWT Secret
echo "Generating JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Generate PostgreSQL Password
echo "Generating PostgreSQL Password..."
POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""

# Generate Logflare API Key
echo "Generating Logflare API Key..."
LOGFLARE_API_KEY=$(openssl rand -base64 32)
echo "LOGFLARE_API_KEY=$LOGFLARE_API_KEY"
echo ""

# Generate JWT tokens using Node.js
echo "Generating JWT Tokens..."
echo "Note: You need Node.js installed to generate JWT tokens"
echo ""

# Create a temporary Node.js script
cat > /tmp/generate-jwt.js << 'EOF'
const jwt = require('jsonwebtoken');

const secret = process.argv[2];

const anonToken = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
  },
  secret
);

const serviceToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
  },
  secret
);

console.log('SUPABASE_ANON_KEY=' + anonToken);
console.log('SUPABASE_SERVICE_ROLE_KEY=' + serviceToken);
EOF

# Check if Node.js is installed
if command -v node &> /dev/null; then
    # Create a temporary directory for npm install
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    echo "Installing jsonwebtoken package..."
    npm init -y > /dev/null 2>&1
    npm install jsonwebtoken > /dev/null 2>&1
    
    # Move the script to the temp directory
    mv /tmp/generate-jwt.js "$TEMP_DIR/generate-jwt.js"
    
    # Run the script from the temp directory
    node generate-jwt.js "$JWT_SECRET"
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    echo ""
else
    echo "WARNING: Node.js not found. Using default JWT tokens."
    echo "IMPORTANT: These are DEMO tokens. Generate real ones at:"
    echo "https://supabase.com/docs/guides/self-hosting#api-keys"
    echo ""
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
    echo ""
fi

echo ""
echo "============================================"
echo "✅ SUCCESS! Copy these values to .env.self-hosted"
echo "============================================"
echo ""
echo "📝 Next steps:"
echo "  1. Open .env.self-hosted in a text editor"
echo "  2. Replace the values with the ones generated above"
echo "  3. Save the file"
echo "  4. Run: docker-compose -f docker-compose.self-hosted.yml down"
echo "  5. Run: docker-compose -f docker-compose.self-hosted.yml up -d"
echo "  6. Wait 30 seconds, then run: bash scripts/create-first-admin.sh"
echo ""
echo "============================================"
