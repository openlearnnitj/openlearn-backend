# Prometheus & Grafana Monitoring Setup

## Overview

The OpenLearn backend now has comprehensive monitoring using:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **prom-client**: Node.js library exposing metrics

## Architecture

```
┌─────────────┐
│   Grafana   │ ← Visualizes metrics
│  Port 3001  │
└──────┬──────┘
       │ Queries
       ↓
┌─────────────┐
│ Prometheus  │ ← Stores time-series metrics
│  Port 9090  │
└──────┬──────┘
       │ Scrapes every 15s
       ↓
┌─────────────┐
│  App:3000   │ ← Exposes /metrics endpoint
│  /metrics   │
└─────────────┘
```

## Metrics Collected

### 1. HTTP Metrics
- `openlearn_http_request_duration_seconds` - Request latency histogram
- `openlearn_http_requests_total` - Total request count by method/route/status
- `openlearn_http_requests_in_flight` - Current concurrent requests
- `openlearn_http_request_size_bytes` - Request body sizes
- `openlearn_http_response_size_bytes` - Response body sizes
- `openlearn_http_errors_total` - HTTP errors by type

### 2. Database Metrics
- `openlearn_db_query_duration_seconds` - Query execution time
- `openlearn_db_queries_total` - Query count by operation/model/status
- `openlearn_db_connections_active` - Active Prisma connections
- `openlearn_db_connections_idle` - Idle Prisma connections
- `openlearn_db_errors_total` - Database errors by type
- `openlearn_db_transaction_duration_seconds` - Transaction timing

### 3. Authentication Metrics
- `openlearn_auth_login_attempts_total` - Login attempts by status
- `openlearn_auth_token_validations_total` - JWT validation results
- `openlearn_auth_jwt_errors_total` - JWT-specific errors
- `openlearn_auth_active_users` - Currently authenticated users
- `openlearn_auth_password_reset_requests_total` - Password resets
- `openlearn_auth_registration_attempts_total` - Signup attempts
- `openlearn_auth_authorization_failures_total` - RBAC failures

### 4. Rate Limiting Metrics
- `openlearn_rate_limit_exceeded_total` - Blocked requests by endpoint type/path
- `openlearn_rate_limit_hits_total` - All rate limit checks by type/status

### 5. Node.js Metrics (Default)
- `nodejs_heap_size_total_bytes` - Total heap size
- `nodejs_heap_size_used_bytes` - Used heap
- `nodejs_external_memory_bytes` - External memory
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_gc_duration_seconds` - Garbage collection time
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage

## Files Overview

### 1. Application Files (Metrics Implementation)
```
src/
├── metrics/
│   ├── index.ts                  # Central registry + config
│   ├── httpMetrics.ts            # HTTP request/response metrics
│   ├── dbMetrics.ts              # Database operation metrics
│   ├── authMetrics.ts            # Authentication metrics
│   └── rateLimitMetrics.ts       # Rate limiting metrics
├── middleware/
│   ├── metricsMiddleware.ts      # Auto-collects HTTP metrics
│   └── monitoringSecret.ts       # Protects /metrics endpoint
└── routes/
    └── metrics.ts                # GET /metrics endpoint
```

### 2. Infrastructure Files
```
.
├── docker-compose.yml            # Adds prometheus + grafana services
├── prometheus.yml                # Prometheus scrape configuration
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── prometheus.yml    # Auto-configures Prometheus in Grafana
└── .env                          # Add GRAFANA_ADMIN_PASSWORD
```

## Setup Instructions

### Step 1: Environment Variables

Add to your `.env` file:

```bash
# Grafana Configuration (optional, has defaults)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password-here

# Monitoring API Secret (already exists)
MONITORING_API_SECRET=your-monitoring-secret
```

### Step 2: Start Services

```bash
# Start all services including Prometheus and Grafana
docker compose up -d

# Verify all containers are running
docker compose ps

# Check Prometheus is scraping metrics
docker compose logs prometheus

# Check Grafana is ready
docker compose logs grafana
```

### Step 3: Access UIs

**Prometheus:**
- URL: http://localhost:9090
- Check targets: http://localhost:9090/targets
- Should see `openlearn-api` target as "UP"

**Grafana:**
- URL: http://localhost:3001
- Login: admin / <your-password>
- Datasource "Prometheus" should be auto-configured

### Step 4: Test Metrics Endpoint

```bash
# From inside Docker network (no auth needed)
docker compose exec app curl http://localhost:3000/metrics

# From outside (requires X-API-Secret)
curl -H "X-API-Secret: your-monitoring-secret" http://localhost:3000/metrics
```

## Understanding Metrics Authentication

### Internal Docker Network (Prometheus → App)
- **No authentication required**
- Prometheus scrapes from `app:3000/metrics` within the isolated Docker network
- Detected by absence of `X-Forwarded-For` headers
- Safe because Docker network is not exposed externally

### External Access (Public → App)
- **Requires X-API-Secret header**
- Requests from outside the Docker network need authentication
- Nginx adds `X-Forwarded-For` headers, triggering auth requirement
- Protects metrics from unauthorized public access

## Container Restart Policy

### ❌ NO RESTART NEEDED for Prometheus/Grafana when you:
- Push new application code
- Deploy via GitHub Actions
- Change business logic
- Add new endpoints

**Why?** Prometheus and Grafana are separate services that only **READ** metrics from your `/metrics` endpoint. They don't contain your application code.

### ✅ RESTART NEEDED only when you:
- Change `prometheus.yml` configuration
- Change Grafana datasource provisioning
- Upgrade Prometheus/Grafana images

**Commands:**
```bash
# Restart only Prometheus
docker compose restart prometheus

# Restart only Grafana
docker compose restart grafana

# Restart all monitoring stack
docker compose restart prometheus grafana
```

### Application Container
- **DOES restart** when you push code (via GitHub Actions deployment)
- Prometheus automatically reconnects and continues scraping
- No metrics data loss (stored in Prometheus, not in app)

## Deployment Workflow

### 1. Local Development
```bash
# Run without Prometheus/Grafana (faster startup)
npm run dev

# Test metrics endpoint manually
curl http://localhost:3000/metrics  # May fail without X-API-Secret
```

### 2. Production Deployment (EC2)

**On Code Push:**
1. GitHub Actions builds new app image
2. SCP transfers tarball to EC2
3. Deployment script runs:
   ```bash
   docker compose down app           # Stop only app container
   docker compose up -d app          # Start new app version
   ```
4. Prometheus/Grafana keep running
5. Prometheus resumes scraping from new app container

**Manual monitoring restart (if needed):**
```bash
ssh ubuntu@your-ec2-ip
cd /home/ubuntu/openlearn-backend
docker compose restart prometheus grafana
```

## Creating Grafana Dashboards

### Import Pre-built Node.js Dashboard

1. Go to Grafana → Dashboards → Import
2. Enter dashboard ID: **11159** (Node.js Application Dashboard)
3. Select "Prometheus" datasource
4. Click "Import"

### Create Custom OpenLearn Dashboard

Example queries:

**Request Rate:**
```promql
rate(openlearn_http_requests_total[5m])
```

**95th Percentile Response Time:**
```promql
histogram_quantile(0.95, rate(openlearn_http_request_duration_seconds_bucket[5m]))
```

**Login Success Rate:**
```promql
rate(openlearn_auth_login_attempts_total{status="success"}[5m]) /
rate(openlearn_auth_login_attempts_total[5m]) * 100
```

**Database Query Rate:**
```promql
rate(openlearn_db_queries_total[5m])
```

**Rate Limit Blocks:**
```promql
rate(openlearn_rate_limit_exceeded_total[5m])
```

**Active Users:**
```promql
openlearn_auth_active_users
```

## Troubleshooting

### Prometheus Can't Scrape Metrics

**Check 1: Is app container healthy?**
```bash
docker compose ps
docker compose logs app
```

**Check 2: Can Prometheus reach app?**
```bash
docker compose exec prometheus wget -O- http://app:3000/metrics
```

**Check 3: Check Prometheus targets**
- Open http://localhost:9090/targets
- Should see `openlearn-api (app:3000/metrics)` as UP

**Check 4: DNS resolution**
```bash
docker compose exec prometheus ping app
```

### Grafana Can't Connect to Prometheus

**Check 1: Is Prometheus running?**
```bash
docker compose ps prometheus
```

**Check 2: Test datasource in Grafana**
- Settings → Data Sources → Prometheus
- Click "Test" button
- Should show "Data source is working"

**Check 3: Check Prometheus URL**
- Should be `http://prometheus:9090` (Docker service name)

### No Metrics Appearing

**Check 1: Generate some traffic**
```bash
# Make requests to your API
curl http://localhost:3000/health
curl http://localhost:3000/api/auth/health
```

**Check 2: Verify metrics are exposed**
```bash
curl http://localhost:3000/metrics | grep openlearn
```

**Check 3: Check Prometheus scrape interval**
- Default is 15 seconds
- Wait at least 30 seconds after generating traffic

## Security Considerations

### Production Checklist

- [ ] **Close Prometheus port 9090** to public (only allow internal network)
- [ ] **Close Grafana port 3001** or use nginx reverse proxy with auth
- [ ] **Use strong GRAFANA_ADMIN_PASSWORD** (not "admin")
- [ ] **Keep MONITORING_API_SECRET secure** in .env
- [ ] **Enable Grafana HTTPS** in production
- [ ] **Set up Prometheus retention** (currently 30 days)
- [ ] **Configure Grafana alerting** for critical metrics
- [ ] **Set up backup** for Prometheus data volume

### Exposing Grafana Publicly (Optional)

**Option 1: Nginx reverse proxy**
```nginx
location /grafana/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header Host $host;
}
```

**Option 2: SSH tunnel (development)**
```bash
ssh -L 3001:localhost:3001 ubuntu@your-ec2-ip
# Access via http://localhost:3001
```

## Monitoring Best Practices

1. **Alert on High Error Rates**
   - HTTP 5xx errors
   - Database connection failures
   - Rate limit blocks

2. **Alert on Performance Degradation**
   - 95th percentile response time > 1s
   - Database query time > 500ms
   - Event loop lag > 100ms

3. **Alert on Authentication Issues**
   - High JWT error rate
   - Unusual login failure patterns

4. **Regular Review**
   - Weekly dashboard review
   - Monthly capacity planning
   - Quarterly metric retention review

## Next Steps

1. **Import Node.js dashboard** (ID: 11159)
2. **Create custom OpenLearn dashboard** with business metrics
3. **Set up alerting rules** in Prometheus
4. **Configure Grafana notifications** (email/Slack)
5. **Document key metrics** for the team
6. **Set up backup** for Grafana dashboards

## Useful Links

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client GitHub](https://github.com/siimon/prom-client)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Node.js Dashboard](https://grafana.com/grafana/dashboards/11159)
