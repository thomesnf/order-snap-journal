#!/bin/sh
set -e

echo "Starting Order Snap Journal App..."

# Check if nginx config is valid
echo "Checking nginx configuration..."
nginx -t

# Check if index.html exists
if [ ! -f /usr/share/nginx/html/index.html ]; then
    echo "ERROR: index.html not found!"
    ls -la /usr/share/nginx/html/
    exit 1
fi

echo "Starting nginx..."
exec nginx -g 'daemon off;'
