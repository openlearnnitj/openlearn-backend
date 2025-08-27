# 🚀 OpenLearn CI/CD Workflow Guide

## 📋 Overview

This repository uses a **GitFlow-inspired** branching strategy with automated CI/CD pipelines for testing and deployment.

## 🌿 Branching Strategy

### **Main Branches:**
- **`main`** - Production branch (always deployable)
- **`develop`** - Development integration branch

### **Workflow:**
1. **Feature Development** → Work on `develop` branch
2. **Pull Request** → Create PR from `develop` to `main`
3. **Code Review** → Team reviews and approves PR
4. **Merge to Main** → Auto-deployment to production triggers

## 🔄 CI/CD Pipelines

### 1. **Main CI/CD Pipeline** (`.github/workflows/main.yml`)

**Triggers:**
- ✅ Push to `main` → Full pipeline (test + deploy)
- ✅ Push to `develop` → Test only
- ✅ Pull Request to `main` → Test only

**Jobs:**
- 🧪 **Test & Build**: ESLint, TypeScript build, unit tests
- 🚀 **Deploy**: Only runs on `main` branch
- 📢 **Notify**: Deployment status

### 2. **PR Validation Pipeline** (`.github/workflows/pr-validation.yml`)

**Triggers:**
- ✅ Pull Request opened/updated to `main`

**Jobs:**
- 📋 **PR Validation**: Title format, description check
- 🧪 **Test PR Changes**: Full test suite
- 🔒 **Security Check**: Vulnerability scanning
- 💬 **PR Comment**: Auto-updates with results

### 3. **Develop Branch Pipeline** (`.github/workflows/develop.yml`)

**Triggers:**
- ✅ Push to `develop`

**Jobs:**
- 🧪 **Test Develop**: Ensures develop branch is stable
- 📢 **Notify**: Test results

## 🔧 Required GitHub Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_PRIVATE_KEY` | Private SSH key for EC2 access | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_HOST` | EC2 server IP or domain | `192.168.1.100` or `yourdomain.com` |
| `EC2_USER` | SSH username for EC2 | `ubuntu` |

## 🚀 Deployment Process

### **Automatic Deployment:**
1. Code is pushed to `main` branch
2. Tests run automatically
3. If tests pass → Deploy to production
4. Health checks verify deployment
5. Rollback if health checks fail

### **Deployment Steps:**
1. 📥 Pull latest code from `main`
2. 📦 Install production dependencies
3. 🏗️ Build TypeScript application
4. 🛑 Stop existing Docker containers
5. 🧹 Clean up Docker resources
6. 🚀 Build and start new containers
7. 🗄️ Run database migrations
8. 🏥 Perform health checks
9. ✅ Verify deployment success

## 📝 Development Workflow

### **For New Features:**

```bash
# 1. Start from develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch (optional)
git checkout -b feature/your-feature-name

# 3. Make your changes
# ... code changes ...

# 4. Test locally
npm test
npm run build

# 5. Commit and push to develop
git add .
git commit -m "feat: add your feature description"
git push origin develop  # or feature branch

# 6. Create Pull Request
# develop → main (via GitHub UI)
```

### **For Bug Fixes:**

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create fix branch (optional)
git checkout -b fix/bug-description

# 3. Fix the issue
# ... fix code ...

# 4. Test the fix
npm test

# 5. Commit and push
git commit -m "fix: resolve bug description"
git push origin develop

# 6. Create Pull Request
# develop → main
```

## 🔍 Pull Request Guidelines

### **PR Title Format:**
```
type(scope): description

Examples:
- feat: add user authentication
- fix(api): resolve database connection issue
- docs: update API documentation
- refactor(auth): improve token validation
```

### **PR Description Should Include:**
- 📋 **What**: What changes were made
- 🎯 **Why**: Why these changes were necessary
- 🧪 **Testing**: How the changes were tested
- 📸 **Screenshots**: If UI changes (optional)

### **Before Creating PR:**
- ✅ All tests pass locally
- ✅ Code follows project style (ESLint passes)
- ✅ No security vulnerabilities
- ✅ Database migrations work (if applicable)

## 🏥 Health Checks & Monitoring

### **Health Endpoints:**
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /ping` - Simple ping/pong

### **Deployment Verification:**
The CI/CD pipeline automatically:
1. Waits for containers to start
2. Runs database migrations
3. Performs health checks (10 attempts)
4. Verifies API responsiveness
5. Rolls back if any step fails

## 🚨 Troubleshooting

### **If Deployment Fails:**

1. **Check GitHub Actions logs**:
   - Go to Actions tab in GitHub
   - Click on failed workflow
   - Review deployment step logs

2. **Check server status**:
   ```bash
   ssh ubuntu@your-server
   cd /home/ubuntu/openlearn-backend
   ./scripts/troubleshoot.sh
   ```

3. **Manual recovery**:
   ```bash
   # On server
   docker-compose down
   docker-compose up -d --build
   ```

### **Common Issues:**

| Issue | Solution |
|-------|----------|
| Tests fail | Fix failing tests before merging |
| Build fails | Check TypeScript compilation errors |
| Deploy fails | Check server disk space, Docker status |
| Health check fails | Verify database connection, container logs |

## 🎯 Best Practices

### **Code Quality:**
- ✅ Write tests for new features
- ✅ Follow TypeScript strict mode
- ✅ Use ESLint and fix warnings
- ✅ Add proper error handling

### **Database:**
- ✅ Create migrations for schema changes
- ✅ Test migrations on staging first
- ✅ Never edit migrations after merge

### **Security:**
- ✅ Never commit secrets or passwords
- ✅ Use environment variables
- ✅ Regular dependency updates
- ✅ Monitor security advisories

### **Deployment:**
- ✅ Test in development environment
- ✅ Use feature flags for risky changes
- ✅ Monitor logs after deployment
- ✅ Have rollback plan ready

## 🔗 Quick Links

- 🏠 **Production**: http://your-production-domain.com
- 🧪 **Staging**: http://your-staging-domain.com (if available)
- 📊 **GitHub Actions**: https://github.com/your-org/openlearn-backend/actions
- 🐛 **Issues**: https://github.com/your-org/openlearn-backend/issues

## 📞 Support

If you encounter issues with the CI/CD pipeline:

1. 📖 Check this documentation
2. 🔍 Review GitHub Actions logs
3. 🛠️ Run troubleshooting script on server
4. 💬 Ask team for help
5. 🐛 Create issue if it's a pipeline problem

---

*This documentation is maintained by the development team. Please keep it updated as the workflow evolves.*
