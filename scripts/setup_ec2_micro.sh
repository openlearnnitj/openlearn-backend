#!/bin/bash

# OpenLearn AWS EC2 Micro Instance Setup Script
# This script sets up a basic environment on a fresh Ubuntu EC2 t3.micro instance.

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
REPO_URL="https://github.com/openlearnnitj/openlearn-backend.git" # Replace with your actual repo URL

log "Starting OpenLearn EC2 Micro Instance Setup"

# Check if running as root (should not be)
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a non-root user (e.g., ubuntu)."
   exit 1
fi

# Step 1: Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y
success "System packages updated."

# Step 2: Install essential packages
log "Installing essential packages (curl, wget, git, unzip, htop, ufw)..."
sudo apt install -y curl wget git unzip htop ufw
success "Essential packages installed."

# Step 3: Install Node.js 18
log "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
success "Node.js $(node --version) and npm $(npm --version) installed."

# Step 4: Install Docker
log "Installing Docker..."
# Uninstall old versions of Docker
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt remove $pkg; done || true

# Add Docker's official GPG key:
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  \"$(. /etc/os-release && echo \"$VERSION_CODENAME\")\" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update

# Install Docker packages
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER # Add current user to docker group
success "Docker installed and user added to docker group. **Please log out and log back in for changes to take effect.**"

# Step 5: Install Docker Compose
log "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
success "Docker Compose $(docker-compose --version | head -n 1) installed."

# Step 6: Configure Firewall (UFW)
log "Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
success "Firewall configured (SSH, HTTP, HTTPS allowed)."

# Step 7: Clone the Repository
log "Cloning the OpenLearn backend repository..."
mkdir -p $APP_DIR
git clone $REPO_URL $APP_DIR
success "Repository cloned to $APP_DIR."

# Step 8: Create .env file template
log "Creating .env file template..."
cp $APP_DIR/.env.example $APP_DIR/.env
success ".env.example copied to .env. Please edit $APP_DIR/.env with your actual values."

log "Initial EC2 setup complete. Please log out and log back in to apply Docker group changes."
log "Next steps:"
log "1. Log out and log back in to apply Docker group changes."
log "2. Edit the .env file: nano $APP_DIR/.env"
log "3. Run the Nginx setup script: bash $APP_DIR/scripts/setup_nginx.sh (after editing .env and setting up DNS)"
log "4. Run the deployment script: bash $APP_DIR/scripts/deploy.sh"
log "5. Set up cron jobs: bash $APP_DIR/scripts/setup_cron_jobs.sh"
