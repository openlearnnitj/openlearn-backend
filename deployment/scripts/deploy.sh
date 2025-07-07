#!/bin/bash

set -e

# OpenLearn Backend Deployment Script
# Usage: ./deploy.sh [environment] [backup_enabled]
# Example: ./deploy.sh production true

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_ENABLED=${2:-true}
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check application health
check_health() {
    local retries=$1
    local delay=$2
    local url=${3:-"http://localhost:3000/health"}
    
    log_info "Starting health check for $url..."
    
    for i in $(seq 1 $retries); do
        log_info "Health check attempt $i/$retries..."
        
        if curl -f -s --max-time 10 "$url" > /dev/null; then
            log_success "Application is healthy!"
            return 0
        fi
        
        if [ $i -lt $retries ]; then
            log_warning "Health check failed, waiting ${delay}s before next attempt..."
            sleep $delay
        fi
    done
    
    log_error "Health check failed after $retries attempts"
    return 1
}

# Function to backup current deployment
backup_deployment() {
    if [ "$BACKUP_ENABLED" = "true" ] && [ -d "$PROJECT_ROOT" ]; then
        local backup_dir="${PROJECT_ROOT}-backup-$(date +%Y%m%d_%H%M%S)"
        log_info "Creating backup: $backup_dir"
        
        # Copy project excluding node_modules and logs
        rsync -av --exclude='node_modules' --exclude='logs' --exclude='.git' \
              "$PROJECT_ROOT/" "$backup_dir/"
        
        # Keep only last 5 backups
        ls -dt ${PROJECT_ROOT}-backup-* 2>/dev/null | tail -n +6 | xargs -r rm -rf
        log_success "Backup created successfully"
    else
        log_info "Backup disabled or no existing deployment found"
    fi
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Starting rollback process..."
    
    # Stop current containers
    docker-compose -f "$PROJECT_ROOT/deployment/docker/docker-compose.$ENVIRONMENT.yml" down || true
    
    # Find latest backup
    local latest_backup=$(ls -dt ${PROJECT_ROOT}-backup-* 2>/dev/null | head -n 1)
    
    if [ -n "$latest_backup" ]; then
        log_info "Restoring from backup: $latest_backup"
        
        # Backup current failed deployment
        mv "$PROJECT_ROOT" "${PROJECT_ROOT}-failed-$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        
        # Restore from backup
        mv "$latest_backup" "$PROJECT_ROOT"
        cd "$PROJECT_ROOT"
        
        # Start previous version
        docker-compose -f "deployment/docker/docker-compose.$ENVIRONMENT.yml" up -d
        
        if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_DELAY; then
            log_success "Rollback completed successfully!"
            return 0
        else
            log_error "Rollback failed!"
            return 1
        fi
    else
        log_error "No backup found for rollback!"
        return 1
    fi
}

# Function to setup environment file
setup_environment() {
    local env_file="$PROJECT_ROOT/environments/.env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        log_info "Please create the environment file with required variables"
        return 1
    fi
    
    log_success "Environment file found: $env_file"
    return 0
}

# Function to validate docker compose file
validate_compose() {
    local compose_file="$PROJECT_ROOT/deployment/docker/docker-compose.$ENVIRONMENT.yml"
    
    if [ ! -f "$compose_file" ]; then
        log_error "Docker compose file not found: $compose_file"
        return 1
    fi
    
    if ! docker-compose -f "$compose_file" config > /dev/null 2>&1; then
        log_error "Invalid docker-compose configuration"
        return 1
    fi
    
    log_success "Docker compose configuration validated"
    return 0
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            log_error "Required command not found: $cmd"
            return 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Validate environment setup
    if ! setup_environment; then
        return 1
    fi
    
    # Validate docker compose
    if ! validate_compose; then
        return 1
    fi
    
    log_success "Prerequisites check passed"
    return 0
}

# Function to pull latest code
pull_code() {
    if [ "$CI" = "true" ]; then
        log_info "Running in CI/CD environment, code already available"
        return 0
    fi
    
    log_info "Pulling latest code from git..."
    cd "$PROJECT_ROOT"
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $(date)" || true
    
    # Pull latest changes
    git pull origin main
    
    log_success "Code updated successfully"
}

# Function to install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    
    # Clean install for production
    npm ci --only=production
    
    log_success "Dependencies installed successfully"
}

# Function to build application
build_application() {
    log_info "Building application..."
    cd "$PROJECT_ROOT"
    
    # Generate Prisma client
    npx prisma generate
    
    # Build TypeScript
    npm run build
    
    log_success "Application built successfully"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    cd "$PROJECT_ROOT"
    
    # Set environment for migration
    export NODE_ENV="$ENVIRONMENT"
    
    # Run migrations
    docker-compose -f "deployment/docker/docker-compose.$ENVIRONMENT.yml" exec -T app npx prisma migrate deploy
    
    log_success "Database migrations completed"
}

# Function to deploy containers
deploy_containers() {
    log_info "Deploying containers..."
    cd "$PROJECT_ROOT"
    
    local compose_file="deployment/docker/docker-compose.$ENVIRONMENT.yml"
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$compose_file" down || true
    
    # Remove old images to free space
    docker image prune -f || true
    
    # Build new containers
    log_info "Building new containers..."
    docker-compose -f "$compose_file" build --no-cache
    
    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f "$compose_file" up -d
    
    # Wait for containers to be ready
    log_info "Waiting for containers to start..."
    sleep 30
    
    log_success "Containers deployed successfully"
}

# Function to post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clean up old Docker images
    docker image prune -f || true
    
    # Clean up old backups (keep last 5)
    ls -dt ${PROJECT_ROOT}-backup-* 2>/dev/null | tail -n +6 | xargs -r rm -rf || true
    
    # Log deployment info
    local log_file="$PROJECT_ROOT/logs/deployment.log"
    mkdir -p "$(dirname "$log_file")"
    echo "$(date): Successful deployment to $ENVIRONMENT" >> "$log_file"
    
    log_success "Post-deployment tasks completed"
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook URL is set)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="✅"
        local color="good"
        
        if [ "$status" = "failure" ]; then
            emoji="❌"
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji OpenLearn Backend - $message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Email notification (if configured)
    if [ -n "$NOTIFICATION_EMAIL" ] && command_exists mail; then
        echo "$message" | mail -s "OpenLearn Deployment - $ENVIRONMENT" "$NOTIFICATION_EMAIL" || true
    fi
}

# Main deployment function
main() {
    log_info "🚀 Starting OpenLearn Backend deployment to $ENVIRONMENT environment..."
    log_info "Timestamp: $(date)"
    log_info "User: $(whoami)"
    log_info "Host: $(hostname)"
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    # Create backup
    backup_deployment
    
    # Pull latest code
    if ! pull_code; then
        log_error "Failed to pull latest code"
        exit 1
    fi
    
    # Install dependencies
    if ! install_dependencies; then
        log_error "Failed to install dependencies"
        exit 1
    fi
    
    # Build application
    if ! build_application; then
        log_error "Failed to build application"
        exit 1
    fi
    
    # Deploy containers
    if ! deploy_containers; then
        log_error "Failed to deploy containers"
        exit 1
    fi
    
    # Run database migrations
    if ! run_migrations; then
        log_warning "Database migrations failed, but continuing..."
    fi
    
    # Health check
    log_info "Performing health check..."
    if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_DELAY; then
        # Post-deployment tasks
        post_deployment
        
        log_success "🎉 Deployment completed successfully!"
        send_notification "success" "Deployment to $ENVIRONMENT completed successfully!"
        
        # Display useful information
        echo ""
        log_info "📋 Deployment Information:"
        log_info "Environment: $ENVIRONMENT"
        log_info "Health Check: http://localhost:3000/health"
        log_info "Status Page: http://localhost:3000/status-page"
        log_info "Logs: docker-compose -f deployment/docker/docker-compose.$ENVIRONMENT.yml logs -f"
        echo ""
        
    else
        log_error "❌ Deployment failed health check!"
        send_notification "failure" "Deployment to $ENVIRONMENT failed health check!"
        
        # Attempt rollback
        if rollback_deployment; then
            log_success "Rollback completed successfully"
            send_notification "success" "Rollback to previous version completed successfully!"
        else
            log_error "Rollback failed!"
            send_notification "failure" "Deployment failed and rollback also failed!"
        fi
        
        exit 1
    fi
}

# Trap errors and attempt rollback
trap 'log_error "Deployment failed unexpectedly! Attempting rollback..."; rollback_deployment' ERR

# Validate arguments
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_info "Usage: $0 [staging|production] [true|false]"
    exit 1
fi

# Run main deployment
main

log_success "🏁 Deployment script completed!"
