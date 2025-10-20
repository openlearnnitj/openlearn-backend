# Prometheus & Grafana Quick Reference

## Your Questions Answered

### Q: Do we need to make prometheus.yml?
**✅ YES - Already created at `/prometheus.yml`**

This file tells Prometheus:
- Where to scrape metrics from (`app:3000/metrics`)
- How often to scrape (every 15 seconds)
- What labels to attach
- No authentication needed (internal Docker network)

### Q: Do we need to change docker-compose?
**✅ YES - Already updated**

Added two new services:
1. **prometheus** (port 9090) - Scrapes and stores metrics
2. **grafana** (port 3001) - Visualizes metrics

### Q: Do we need to restart Prometheus/Grafana when code is pushed?
**❌ NO - They keep running independently**

**Why?**
- Prometheus and Grafana are **separate containers** that only READ from your `/metrics` endpoint
- When you push code, only the `app` container restarts
- Prometheus automatically reconnects and continues scraping
- No data loss (metrics stored in Prometheus volume)

---

## Container Restart Matrix

| Action | App Container | Prometheus | Grafana |
|--------|--------------|------------|---------|
| Push code to GitHub | ✅ Restarts | ❌ Keeps running | ❌ Keeps running |
| Change prometheus.yml | ❌ No change | ✅ Need restart | ❌ No change |
| Change Grafana config | ❌ No change | ❌ No change | ✅ Need restart |
| Add new metrics to code | ✅ Restarts | ❌ Auto-detects | ❌ Auto-detects |
| Change .env variables | ✅ Need restart | Depends* | Depends* |

\* Only if the env var is used by that service

---

## Deployment Workflow

### When You Push Code:

```
1. GitHub Actions builds new image
         ↓
2. Deploys to EC2
         ↓
3. docker compose down app        ← Only stops app
         ↓
4. docker compose up -d app       ← Starts new app version
         ↓
5. Prometheus reconnects          ← Automatic
         ↓
6. Grafana keeps showing data     ← No interruption
```

**Result:** Zero downtime for monitoring!

---

## Key Files Summary

### Application Changes (in your code)
```
src/metrics/               ← Metrics definitions
src/middleware/            ← Metrics collection
src/routes/metrics.ts      ← /metrics endpoint
```

### Infrastructure (Docker/Config)
```
docker-compose.yml         ← Adds prometheus + grafana services
prometheus.yml             ← Prometheus scrape config
grafana/provisioning/      ← Auto-configures Grafana
.env                       ← Add GRAFANA_ADMIN_PASSWORD
```

---

## Quick Commands

### Start Everything
```bash
docker compose up -d
```

### Check Status
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs -f prometheus
docker compose logs -f grafana
docker compose logs -f app
```

### Restart Only Monitoring (if needed)
```bash
docker compose restart prometheus grafana
```

### Test Metrics Endpoint
```bash
# Inside Docker network (no auth)
docker compose exec prometheus wget -O- http://app:3000/metrics

# From outside (needs X-API-Secret)
curl -H "X-API-Secret: your-secret" http://localhost:3000/metrics
```

---

## Access URLs

| Service | URL | Port | Notes |
|---------|-----|------|-------|
| **App** | http://localhost:3000 | 3000 | Your API |
| **Metrics** | http://localhost:3000/metrics | 3000 | Prometheus format |
| **Prometheus** | http://localhost:9090 | 9090 | Metrics storage |
| **Grafana** | http://localhost:3001 | 3001 | Dashboards |

---

## Authentication Flow

### /metrics Endpoint Security:

**Internal (Prometheus → App):**
```
Prometheus (prometheus:9090)
    ↓
    scrapes http://app:3000/metrics
    ↓
    No X-Forwarded-For header
    ↓
    ✅ Allowed without auth (internal Docker network)
```

**External (Public → App):**
```
Public request
    ↓
    http://api.openlearn.org.in/metrics
    ↓
    Nginx adds X-Forwarded-For
    ↓
    ❌ Requires X-API-Secret header
```

**Logic:** If there's no proxy headers, it's an internal Docker request = safe.

---

## What Gets Monitored?

### ✅ Automatically Tracked:
- Every HTTP request (duration, status, route)
- Every database query (duration, operation, model)
- Every login attempt (success/failure/reason)
- Every JWT validation (valid/invalid/expired)
- Every rate limit check (allowed/blocked)
- Node.js health (memory, CPU, event loop)

### 📊 Example Metrics:
```
# HTTP request duration (in seconds)
openlearn_http_request_duration_seconds{method="GET",route="/api/users",status_code="200"} 0.045

# Database query count
openlearn_db_queries_total{operation="findMany",model="User",status="success"} 1523

# Login attempts
openlearn_auth_login_attempts_total{status="success"} 342
openlearn_auth_login_attempts_total{status="invalid_password"} 18

# Rate limit blocks
openlearn_rate_limit_exceeded_total{endpoint_type="auth",path="/api/auth/login"} 5
```

---

## First-Time Setup (One-time)

1. **Add to .env:**
   ```bash
   GRAFANA_ADMIN_PASSWORD=your-secure-password
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Access Grafana:**
   - Open http://localhost:3001
   - Login: admin / your-secure-password
   - Datasource "Prometheus" already configured ✅

4. **Import Dashboard:**
   - Dashboards → Import
   - Enter ID: **11159** (Node.js dashboard)
   - Select "Prometheus" datasource

5. **Verify scraping:**
   - Open http://localhost:9090/targets
   - Should see `openlearn-api` as **UP**

---

## Common Issues

### "Prometheus target is DOWN"
```bash
# Check app is running
docker compose ps app

# Test metrics endpoint from Prometheus
docker compose exec prometheus wget -O- http://app:3000/metrics
```

### "Grafana shows no data"
```bash
# 1. Check Prometheus is collecting
# Open http://localhost:9090 and query: openlearn_http_requests_total

# 2. Generate some traffic
curl http://localhost:3000/health

# 3. Wait 30 seconds for scrape interval
```

### "Can't access Grafana"
```bash
# Check it's running
docker compose ps grafana

# Check logs
docker compose logs grafana

# Verify port not in use
lsof -i :3001
```

---

## Production Deployment

### EC2 Setup:

1. **First deployment (one-time):**
   ```bash
   ssh ubuntu@your-ec2-ip
   cd /home/ubuntu/openlearn-backend
   
   # Add to .env
   echo "GRAFANA_ADMIN_PASSWORD=secure-password" >> .env
   
   # Start monitoring stack
   docker compose up -d prometheus grafana
   ```

2. **Every code push (automatic):**
   - GitHub Actions deploys new app container
   - Prometheus/Grafana keep running
   - No manual intervention needed

3. **Security:**
   - DO NOT expose Prometheus port 9090 publicly
   - Access Grafana via SSH tunnel or nginx proxy
   - Keep MONITORING_API_SECRET secure

---

## Summary

**What you did:**
- ✅ Created comprehensive metrics in your app
- ✅ Created `/metrics` endpoint (Prometheus format)
- ✅ Updated docker-compose.yml (added prometheus + grafana)
- ✅ Created prometheus.yml (scrape config)
- ✅ Created Grafana auto-provisioning

**What happens when you push code:**
- App container restarts with new code
- Prometheus/Grafana stay running
- Metrics continue being collected
- Zero downtime for monitoring

**What you need to do:**
- [ ] Commit and push changes
- [ ] Verify deployment works
- [ ] Access Grafana and create dashboards
- [ ] Set up alerts (optional)
