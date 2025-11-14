#!/bin/sh
set -e

echo "=========================================="
echo "Starting Order Snap Journal App"
echo "=========================================="
echo ""

# Show what we have
echo "Step 1: Checking build artifacts..."
echo "Contents of /usr/share/nginx/html:"
ls -lah /usr/share/nginx/html/ || echo "Directory not found!"
echo ""

# Check if index.html exists
echo "Step 2: Verifying index.html..."
if [ ! -f /usr/share/nginx/html/index.html ]; then
    echo "ERROR: index.html not found!"
    echo "Build may have failed or files not copied correctly"
    exit 1
fi
echo "✓ index.html found"
echo ""

# Check if config is present
echo "Step 3: Checking for config.js or env.js..."
find /usr/share/nginx/html/assets -name "*.js" | head -5
echo ""

# Check if nginx config is valid
echo "Step 4: Validating nginx configuration..."
if nginx -t 2>&1; then
    echo "✓ Nginx configuration valid"
else
    echo "ERROR: Nginx configuration invalid!"
    exit 1
fi
echo ""

echo "Step 5: Starting nginx..."
echo "App will be available on port 80"
echo "=========================================="
exec nginx -g 'daemon off;'
