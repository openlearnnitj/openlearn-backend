# OpenLearn Backend - Professional AWS Deployment Guide

## Table of Contents
1. [Project Structure Improvements](#project-structure-improvements)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [Docker Implementation](#docker-implementation)
4. [CI/CD Pipeline with GitHub Actions](#cicd-pipeline)
5. [Environment Management](#environment-management)
6. [Database Setup (RDS)](#database-setup)
7. [Load Balancer & SSL](#load-balancer--ssl)
8. [Monitoring & Logging](#monitoring--logging)
9. [Deployment Steps](#deployment-steps)
10. [Troubleshooting](#troubleshooting)

## Project Structure Improvements

### Current Structure Analysis
Your current structure is well-organized, but for professional AWS deployment, we need to add:

```
openlearn-js/
├── .github/
│   └── workflows/
│       ├── deploy-staging.yml
│       ├── deploy-production.yml
│       └── pull-request.yml
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.staging.yml
│   │   └── docker-compose.production.yml
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── staging.conf
│   │   └── production.conf
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── health-check.sh
│   │   └── backup-db.sh
│   └── terraform/ (optional)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── .env.staging
│   ├── .env.production
│   └── .env.local
├── logs/
└── monitoring/
    ├── health-checks/
    └── alerts/
```

## AWS Infrastructure Setup

### 1. EC2 Instance Setup

#### Instance Specifications
- **Production**: t3.medium (2 vCPU, 4 GB RAM) or t3.large for high traffic
- **Staging**: t3.small (2 vCPU, 2 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 20GB gp3 SSD (expandable)

#### Security Groups
```bash
# HTTP/HTTPS Traffic
Port 80 (HTTP) - 0.0.0.0/0
Port 443 (HTTPS) - 0.0.0.0/0

# SSH Access (restrict to your IP)
Port 22 (SSH) - YOUR_IP/32

# Application Port (internal only)
Port 3000 (Node.js) - Security Group itself

# Database Access (if self-hosted)
Port 5432 (PostgreSQL) - Application Security Group only
```

### 2. RDS PostgreSQL Setup

#### Database Configuration
- **Production**: db.t3.medium (Multi-AZ, 100GB storage)
- **Staging**: db.t3.micro (Single-AZ, 20GB storage)
- **Backup**: 7-day retention for production, 1-day for staging
- **Encryption**: Enabled for production

### 3. ElastiCache Redis Setup (Optional but Recommended)
- **Production**: cache.t3.micro (1 node)
- **Staging**: cache.t2.micro (1 node)

## Docker Implementation

### Dockerfile (Multi-stage build for optimization)
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S openlearn -u 1001

# Copy built application
COPY --from=builder --chown=openlearn:nodejs /app/dist ./dist
COPY --from=builder --chown=openlearn:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=openlearn:nodejs /app/prisma ./prisma
COPY --from=builder --chown=openlearn:nodejs /app/package*.json ./
COPY --from=builder --chown=openlearn:nodejs /app/public ./public

# Switch to non-root user
USER openlearn

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### Docker Compose for Production
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: deployment/docker/Dockerfile
    container_name: openlearn-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - environments/.env.production
    ports:
      - "3000:3000"
    depends_on:
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - openlearn-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: openlearn-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - openlearn-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: openlearn-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./deployment/nginx/production.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - openlearn-network

volumes:
  redis-data:

networks:
  openlearn-network:
    driver: bridge
```

## CI/CD Pipeline with GitHub Actions

### Environment Secrets Setup
In GitHub repository settings, add these secrets:

```
# AWS Credentials
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# EC2 Connection
EC2_HOST_STAGING
EC2_HOST_PRODUCTION
EC2_USER
EC2_PRIVATE_KEY

# Database URLs
DATABASE_URL_STAGING
DATABASE_URL_PRODUCTION

# Application Secrets
JWT_SECRET_STAGING
JWT_SECRET_PRODUCTION
JWT_REFRESH_SECRET_STAGING
JWT_REFRESH_SECRET_PRODUCTION

# Other Environment Variables
REDIS_PASSWORD_STAGING
REDIS_PASSWORD_PRODUCTION
```

### Production Deployment Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: openlearn_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Generate Prisma Client
      run: npx prisma generate
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/openlearn_test
    
    - name: Run database migrations
      run: npx prisma migrate deploy
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/openlearn_test
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/openlearn_test
        NODE_ENV: test
    
    - name: Build TypeScript
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Create deployment package
      run: |
        mkdir -p deployment-package
        cp -r . deployment-package/
        cd deployment-package
        rm -rf node_modules .git
        tar -czf ../deployment.tar.gz .
    
    - name: Upload to EC2
      uses: appleboy/scp-action@v0.1.4
      with:
        host: ${{ secrets.EC2_HOST_PRODUCTION }}
        username: ${{ secrets.EC2_USER }}
        key: ${{ secrets.EC2_PRIVATE_KEY }}
        source: "deployment.tar.gz"
        target: "/home/${{ secrets.EC2_USER }}/"
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.EC2_HOST_PRODUCTION }}
        username: ${{ secrets.EC2_USER }}
        key: ${{ secrets.EC2_PRIVATE_KEY }}
        script: |
          cd /home/${{ secrets.EC2_USER }}
          
          # Backup current deployment
          if [ -d "openlearn-backend" ]; then
            mv openlearn-backend openlearn-backend-backup-$(date +%Y%m%d_%H%M%S)
          fi
          
          # Extract new deployment
          mkdir openlearn-backend
          tar -xzf deployment.tar.gz -C openlearn-backend
          cd openlearn-backend
          
          # Create environment file
          cat > environments/.env.production << EOF
          NODE_ENV=production
          PORT=3000
          DATABASE_URL=${{ secrets.DATABASE_URL_PRODUCTION }}
          JWT_SECRET=${{ secrets.JWT_SECRET_PRODUCTION }}
          JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET_PRODUCTION }}
          REDIS_URL=redis://localhost:6379
          REDIS_PASSWORD=${{ secrets.REDIS_PASSWORD_PRODUCTION }}
          CORS_ORIGIN=https://openlearn.org.in
          APP_NAME=OpenLearn Backend Production
          LOG_LEVEL=info
          EOF
          
          # Build and deploy with Docker
          docker-compose -f deployment/docker/docker-compose.production.yml down || true
          docker-compose -f deployment/docker/docker-compose.production.yml build
          docker-compose -f deployment/docker/docker-compose.production.yml up -d
          
          # Run database migrations
          docker-compose -f deployment/docker/docker-compose.production.yml exec -T app npx prisma migrate deploy
          
          # Health check
          sleep 30
          curl -f http://localhost:3000/health || exit 1
          
          echo "Deployment completed successfully!"

  notify:
    needs: [test, deploy]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Notify deployment status
      run: |
        if [ "${{ needs.deploy.result }}" == "success" ]; then
          echo "✅ Production deployment successful!"
        else
          echo "❌ Production deployment failed!"
          exit 1
        fi
```

## Environment Management

### Staging Environment (.env.staging)
```env
NODE_ENV=staging
PORT=3000
APP_NAME=OpenLearn Backend Staging

# Database
DATABASE_URL=postgresql://username:password@staging-db.region.rds.amazonaws.com:5432/openlearn_staging

# JWT Configuration
JWT_SECRET=staging-jwt-secret-key
JWT_REFRESH_SECRET=staging-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://staging-redis.cache.amazonaws.com:6379
REDIS_PASSWORD=staging-redis-password

# CORS Configuration
CORS_ORIGIN=https://staging.openlearn.org.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=debug

# Email Configuration (if applicable)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@openlearn.org.in
SMTP_PASS=staging-email-password
```

### Production Environment (.env.production)
```env
NODE_ENV=production
PORT=3000
APP_NAME=OpenLearn Backend Production

# Database
DATABASE_URL=postgresql://username:password@prod-db.region.rds.amazonaws.com:5432/openlearn_production

# JWT Configuration
JWT_SECRET=super-secure-production-jwt-secret
JWT_REFRESH_SECRET=super-secure-production-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://prod-redis.cache.amazonaws.com:6379
REDIS_PASSWORD=production-redis-password

# CORS Configuration
CORS_ORIGIN=https://openlearn.org.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=info

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@openlearn.org.in
SMTP_PASS=production-email-password

# Monitoring
SENTRY_DSN=your-sentry-dsn-for-error-tracking
```

## Nginx Configuration

### Main Nginx Config (nginx.conf)
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    include /etc/nginx/conf.d/*.conf;
}
```

### Production Site Config (production.conf)
```nginx
upstream backend {
    server app:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name openlearn.org.in api.openlearn.org.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openlearn.org.in api.openlearn.org.in;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/openlearn.org.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openlearn.org.in/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Logging
    access_log /var/log/nginx/openlearn.access.log main;
    error_log /var/log/nginx/openlearn.error.log;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Auth routes with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Status page
    location /status-page {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (if serving from backend)
    location /uploads/ {
        proxy_pass http://backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Favicon
    location /favicon.ico {
        proxy_pass http://backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }

    # Security.txt
    location /.well-known/security.txt {
        return 301 https://openlearn.org.in/security.txt;
    }

    # Default fallback for SPA
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/html;
    }
}
```

## Deployment Scripts

### Main Deployment Script (deploy.sh)
```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_ENABLED=${2:-true}
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Load environment-specific configuration
source ./deployment/scripts/config/$ENVIRONMENT.conf

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check application health
check_health() {
    local retries=$1
    local delay=$2
    
    for i in $(seq 1 $retries); do
        echo "Health check attempt $i/$retries..."
        if curl -f -s "http://localhost:3000/health" > /dev/null; then
            echo "✅ Application is healthy!"
            return 0
        fi
        
        if [ $i -lt $retries ]; then
            echo "⏳ Waiting ${delay}s before next attempt..."
            sleep $delay
        fi
    done
    
    echo "❌ Health check failed after $retries attempts"
    return 1
}

# Function to backup current deployment
backup_deployment() {
    if [ "$BACKUP_ENABLED" = "true" ] && [ -d "$APP_DIR" ]; then
        local backup_dir="${APP_DIR}-backup-$(date +%Y%m%d_%H%M%S)"
        echo "📦 Creating backup: $backup_dir"
        cp -r "$APP_DIR" "$backup_dir"
        
        # Keep only last 5 backups
        ls -dt ${APP_DIR}-backup-* | tail -n +6 | xargs -r rm -rf
    fi
}

# Function to rollback deployment
rollback_deployment() {
    echo "🔄 Rolling back deployment..."
    
    # Stop current containers
    docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml down || true
    
    # Find latest backup
    local latest_backup=$(ls -dt ${APP_DIR}-backup-* 2>/dev/null | head -n 1)
    
    if [ -n "$latest_backup" ]; then
        echo "📦 Restoring from backup: $latest_backup"
        rm -rf "$APP_DIR"
        mv "$latest_backup" "$APP_DIR"
        cd "$APP_DIR"
        
        # Start previous version
        docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml up -d
        
        if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_DELAY; then
            echo "✅ Rollback successful!"
        else
            echo "❌ Rollback failed!"
            exit 1
        fi
    else
        echo "❌ No backup found for rollback!"
        exit 1
    fi
}

# Main deployment process
main() {
    echo "🔍 Checking prerequisites..."
    
    # Check required commands
    for cmd in docker docker-compose curl; do
        if ! command_exists $cmd; then
            echo "❌ Required command not found: $cmd"
            exit 1
        fi
    done
    
    echo "✅ Prerequisites check passed"
    
    # Create backup
    backup_deployment
    
    # Pull latest code (if running on CI/CD)
    if [ "$CI" = "true" ]; then
        echo "🔄 Code already extracted from CI/CD"
    else
        echo "⬇️  Pulling latest code..."
        git pull origin main
    fi
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm ci --only=production
    
    # Generate Prisma client
    echo "🔧 Generating Prisma client..."
    npx prisma generate
    
    # Build application
    echo "🔨 Building application..."
    npm run build
    
    # Stop existing containers
    echo "🛑 Stopping existing containers..."
    docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml down || true
    
    # Build new containers
    echo "🔨 Building Docker containers..."
    docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml build
    
    # Start new containers
    echo "🚀 Starting new containers..."
    docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml up -d
    
    # Wait for containers to start
    echo "⏳ Waiting for containers to start..."
    sleep 20
    
    # Run database migrations
    echo "🗄️  Running database migrations..."
    docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml exec -T app npx prisma migrate deploy
    
    # Health check
    echo "🏥 Performing health check..."
    if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_DELAY; then
        echo "🎉 Deployment successful!"
        
        # Clean up old Docker images
        docker image prune -f
        
        # Send notification (if configured)
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data '{"text":"✅ OpenLearn Backend deployed successfully to '$ENVIRONMENT'!"}' \
                "$SLACK_WEBHOOK_URL"
        fi
    else
        echo "❌ Deployment failed health check!"
        rollback_deployment
        exit 1
    fi
}

# Trap errors and rollback
trap 'echo "❌ Deployment failed! Rolling back..."; rollback_deployment' ERR

# Run main deployment
main

echo "🏁 Deployment completed successfully!"
```

### Health Check Script (health-check.sh)
```bash
#!/bin/bash

# Health check script for monitoring
HEALTH_URL=${1:-"http://localhost:3000/health"}
MAX_RETRIES=${2:-3}
RETRY_DELAY=${3:-5}

for i in $(seq 1 $MAX_RETRIES); do
    echo "Health check attempt $i/$MAX_RETRIES..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
    
    if [ "$response" = "200" ]; then
        echo "✅ Health check passed"
        exit 0
    fi
    
    echo "❌ Health check failed (HTTP $response)"
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo "⏳ Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
```

## Step-by-Step Deployment Instructions

### Phase 1: AWS Infrastructure Setup

1. **Create EC2 Instances**
```bash
# Launch EC2 instances for staging and production
# Use AWS CLI or Console
aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --count 1 \
    --instance-type t3.medium \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=openlearn-backend-prod}]'
```

2. **Setup RDS PostgreSQL**
```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier openlearn-prod-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --master-username openlearn \
    --master-user-password your-secure-password \
    --allocated-storage 100 \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --backup-retention-period 7 \
    --multi-az \
    --storage-encrypted
```

### Phase 2: Server Setup

1. **Connect to EC2**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

2. **Install Docker and Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for npm commands)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Install PM2 globally (backup process manager)
sudo npm install -g pm2

# Install monitoring tools
sudo apt install htop iotop nethogs -y
```

3. **Configure Firewall**
```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Phase 3: SSL Certificate Setup

```bash
# Get SSL certificate
sudo certbot --nginx -d openlearn.org.in -d api.openlearn.org.in

# Test automatic renewal
sudo certbot renew --dry-run

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Phase 4: Application Deployment

1. **Clone Repository**
```bash
cd /home/ubuntu
git clone https://github.com/your-org/openlearn-js.git
cd openlearn-js
```

2. **Setup Environment Files**
```bash
# Create environment files
mkdir -p environments
cp .env.example environments/.env.production

# Edit production environment
nano environments/.env.production
```

3. **Initial Deployment**
```bash
# Make deployment script executable
chmod +x deployment/scripts/deploy.sh

# Run initial deployment
./deployment/scripts/deploy.sh production
```

### Phase 5: CI/CD Setup

1. **Generate SSH Key for GitHub Actions**
```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions@openlearn.org.in" -f ~/.ssh/openlearn-deploy

# Copy public key to EC2
ssh-copy-id -i ~/.ssh/openlearn-deploy.pub ubuntu@your-ec2-ip

# Copy private key content to GitHub Secrets as EC2_PRIVATE_KEY
cat ~/.ssh/openlearn-deploy
```

2. **Setup GitHub Environments**
   - Go to GitHub repository settings
   - Create environments: `staging` and `production`
   - Add protection rules for production
   - Add all required secrets

### Phase 6: Monitoring Setup

1. **Setup Log Rotation**
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/openlearn

# Add content:
/home/ubuntu/openlearn-js/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
```

2. **Setup System Monitoring**
```bash
# Install and configure monitoring
npm install -g pm2-server-monit

# Setup basic monitoring alerts
pm2 install pm2-auto-pull
pm2 install pm2-server-monit
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **Port 3000 Already in Use**
```bash
# Find and kill process
sudo lsof -i :3000
sudo kill -9 PID

# Or use different port
export PORT=3001
```

2. **Docker Permission Issues**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

3. **Database Connection Issues**
```bash
# Check database connectivity
docker-compose exec app npx prisma db pull

# Check environment variables
docker-compose exec app env | grep DATABASE_URL
```

4. **SSL Certificate Issues**
```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

5. **Memory Issues**
```bash
# Check memory usage
free -h
docker stats

# Restart services
docker-compose restart
```

### Monitoring Commands

```bash
# Check application logs
docker-compose logs -f app

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop

# Check disk usage
df -h

# Check network connections
netstat -tulpn
```

This comprehensive guide provides everything you need for a professional AWS deployment of your OpenLearn backend. The setup includes proper containerization, CI/CD pipelines, environment management, monitoring, and security best practices.
