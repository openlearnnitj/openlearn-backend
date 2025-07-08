#!/bin/bash

# OpenLearn Nginx and Certbot Setup Script
# This script configures Nginx as a reverse proxy and sets up Certbot for SSL.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"; }

# Configuration
APP_DIR="/home/ubuntu/openlearn-backend"

log "Starting Nginx and Certbot Setup"

# Load environment variables
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
else
    error "❌ .env file not found at $APP_DIR/.env. Please create it and fill in DOMAIN and EMAIL."
    exit 1
fi

if [ -z "$CORS_ORIGIN" ]; then
    error "❌ CORS_ORIGIN not set in .env. Please set it to your domain (e.g., https://yourdomain.com)."
    exit 1
fi

DOMAIN=$(echo $CORS_ORIGIN | sed -e 's/^https:\/\///')
EMAIL="admin@${DOMAIN}" # Default email for Certbot

log "Using domain: $DOMAIN and email: $EMAIL"

# Step 1: Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx
success "Nginx installed."

# Step 2: Configure Nginx
log "Configuring Nginx reverse proxy..."

NGINX_CONF="/etc/nginx/sites-available/openlearn"

sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl restart nginx
success "Nginx configured and restarted."

# Step 3: Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
success "Certbot installed."

# Step 4: Obtain SSL certificate
log "Obtaining SSL certificate with Certbot..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
success "SSL certificate obtained and configured for Nginx."

log "Nginx and Certbot setup complete."
log "Your application should now be accessible via https://$DOMAIN"
