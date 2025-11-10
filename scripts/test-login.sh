#!/bin/bash

# Test login against LOCAL Supabase auth
# This bypasses the frontend to test auth directly

set -e

echo "Testing login against LOCAL Supabase auth..."
echo ""

# Get credentials
read -p "Enter email (default: admin@localhost): " EMAIL
EMAIL=${EMAIL:-admin@localhost}

read -sp "Enter password: " PASSWORD
echo ""
echo ""

# Test login via Kong (port 8000)
echo "Attempting login..."
RESPONSE=$(curl -s -X POST \
  http://localhost:8000/auth/v1/token?grant_type=password \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "access_token"; then
    echo "✅ LOGIN SUCCESSFUL!"
    echo "The issue is with the frontend, not the auth system."
else
    echo "❌ LOGIN FAILED"
    echo ""
    echo "Possible issues:"
    echo "1. Wrong password"
    echo "2. Email not confirmed (check: email_confirmed_at in database)"
    echo "3. GoTrue configuration issue"
    echo ""
    echo "Check email confirmation status:"
    docker exec -it supabase-db psql -U postgres -c "SELECT email, email_confirmed_at FROM auth.users WHERE email='$EMAIL';"
fi
