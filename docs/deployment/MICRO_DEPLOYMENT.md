# 🚀 OpenLearn Micro Instance Deployment Guide

**Optimized for small instances with ~950MB RAM and 2 CPU cores**

## 📁 Project Structure

```
openlearn-js/
├── deployment/
│   ├── docker/
│   │   ├── docker-compose.micro.yml      # Lightweight Docker setup
│   │   └── postgres-low-memory.conf      # PostgreSQL config for 200MB
│   ├── scripts/
│   │   └── deploy-micro.sh               # Deployment automation
│   └── nginx/                            # Nginx configs (not used in micro)
├── environments/
│   └── .env.micro                        # Environment variables
├── src/                                  # Application source code
├── prisma/                              # Database schema & migrations
├── deploy.sh                            # Main deployment script
└── package.json
```

## 🔧 Complete Deployment Commands

### **Step 1: Prepare Environment**

```bash
# Clone the repository (if not already done)
git clone https://github.com/openlearnnitj/openlearn-backend.git
cd openlearn-backend

# Copy and edit environment variables
cp environments/.env.micro environments/.env.local
nano environments/.env.micro
```

**Required changes in `environments/.env.micro`:**
```bash
# Change this to a strong password
POSTGRES_PASSWORD=MyStr0ng_DB_P@ssw0rd_2024!

# Update database URL with your password
DATABASE_URL=postgresql://postgres:MyStr0ng_DB_P@ssw0rd_2024!@postgres:5432/openlearn_prod

# Generate strong JWT secrets (64+ characters each)
JWT_SECRET=your_super_secure_jwt_secret_minimum_64_characters_long_random_string_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_minimum_64_characters_long_random_string_here

# Update CORS for your domain/IP
CORS_ORIGIN=http://localhost:3000,http://YOUR_SERVER_IP:3000
```

### **Step 2: Deploy Everything**

```bash
# Run the complete deployment
./deploy.sh
```

This single command will:
- ✅ Load environment variables
- ✅ Stop old containers  
- ✅ Build and start Postgres + API
- ✅ Run database migrations
- ✅ Verify all services are healthy

### **Step 3: Verify Deployment**

```bash
# Check all services are running
docker-compose -f deployment/docker/docker-compose.micro.yml ps

# Test API health
curl http://localhost:3000/health

# Check resource usage
docker stats --no-stream
```

**Expected Resource Usage:**
- **Postgres**: ~150-200MB RAM
- **API**: ~300-500MB RAM  
- **Total**: ~500-700MB (within 950MB limit)

## 📊 Management Commands

### **Daily Operations**
```bash
# View real-time logs
docker-compose -f deployment/docker/docker-compose.micro.yml logs -f

# Restart everything
./deploy.sh

# Restart just the API
docker-compose -f deployment/docker/docker-compose.micro.yml restart app

# Stop all services
docker-compose -f deployment/docker/docker-compose.micro.yml down
```

### **Database Operations**
```bash
# Access database directly
docker-compose -f deployment/docker/docker-compose.micro.yml exec postgres psql -U postgres -d openlearn_prod

# Run new migrations
docker-compose -f deployment/docker/docker-compose.micro.yml exec app npx prisma migrate deploy

# Reset database (⚠️ DANGER: Deletes all data)
docker-compose -f deployment/docker/docker-compose.micro.yml exec app npx prisma migrate reset --force
```

### **Monitoring**
```bash
# System resources
free -h && df -h

# Docker container resources  
docker stats

# Application logs
docker-compose -f deployment/docker/docker-compose.micro.yml logs app --tail=50
```

## 🚨 Troubleshooting

### **Container Won't Start**
```bash
# Check logs for errors
docker-compose -f deployment/docker/docker-compose.micro.yml logs

# Clean up and restart
docker system prune -f
./deploy.sh
```

### **Out of Memory**
```bash
# Check memory usage
free -h
docker stats --no-stream

# Clean up Docker resources
docker system prune -af
sudo systemctl restart docker
./deploy.sh
```

### **Database Connection Failed**
```bash
# Check if Postgres is running
docker-compose -f deployment/docker/docker-compose.micro.yml exec postgres pg_isready -U postgres

# Check environment variables
grep -E "(POSTGRES_|DATABASE_)" environments/.env.micro

# Restart database
docker-compose -f deployment/docker/docker-compose.micro.yml restart postgres
```

### **API Not Responding**
```bash
# Check app logs
docker-compose -f deployment/docker/docker-compose.micro.yml logs app

# Check if port is accessible
netstat -tlnp | grep 3000
curl -v http://localhost:3000/health

# Restart API
docker-compose -f deployment/docker/docker-compose.micro.yml restart app
```

## ⚡ Performance Optimization

### **Memory Management**
- Total allocation: ~700MB of 950MB available
- Postgres: Limited to 200MB with optimized config
- API: Limited to 500MB with Node.js optimization
- Buffer: 250MB for system operations

### **Regular Maintenance**
```bash
# Weekly cleanup (run every Sunday)
docker system prune -f
./deploy.sh

# Monthly security updates
sudo apt update && sudo apt upgrade -y
sudo reboot
```

## 🔒 Security Checklist

- ✅ Strong database password (20+ characters)
- ✅ Strong JWT secrets (64+ characters)  
- ✅ Database port not exposed externally
- ✅ Only API port (3000) accessible
- ✅ Regular system updates
- ✅ No Redis (removes attack surface)

## 📈 Monitoring Alerts

**Set up alerts for:**
- Memory usage > 80% (760MB)
- Disk usage > 90%
- API response time > 5 seconds
- Database connection failures

---

## 🆘 Emergency Commands

**If everything breaks:**
```bash
# Nuclear option - restart everything
docker-compose -f deployment/docker/docker-compose.micro.yml down -v
docker system prune -af
sudo reboot
# After reboot:
cd /path/to/openlearn-js && ./deploy.sh
```

**Quick health check:**
```bash
# One-liner system check
echo "Memory: $(free -h | awk '/^Mem:/ {print $3"/"$2}') | Disk: $(df -h / | awk 'NR==2{print $5}') | API: $(curl -s http://localhost:3000/health || echo 'FAILED')"
```
