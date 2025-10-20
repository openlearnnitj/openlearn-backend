# Pipeline Fixes Applied

## Issues Found and Fixed

### 1. Wrong Dockerfile Being Copied
**Issue:** Workflow was copying old `Dockerfile` instead of `Dockerfile.production`

**Fixed:**
```yaml
# Before
cp Dockerfile deploy-package/

# After
cp Dockerfile.production deploy-package/
```

### 2. Migration Running Against Stopped Database
**Issue:** Deployment script was:
- Stopping all containers with `docker-compose down`
- Then trying to run migrations (but database is stopped)
- This would fail because there's no database to migrate

**Fixed:** New deployment flow:
1. Build Docker image from Dockerfile.production
2. Start database and Redis first
3. Wait for database to be ready (15 seconds)
4. Run migrations against running database
5. Start application container
6. Health checks

### 3. Using --no-build Flag Incorrectly
**Issue:** Using `docker-compose up -d --no-build` assumes image already exists, but we're deploying new code with new Dockerfile.production

**Fixed:** 
- Added `docker-compose build app` step
- Changed to `docker-compose up -d app` (starts specific service)

## Deployment Flow (Corrected)

```
1. Download deployment package from GitHub Actions
2. Extract to /releases/[commit-sha]
3. Backup current deployment
4. Update symlink: current -> new release
5. Build Docker image (lightweight, just copies pre-built files)
6. Start postgres and redis
7. Wait for database readiness
8. Run migrations
9. Start app container
10. Health check (10 attempts × 10 seconds)
11. On success: cleanup old releases
12. On failure: rollback to backup
```

## About the Old Dockerfile

### Should It Be Deleted?
**YES, the old Dockerfile should be deleted** for these reasons:

1. Not used by the pipeline
2. Causes confusion (two Dockerfiles with different approaches)
3. Old Dockerfile builds from source (npm ci, npm run build)
4. New Dockerfile.production uses pre-built artifacts
5. docker-compose.yml references Dockerfile.production
6. Pipeline now copies Dockerfile.production

### What the Old Dockerfile Did
```dockerfile
# Old Dockerfile (no longer needed)
- COPY package.json
- RUN npm ci (installs all deps)
- COPY source code
- RUN npx prisma generate
- RUN npm run build
- CMD node dist/server.js
```

### What Dockerfile.production Does
```dockerfile
# Dockerfile.production (current, correct)
- COPY dist/ (pre-built)
- COPY node_modules/ (pre-installed)
- COPY prisma/
- CMD node dist/server.js
```

The key difference: Dockerfile.production expects everything to be pre-built (which happens on GitHub Actions), making it much lighter and faster.

## To Delete Old Dockerfile

```bash
rm Dockerfile
git add Dockerfile
git commit -m "Remove old Dockerfile, using Dockerfile.production for deployments"
git push
```

## Validation Checklist

Before deploying with the fixed pipeline:

- [x] Workflow copies Dockerfile.production
- [x] Deployment builds Docker image before starting
- [x] Database starts before migrations
- [x] Migrations run against live database
- [x] Health checks run after app starts
- [x] Rollback works correctly
- [ ] Old Dockerfile removed (to do)

## Key Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| Dockerfile copied | Dockerfile (builds from source) | Dockerfile.production (uses pre-built) |
| Migration timing | After docker-compose down | After database starts |
| Image building | Assumed to exist (--no-build) | Explicitly builds |
| Database startup | All services together | Database first, then app |
| Rollback | Uses --no-build | Uses docker-compose up -d |

## Testing the Fixes

1. Ensure GitHub secrets are configured
2. Push to main branch to trigger deployment
3. Monitor GitHub Actions logs
4. SSH to EC2 and watch: `docker-compose logs -f`
5. Verify health check passes
6. Confirm application is accessible

## Expected Behavior

With these fixes:
- Build happens on GitHub Actions (no OOM risk)
- Docker image builds quickly on EC2 (just copies files)
- Migrations run safely against live database
- Health checks verify deployment success
- Automatic rollback if anything fails
- Downtime: approximately 30-60 seconds
