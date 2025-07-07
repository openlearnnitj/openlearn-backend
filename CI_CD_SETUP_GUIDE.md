# 🚀 Complete CI/CD Setup Guide for OpenLearn Backend

This guide will help you set up a complete CI/CD pipeline for your OpenLearn backend with GitHub Actions and AWS EC2.

## 📋 Prerequisites

✅ **You Already Have:**
- AWS EC2 t2.micro instance running
- OpenLearn backend repository on GitHub (currently with `master` branch)
- EC2 setup completed with `setup-ec2.sh`

## 🌿 Step 1: Create Git Branch Structure

Currently you only have the `master` branch. Let's create a proper branching strategy:

### **On Your Local Machine:**

```bash
# Clone your repository (if not already)
git clone https://github.com/openlearnnitj/openlearn-backend.git
cd openlearn-backend

# Create and push develop branch
git checkout -b develop
git push -u origin develop

# Create and push staging branch
git checkout -b staging
git push -u origin staging

# Switch back to master
git checkout master
```

### **Branch Strategy:**
- **`master`** → Production deployments (auto-deploy to EC2)
- **`develop`** → Development work (runs tests only)
- **`staging`** → Pre-production testing (runs tests only)

## 🔐 Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

**Add these Repository Secrets:**

```bash
# EC2 Connection Details
EC2_HOST=your-ec2-public-ip-address
EC2_USER=ubuntu
EC2_PRIVATE_KEY=your-ec2-private-key-content

# Optional: Slack notifications (if you want them)
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

### **How to Get Your EC2 Private Key:**

```bash
# On your local machine (where you have the .pem file)
cat ~/.ssh/your-ec2-key.pem
```

Copy the entire content (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) and paste it into the `EC2_PRIVATE_KEY` secret.

## 🎯 Step 3: Set Up Environment on EC2

### **SSH to Your EC2 Instance:**

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### **Prepare the Deployment Directory:**

```bash
# Create the deployment directory
mkdir -p /home/ubuntu/openlearn-backend
cd /home/ubuntu/openlearn-backend

# Clone your repository
git clone https://github.com/openlearnnitj/openlearn-backend.git .

# Create environment file
cp environments/.env.micro .env

# Edit with your actual values
nano .env
```

**Update these values in `.env`:**
```bash
POSTGRES_PASSWORD=YourStrongDBPassword123!
DATABASE_URL=postgresql://postgres:YourStrongDBPassword123!@postgres:5432/openlearn_prod
JWT_SECRET=your_super_secure_jwt_secret_minimum_64_characters_random_string_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_minimum_64_characters_random_string_here
CORS_ORIGIN=http://YOUR_EC2_IP:3000,https://yourdomain.com
```

### **Test Manual Deployment:**

```bash
# Make sure Docker works
docker ps

# If Docker permission error:
sudo usermod -aG docker ubuntu
newgrp docker

# Test deployment
chmod +x deploy.sh
./deploy.sh
```

**Expected Result:** Your API should be running at `http://your-ec2-ip:3000/health`

## 🚀 Step 4: Configure GitHub Repository Settings

### **1. Set Default Branch to `main` (Recommended):**

Go to GitHub → Settings → General → Default branch → Change to `main`

```bash
# On your local machine, rename master to main
git branch -m master main
git push -u origin main
git push origin --delete master
```

### **2. Configure Branch Protection:**

Go to GitHub → Settings → Branches → Add rule:

**For `main` branch:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require pull request reviews before merging

## 🔧 Step 5: Test Your CI/CD Pipeline

### **Test 1: Development Workflow**

```bash
# Create a feature branch
git checkout develop
git checkout -b feature/test-cicd

# Make a small change
echo "# Test CI/CD" >> README.md
git add README.md
git commit -m "test: CI/CD pipeline setup"

# Push and create PR
git push -u origin feature/test-cicd
```

Go to GitHub and create a Pull Request from `feature/test-cicd` to `develop`.

**Expected Result:** Tests should run automatically ✅

### **Test 2: Production Deployment**

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

**Expected Result:** 
- Tests run ✅
- Deployment to EC2 happens ✅  
- Health check passes ✅

## 📊 Step 6: Monitor Your Deployments

### **GitHub Actions Dashboard:**
- Go to your repository → Actions tab
- View running/completed workflows
- Check logs for any failures

### **EC2 Monitoring:**

```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Check deployment status
cd /home/ubuntu/openlearn-backend
docker-compose -f deployment/docker/docker-compose.micro.yml ps

# Check logs
docker-compose -f deployment/docker/docker-compose.micro.yml logs -f

# Check API health
curl http://localhost:3000/health
```

## 🔄 Step 7: Workflow Overview

### **Your CI/CD Pipeline Flow:**

```
feature/branch → develop → main → 🚀 EC2 Production
      ↓           ↓        ↓
   [Tests]    [Tests]  [Tests + Deploy]
```

### **What Happens When:**

1. **Push to any feature branch:** Nothing (tests run on PR)
2. **Create PR to develop/main:** Tests run automatically
3. **Push to develop:** Tests run (no deployment)
4. **Push to main:** Tests run + Auto-deploy to EC2

### **Deployment Process (Automatic):**
1. 🧪 Run tests
2. 📥 SSH to EC2
3. 📦 Pull latest code from GitHub
4. 🏗️ Run `./deploy.sh` (Docker build + start)
5. 🏥 Health check API
6. ✅ Success notification

## 🚨 Troubleshooting

### **Common Issues:**

**1. EC2 Connection Fails:**
```bash
# Check your secrets
EC2_HOST=your-actual-ip (not domain)
EC2_USER=ubuntu
EC2_PRIVATE_KEY=complete-key-content
```

**2. Docker Permission Error:**
```bash
# Fix on EC2
sudo usermod -aG docker ubuntu
logout && login
```

**3. Environment File Missing:**
```bash
# Create on EC2
cd /home/ubuntu/openlearn-backend
cp environments/.env.micro .env
nano .env  # Update with real values
```

**4. Deployment Health Check Fails:**
```bash
# Debug on EC2
cd /home/ubuntu/openlearn-backend
docker-compose -f deployment/docker/docker-compose.micro.yml logs
curl http://localhost:3000/health
```

## 🎉 Success Checklist

After setup, you should have:

- ✅ **Branching Strategy:** `main`, `develop`, `staging` branches
- ✅ **GitHub Secrets:** EC2 connection details configured
- ✅ **EC2 Environment:** `.env` file with real values
- ✅ **Working Deployment:** API responding at `http://your-ec2-ip:3000/health`
- ✅ **Automated Pipeline:** Push to `main` = auto-deploy
- ✅ **Health Monitoring:** Deployment success/failure notifications

## 📚 Daily Workflow

### **For Development:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/new-feature
# Make changes...
git commit -m "feat: add new feature"
git push -u origin feature/new-feature
# Create PR to develop on GitHub
```

### **For Production Release:**
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
# 🚀 Auto-deployment happens!
```

### **Emergency Rollback:**
```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/openlearn-backend

# Quick rollback
git log --oneline -5  # See recent commits
git checkout PREVIOUS_COMMIT_HASH
./deploy.sh
```

---

## 🔗 Quick Links

- **GitHub Actions:** `https://github.com/yourusername/openlearn-backend/actions`
- **API Health Check:** `http://your-ec2-ip:3000/health`
- **EC2 SSH:** `ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip`

**🎯 Your CI/CD pipeline is now ready!** Every push to `main` will automatically deploy to your EC2 instance. 🚀
