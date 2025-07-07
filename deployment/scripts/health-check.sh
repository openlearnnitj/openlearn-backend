#!/bin/bash

# Health check script for OpenLearn Backend
# Usage: ./health-check.sh [environment] [url]

ENVIRONMENT=${1:-production}
HEALTH_URL=${2:-"http://localhost:3000/health"}
MAX_RETRIES=${3:-5}
RETRY_DELAY=${4:-5}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "🏥 Starting health check for $ENVIRONMENT environment"
log_info "URL: $HEALTH_URL"
log_info "Max retries: $MAX_RETRIES"

for i in $(seq 1 $MAX_RETRIES); do
    log_info "Health check attempt $i/$MAX_RETRIES..."
    
    # Perform health check with detailed response
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" --max-time 10 "$HEALTH_URL" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Parse response
        body=$(echo "$response" | head -n -2)
        http_code=$(echo "$response" | tail -n 2 | head -n 1)
        response_time=$(echo "$response" | tail -n 1)
        
        if [ "$http_code" = "200" ]; then
            log_success "Health check passed!"
            log_info "Response time: ${response_time}s"
            log_info "Response body: $body"
            
            # Additional checks if JSON response
            if echo "$body" | jq empty 2>/dev/null; then
                status=$(echo "$body" | jq -r '.status // "unknown"')
                uptime=$(echo "$body" | jq -r '.uptime // "unknown"')
                version=$(echo "$body" | jq -r '.version // "unknown"')
                
                log_info "Application status: $status"
                log_info "Uptime: $uptime"
                log_info "Version: $version"
                
                # Check database connectivity
                db_status=$(echo "$body" | jq -r '.database.status // "unknown"')
                if [ "$db_status" = "connected" ]; then
                    log_success "Database connection: OK"
                else
                    log_warning "Database connection: $db_status"
                fi
                
                # Check Redis connectivity
                redis_status=$(echo "$body" | jq -r '.redis.status // "unknown"')
                if [ "$redis_status" = "connected" ]; then
                    log_success "Redis connection: OK"
                else
                    log_warning "Redis connection: $redis_status"
                fi
            fi
            
            exit 0
        else
            log_error "Health check failed with HTTP $http_code"
            log_error "Response: $body"
        fi
    else
        log_error "Health check failed - connection error"
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        log_warning "Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

log_error "❌ Health check failed after $MAX_RETRIES attempts"

# Additional diagnostics
log_info "🔍 Running additional diagnostics..."

# Check if service is running
if command -v docker >/dev/null 2>&1; then
    log_info "Docker containers status:"
    docker ps --filter "name=openlearn" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

# Check port availability
if command -v netstat >/dev/null 2>&1; then
    log_info "Port 3000 status:"
    netstat -tlnp | grep :3000 || log_warning "Port 3000 not listening"
fi

# Check system resources
if command -v free >/dev/null 2>&1; then
    log_info "Memory usage:"
    free -h
fi

if command -v df >/dev/null 2>&1; then
    log_info "Disk usage:"
    df -h / | tail -n 1
fi

exit 1
