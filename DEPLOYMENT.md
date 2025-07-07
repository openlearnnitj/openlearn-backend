# 🚀 OpenLearn AWS Deployment - Quick Start Guide

## Overview

This guide provides a **complete professional deployment solution** for OpenLearn using a cost-effective approach:

- **Production**: Single AWS EC2 t2.micro instance (Free Tier)
- **Staging**: Render free tier
- **CI/CD**: GitHub Actions with automated deployments
- **Monitoring**: Comprehensive health checks and system monitoring

## 📁 Deployment Structure

```
deployment/
├── docker/
│   ├── docker-compose.ec2.yml     # Production Docker setup
│   └── Dockerfile.production      # Optimized production image
├── nginx/
│   └── nginx.conf                 # Production Nginx configuration
└── scripts/
    ├── setup-ec2.sh              # Complete EC2 setup automation
    ├── system-monitor.sh          # Comprehensive monitoring
    └── health-check.sh            # Basic health checks

.github/workflows/
├── aws-deploy.yml                 # Production CI/CD pipeline
└── staging-deploy.yml             # Staging deployment

environments/
├── .env.production               # Production environment variables
└── .env.staging                  # Staging environment variables

ecosystem.config.js               # PM2 process management
LICENSE                          # GNU GPL v3 License
CONTRIBUTING.md                  # Contribution guidelines
```

## 🏁 Quick Deployment Steps

### 1. AWS EC2 Setup (One-time)

```bash
# 1. Launch EC2 t2.micro instance with Ubuntu 22.04
# 2. Configure Security Group (ports 22, 80, 443)
# 3. SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 4. Run the automated setup script
curl -fsSL https://raw.githubusercontent.com/your-username/openlearn-js/main/deployment/scripts/setup-ec2.sh | bash
```

### 2. Domain Configuration

```bash
# Point your domain to EC2 IP
# openlearn.org.in -> YOUR_EC2_IP
# www.openlearn.org.in -> YOUR_EC2_IP

# Setup SSL certificate
sudo certbot --nginx -d openlearn.org.in -d www.openlearn.org.in
```

### 3. Environment Configuration

```bash
# Update production environment variables
nano /home/ubuntu/openlearn/.env

# Essential variables to change:
DATABASE_URL="postgresql://user:SECURE_PASSWORD@localhost:5432/openlearn_prod"
JWT_SECRET="your_64_character_secure_jwt_secret"
JWT_REFRESH_SECRET="your_64_character_secure_refresh_secret"
REDIS_PASSWORD="your_secure_redis_password"
```

### 4. GitHub Repository Setup

```bash
# Add GitHub Secrets (Repository Settings > Secrets)
EC2_HOST=your-ec2-ip-address
EC2_USER=ubuntu
EC2_PRIVATE_KEY=your-ssh-private-key-content

# For staging (Render)
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_ID=your-render-service-id
STAGING_URL=https://your-app.onrender.com
```

### 5. Deploy Application

```bash
# Push to main branch triggers automatic deployment
git push origin main

# Or manual deployment on EC2
cd /home/ubuntu/openlearn
./deploy.sh main
```

## 🔧 Key Features

### Production Environment (EC2)
- **Containerized Setup**: Docker Compose with PostgreSQL, Redis, Nginx
- **Process Management**: PM2 with clustering and auto-restart
- **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- **Security**: UFW firewall, fail2ban, rate limiting
- **Monitoring**: Comprehensive health checks and system monitoring
- **Backups**: Automated daily database and file backups

### CI/CD Pipeline
- **Automated Testing**: Unit tests, integration tests, linting
- **Build Process**: TypeScript compilation, dependency optimization
- **Deployment**: Zero-downtime deployments with health checks
- **Rollback**: Automatic rollback on deployment failure
- **Environments**: Separate staging (Render) and production (EC2) workflows

### Monitoring & Maintenance
- **System Monitor**: CPU, memory, disk, network monitoring
- **Application Health**: Endpoint monitoring, response time tracking
- **Log Analysis**: Error tracking, performance metrics
- **Security Monitoring**: Failed login attempts, firewall status
- **Automated Alerts**: Status notifications via GitHub Actions

## 📊 System Monitoring

### Monitor Application
```bash
# Comprehensive system monitor
./deployment/scripts/system-monitor.sh

# Basic health check
./deployment/scripts/health-check.sh

# PM2 process monitoring
pm2 monit

# View logs
pm2 logs
```

### Key URLs
- **Production**: https://openlearn.org.in
- **Health Check**: https://openlearn.org.in/health
- **Status Page**: https://openlearn.org.in/status-page
- **API Base**: https://openlearn.org.in/api

## 🛠️ Maintenance Commands

### Daily Operations
```bash
# Check system status
./deployment/scripts/system-monitor.sh

# View application logs
pm2 logs --lines 50

# Check Docker containers
docker ps

# Monitor system resources
htop
```

### Weekly Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean up old logs
pm2 flush

# Restart application (if needed)
pm2 restart all

# Check SSL certificate
sudo certbot certificates
```

### Backup & Recovery
```bash
# Manual backup
./backup.sh

# View backups
ls -la /home/ubuntu/backups/

# Restore database (if needed)
docker exec -i openlearn-postgres psql -U postgres openlearn_prod < backup.sql
```

## 🚨 Troubleshooting

### Application Issues
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs --err

# Restart application
pm2 restart openlearn-api

# Check health endpoint
curl https://openlearn.org.in/health
```

### Docker Issues
```bash
# Check container status
docker ps -a

# View container logs
docker logs openlearn-postgres
docker logs openlearn-redis
docker logs openlearn-nginx

# Restart containers
docker-compose -f deployment/docker/docker-compose.ec2.yml restart
```

### Database Issues
```bash
# Check PostgreSQL connectivity
docker exec openlearn-postgres pg_isready -U postgres

# Access database
docker exec -it openlearn-postgres psql -U postgres openlearn_prod

# Check database size
docker exec openlearn-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('openlearn_prod'));"
```

## 💰 Cost Optimization

### AWS Free Tier Usage
- **EC2 t2.micro**: 750 hours/month (Free)
- **EBS Storage**: 30GB (Free)
- **Data Transfer**: 15GB outbound (Free)

### Render Free Tier
- **Web Service**: 750 hours/month (Free)
- **Database**: 1GB PostgreSQL (Free)
- **Bandwidth**: 100GB/month (Free)

### Estimated Monthly Costs
- **EC2 Free Tier**: $0
- **Domain**: ~$10-15/year
- **Additional services**: $0 (using free tiers)

## 📈 Scaling Options

### When to Scale
- CPU usage consistently > 80%
- Memory usage consistently > 90%
- Response times > 2 seconds
- Database size > 20GB

### Scaling Strategies
1. **Vertical**: Upgrade to t3.small ($10-15/month)
2. **Horizontal**: Add load balancer + multiple instances
3. **Database**: Migrate to AWS RDS
4. **CDN**: Add CloudFront for static assets

## 🔐 Security Best Practices

### Server Security
- ✅ UFW firewall configured
- ✅ fail2ban for intrusion prevention
- ✅ SSH key-only authentication
- ✅ Automatic security updates
- ✅ Regular security monitoring

### Application Security
- ✅ HTTPS with Let's Encrypt
- ✅ JWT authentication with refresh tokens
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ Security headers (Helmet.js)
- ✅ CORS protection

## 📞 Support

### Getting Help
- **Documentation**: [/docs](/docs) directory
- **Issues**: [GitHub Issues](https://github.com/your-username/openlearn-js/issues)
- **Status Page**: [openlearn.org.in/status-page](https://openlearn.org.in/status-page)

### Emergency Procedures
- **Rollback**: Automatic via CI/CD or manual symlink change
- **Database Recovery**: Automated daily backups available
- **Status Updates**: Real-time status page monitoring

---

This deployment setup provides enterprise-level reliability and monitoring while staying within free tier limits. The automated CI/CD pipeline ensures consistent, reliable deployments with proper testing and rollback capabilities.
