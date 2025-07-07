# 🚀 OpenLearn AWS Deployment Guide

## Complete Professional Deployment Strategy

This guide provides a comprehensive deployment strategy for OpenLearn using a **cost-effective hybrid approach** with one EC2 micro instance and free Render instances.

## 🏗️ Architecture Overview

### Production Environment (AWS EC2)
- **Main Application**: EC2 t2.micro (Free Tier)
- **Database**: PostgreSQL on EC2
- **Cache**: Redis on EC2
- **Reverse Proxy**: Nginx on EC2
- **Process Management**: PM2
- **Domain**: openlearn.org.in

### Staging Environment (Render Free)
- **Staging API**: Render Web Service (Free)
- **Database**: Neon PostgreSQL (Free)
- **Domain**: staging-openlearn.onrender.com

### Auxiliary Services (Render Free)
- **Status Monitor**: Render Web Service (Free)
- **Health Checker**: Render Cron Job (Free)

---

## 📋 Prerequisites

### Local Development Setup
- Node.js 18+
- Docker & Docker Compose
- Git
- AWS Account (Free Tier)
- Render Account (Free)

### Required Accounts & Services
1. **AWS Account** - For EC2 instance
2. **Render Account** - For staging and auxiliary services
3. **Domain Provider** - For openlearn.org.in
4. **GitHub Account** - For CI/CD
5. **Neon/ElephantSQL** - For staging database (optional)

---

## 🏁 Step-by-Step Deployment

### Phase 1: AWS EC2 Setup

#### 1.1 Launch EC2 Instance

```bash
# Launch t2.micro instance with Ubuntu 22.04 LTS
# Security Group: Allow ports 22, 80, 443
# Key Pair: Create/use existing SSH key
```

#### 1.2 Connect to EC2

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

#### 1.3 Run Setup Script

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-username/openlearn-js/main/deployment/scripts/setup-ec2.sh | bash

# Or clone repository and run locally
git clone https://github.com/your-username/openlearn-js.git
cd openlearn-js
chmod +x deployment/scripts/setup-ec2.sh
./deployment/scripts/setup-ec2.sh
```

### Phase 2: Domain & DNS Configuration

#### 2.1 Point Domain to EC2

```bash
# Add A record in your DNS provider
# openlearn.org.in -> YOUR_EC2_IP
# www.openlearn.org.in -> YOUR_EC2_IP
```

#### 2.2 Setup SSL Certificate

```bash
# Run Certbot for SSL
sudo certbot --nginx -d openlearn.org.in -d www.openlearn.org.in
```

### Phase 3: Database Setup

#### 3.1 Configure PostgreSQL

```bash
# Access PostgreSQL
sudo docker exec -it openlearn-postgres psql -U postgres

# Create production database
CREATE DATABASE openlearn_prod;
CREATE USER openlearn_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE openlearn_prod TO openlearn_user;
\\q
```

#### 3.2 Update Environment Variables

```bash
# Edit environment file
nano /home/ubuntu/openlearn/.env

# Update with your secure values
DATABASE_URL="postgresql://openlearn_user:your_secure_password@localhost:5432/openlearn_prod"
JWT_SECRET="your_super_secure_jwt_secret_64_chars_long_minimum"
JWT_REFRESH_SECRET="your_super_secure_refresh_secret_64_chars_long_minimum"
REDIS_PASSWORD="your_secure_redis_password"
```

### Phase 4: Application Deployment

#### 4.1 Deploy Application

```bash
# Navigate to app directory
cd /home/ubuntu/openlearn

# Deploy your application
./deploy.sh main
```

#### 4.2 Verify Deployment

```bash
# Check status
./monitor.sh

# Check PM2 processes
pm2 status

# Check Docker containers
docker ps

# Test endpoints
curl https://openlearn.org.in/health
curl https://openlearn.org.in/api/status
```

### Phase 5: GitHub Actions CI/CD Setup

#### 5.1 Configure GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Production Secrets
EC2_HOST=your-ec2-ip-address
EC2_USER=ubuntu
EC2_PRIVATE_KEY=your-private-ssh-key-content

# Staging Secrets (Render)
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_ID=your-render-service-id
STAGING_URL=https://staging-openlearn.onrender.com
TEST_API_KEY=your-test-api-key
```

#### 5.2 Setup GitHub Environments

1. Go to repository Settings → Environments
2. Create `production` environment
3. Add protection rules (require reviews)
4. Create `staging` environment

### Phase 6: Staging Environment (Render)

#### 6.1 Setup Render Service

1. Connect GitHub repository to Render
2. Create Web Service with:
   - **Branch**: `develop`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### 6.2 Configure Staging Environment Variables

```bash
NODE_ENV=staging
DATABASE_URL=your-neon-or-elephantsql-connection-string
JWT_SECRET=staging-jwt-secret
JWT_REFRESH_SECRET=staging-refresh-secret
CORS_ORIGIN=https://staging-openlearn.onrender.com
```

---

## 🔧 Advanced Configuration

### Monitoring & Logging

#### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# System monitoring
./monitor.sh
```

#### Log Management

```bash
# Application logs location
/home/ubuntu/openlearn/logs/

# Nginx logs
/var/log/nginx/

# System logs
journalctl -u docker
```

### Backup Strategy

#### Automated Backups

```bash
# Database backup (runs daily at 2 AM)
0 2 * * * /home/ubuntu/openlearn/backup.sh

# Manual backup
./backup.sh
```

#### Backup Storage

```bash
# Local backups
/home/ubuntu/backups/

# Backup to S3 (optional)
aws s3 sync /home/ubuntu/backups/ s3://openlearn-backups/
```

### Security Hardening

#### Firewall Configuration

```bash
# UFW status
sudo ufw status

# Add custom rules
sudo ufw allow from trusted-ip to any port 5432
```

#### SSH Security

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

#### SSL/TLS Configuration

```bash
# Test SSL configuration
sudo nginx -t

# Renew SSL certificates
sudo certbot renew --dry-run
```

---

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs openlearn-api

# Restart application
pm2 restart openlearn-api
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker ps | grep postgres

# Check database connectivity
docker exec openlearn-postgres pg_isready -U postgres

# View database logs
docker logs openlearn-postgres
```

#### Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

#### Memory Issues (t2.micro)

```bash
# Check memory usage
free -h

# Check swap
swapon --show

# Add swap if needed
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Optimization

#### Database Optimization

```bash
# PostgreSQL configuration for t2.micro
# Edit postgresql.conf
shared_buffers = 128MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
```

#### Application Optimization

```bash
# PM2 configuration for low memory
max_memory_restart = 400M
instances = 1
exec_mode = fork
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring

```bash
# Run monitoring script
./monitor.sh

# Check system resources
htop

# Check disk space
df -h

# Check application health
curl https://openlearn.org.in/health
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean up old logs
pm2 flush

# Check SSL certificate expiry
sudo certbot certificates

# Clean up old Docker images
docker system prune -f
```

### Monthly Tasks

```bash
# Review backup integrity
ls -la /home/ubuntu/backups/

# Update Node.js and npm
npm update -g

# Review security logs
sudo grep "authentication failure" /var/log/auth.log
```

---

## 🔄 Deployment Workflow

### Development Flow

1. **Feature Development**: Work on feature branches
2. **Pull Request**: Create PR to `develop` branch
3. **Staging Deployment**: Auto-deploy to Render staging
4. **Testing**: Run integration tests on staging
5. **Production Deployment**: Merge to `main` → Auto-deploy to EC2

### Rollback Procedure

```bash
# SSH to EC2
ssh ubuntu@your-ec2-ip

# Navigate to app directory
cd /home/ubuntu/openlearn

# Rollback to previous version
ln -nfs previous current
pm2 reload ecosystem.config.js --env production

# Or rollback to specific release
ln -nfs releases/specific-hash current
pm2 reload ecosystem.config.js --env production
```

---

## 💰 Cost Optimization

### EC2 Cost Management

- **Instance Type**: t2.micro (Free Tier)
- **Storage**: 30GB EBS (Free Tier)
- **Data Transfer**: 15GB/month (Free Tier)

### Render Free Tier Usage

- **Web Services**: 750 hours/month (Free)
- **Databases**: 1GB storage (Free)
- **Bandwidth**: 100GB/month (Free)

### Additional Free Services

- **Neon PostgreSQL**: 3GB storage (Free)
- **Cloudflare**: CDN and DDoS protection (Free)
- **GitHub Actions**: 2000 minutes/month (Free)

---

## 📈 Scaling Strategy

### When to Scale Up

- **CPU Usage** consistently > 80%
- **Memory Usage** consistently > 90%
- **Response Time** > 2 seconds
- **Error Rate** > 1%

### Scaling Options

1. **Vertical Scaling**: Upgrade to t3.small
2. **Horizontal Scaling**: Add load balancer + multiple instances
3. **Database Scaling**: Move to RDS or managed PostgreSQL
4. **CDN**: Add CloudFront for static assets

---

## 🎯 Next Steps

1. **Complete EC2 Setup**: Run setup script
2. **Configure Domain**: Point DNS to EC2
3. **Setup SSL**: Run Certbot
4. **Deploy Application**: Use deployment script
5. **Configure CI/CD**: Setup GitHub Actions
6. **Test Everything**: Verify all endpoints
7. **Monitor**: Setup monitoring and alerts

---

## 📞 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/openlearn-js/issues)
- **Website**: [openlearn.org.in](https://openlearn.org.in)
- **Status**: [openlearn.org.in/status-page](https://openlearn.org.in/status-page)

---

*This deployment guide provides a production-ready setup optimized for cost-effectiveness while maintaining professional standards. Regular monitoring and maintenance ensure optimal performance and security.*
