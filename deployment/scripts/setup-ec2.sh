#!/bin/bash

# OpenLearn AWS EC2 Deployment Script
# This script sets up a complete production environment on a single EC2 t2.micro instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

# Configuration
APP_NAME="openlearn"
APP_USER="ubuntu"
APP_DIR="/home/ubuntu/openlearn"
DOMAIN="openlearn.org.in"
EMAIL="admin@openlearn.org.in"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
   exit 1
fi

log "Starting OpenLearn AWS EC2 Deployment"
log "Domain: $DOMAIN"
log "App Directory: $APP_DIR"

# Step 1: Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install essential packages
log "🔧 Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    ufw \
    fail2ban

# Step 3: Install Node.js 18
log "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
success "Node.js installed: $node_version"
success "npm installed: $npm_version"

# Step 4: Install Docker
log "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

success "Docker installed successfully"

# Step 5: Install Docker Compose
log "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose installation
docker_compose_version=$(docker-compose --version)
success "Docker Compose installed: $docker_compose_version"

# Step 6: Install PM2
log "⚡ Installing PM2..."
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup | grep -E '^sudo' | bash

success "PM2 installed successfully"

# Step 7: Configure Firewall
log "Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

success "Firewall configured"

# Step 8: Configure fail2ban
log "Configuring fail2ban..."
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Create custom fail2ban configuration
sudo tee /etc/fail2ban/jail.d/custom.conf > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

success "fail2ban configured"

# Step 9: Create application directory
log "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/ssl

# Step 10: Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Step 11: Create environment file template
log "Creating environment configuration..."
cat > $APP_DIR/.env.example <<EOF
# Application Configuration
NODE_ENV=production
PORT=3000
APP_NAME=OpenLearn Backend

# Database Configuration
DATABASE_URL=postgresql://postgres:CHANGE_PASSWORD@localhost:5432/openlearn_prod
POSTGRES_DB=openlearn_prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_PASSWORD

# JWT Configuration
JWT_SECRET=CHANGE_THIS_SUPER_SECURE_JWT_SECRET_KEY
JWT_REFRESH_SECRET=REFRESH_SECRET_KEY
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# CORS Configuration
CORS_ORIGIN=https://openlearn.org.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.comi
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
EOF

warning "⚠️  Please update $APP_DIR/.env with your actual configuration values!"

# Step 12: Create deployment script
log "📝 Creating deployment script..."
cat > $APP_DIR/deploy.sh <<'EOF'
#!/bin/bash

# OpenLearn Deployment Script
set -e

log() {
    echo -e "\033[0;34m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

success() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1\033[0m"
}

error() {
    echo -e "\033[0;31m[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1\033[0m"
}

# Configuration
APP_DIR="/home/ubuntu/openlearn"
REPO_URL="https://github.com/openlearnnitj/openlearn-backend.git"
BRANCH="${1:-main}"

cd $APP_DIR

log "Starting deployment of branch: $BRANCH"

# Backup current version
if [ -d "current" ]; then
    log "📦 Backing up current version..."
    rm -rf backup
    mv current backup
fi

# Clone latest code
log "Cloning latest code..."
git clone -b $BRANCH $REPO_URL current
cd current

# Install dependencies
log "Installing dependencies..."
npm ci --only=production

# Build application
log "Building application..."
npm run build

# Copy environment file
cp ../.env .env

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy

# Stop PM2 processes
log "Stopping PM2 processes..."
pm2 stop ecosystem.config.js || true

# Start application with PM2
log "⚡ Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

success "Deployment completed successfully!"

# Show status
pm2 status
EOF

chmod +x $APP_DIR/deploy.sh

# Step 13: Create monitoring script
log "Creating monitoring script..."
cat > $APP_DIR/monitor.sh <<'EOF'
#!/bin/bash

# OpenLearn Monitoring Script
APP_DIR="/home/ubuntu/openlearn"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "OpenLearn System Status"
echo "=========================="

# System resources
echo -e "\nSystem Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"

# PM2 status
echo -e "\n⚡ PM2 Processes:"
pm2 status

# Docker containers
echo -e "\nDocker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Recent logs
echo -e "\n Recent Application Logs:"
tail -n 10 $APP_DIR/logs/combined.log 2>/dev/null || echo "No logs found"

# Health check
echo -e "\n Health Check:"
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}✗ Application is not responding${NC}"
fi

# SSL certificate status
echo -e "\n SSL Certificate:"
if [ -f "/etc/nginx/ssl/openlearn.org.in/fullchain.pem" ]; then
    EXPIRY=$(openssl x509 -in /etc/nginx/ssl/openlearn.org.in/fullchain.pem -noout -dates | grep notAfter | cut -d= -f2)
    echo "Expires: $EXPIRY"
else
    echo -e "${YELLOW}⚠ SSL certificate not found${NC}"
fi
EOF

chmod +x $APP_DIR/monitor.sh

# Step 14: Create log rotation configuration
log "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/openlearn > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 ubuntu ubuntu
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

# Step 15: Create backup script
log "Creating backup script..."
cat > $APP_DIR/backup.sh <<'EOF'
#!/bin/bash

# OpenLearn Backup Script
set -e

BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/openlearn"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

log() {
    echo -e "\033[0;34m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

success() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1\033[0m"
}

log "Starting backup process..."

# Database backup
log "Backing up PostgreSQL database..."
docker exec openlearn-postgres pg_dump -U postgres openlearn_prod | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Application files backup
log "Backing up application files..."
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C $APP_DIR uploads logs .env

# Clean old backups (keep last 7 days)
log "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

success "Backup completed: $DATE"
ls -la $BACKUP_DIR/
EOF

chmod +x $APP_DIR/backup.sh

# Step 16: Setup cron jobs
log "Setting up cron jobs..."
(crontab -l 2>/dev/null; echo "# OpenLearn automated tasks") | crontab -
(crontab -l; echo "0 2 * * * $APP_DIR/backup.sh >> $APP_DIR/logs/backup.log 2>&1") | crontab -
(crontab -l; echo "*/5 * * * * $APP_DIR/monitor.sh > /dev/null 2>&1") | crontab -
(crontab -l; echo "0 0 * * 0 pm2 flush") | crontab -

success "Cron jobs configured"

# Step 17: Display next steps
log "Setup completed! Next steps:"
echo ""
echo "1. Update environment variables:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Setup SSL certificate:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "3. Deploy your application:"
echo "   cd $APP_DIR && ./deploy.sh"
echo ""
echo "4. Monitor your application:"
echo "   cd $APP_DIR && ./monitor.sh"
echo ""
echo "5. Test backup system:"
echo "   cd $APP_DIR && ./backup.sh"
echo ""
echo "6. Configure GitHub secrets for CI/CD:"
echo "   EC2_HOST: Your EC2 IP"
echo "   EC2_USER: ubuntu" 
echo "   EC2_KEY: Your private SSH key"
echo ""

warning "Remember to:"
warning "   - Update your DNS records to point to this EC2 instance"
warning "   - Configure your GitHub repository URL in deploy.sh"
warning "   - Update .env with secure passwords and keys"
warning "   - Setup SSL certificate with Certbot"

success "OpenLearn AWS EC2 setup completed!"
success "Log location: $APP_DIR/logs/"
success "Monitor: $APP_DIR/monitor.sh"
success "Deploy: $APP_DIR/deploy.sh"

# Remind about logout/login for docker group
warning "⚠️  Please logout and login again to use Docker without sudo"
