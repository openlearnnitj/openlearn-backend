#!/bin/bash
# filepath: /home/rishi/StudioProjects/openlearn-js/docker-entrypoint.sh

set -e

echo "OpenLearn Backend Runtime Initialization"
echo "Timestamp: $(date)"
echo "Environment: ${NODE_ENV:-development}"
echo "Starting OpenLearn Platform Backend..."

# ========================================
# ENVIRONMENT VALIDATION
# ========================================
validate_environment() {
    echo "🔍 Validating OpenLearn environment configuration..."
    
    local required_vars=("DATABASE_URL" "JWT_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Missing required environment variables: ${missing_vars[*]}"
        echo "Please configure these in your Render dashboard"
        exit 1
    fi
    
    echo "✅ Environment validation passed"
}



# ========================================
# DATABASE MIGRATIONS
# ========================================
run_migrations() {
    echo "Running OpenLearn database migrations..."
    
    if npx prisma migrate deploy; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
}

# ========================================
# ADMIN USER SEEDING
# ========================================
seed_admin_user() {
    echo "Initializing OpenLearn Grand Pathfinder admin..."
    
    # Check if admin seeding script exists
    if [ ! -f "dist/scripts/seedAdmin.js" ]; then
        echo "⚠️ Admin seeding script not found - skipping admin creation"
        return 0
    fi
    
    # Run admin seeding (script should be idempotent)
    if node dist/scripts/seedAdmin.js; then
        echo "✅ Grand Pathfinder admin initialization completed"
    else
        echo "❌ Admin seeding failed"
        exit 1
    fi
}

# ========================================
# PRISMA ENGINE DIAGNOSTICS
# ========================================
check_prisma_engines() {
    echo "🔧 Checking Prisma engine compatibility..."
    
    # Check if Prisma client is accessible
    if ! node -e "require('@prisma/client')" 2>/dev/null; then
        echo "❌ Prisma client not accessible"
        exit 1
    fi
    
    # Check OpenSSL version
    echo "🔒 OpenSSL Version: $(openssl version)"
    
    # Check Prisma binary engines
    if [ -d "node_modules/.prisma/client" ]; then
        echo "✅ Prisma client directory found"
        ls -la node_modules/.prisma/client/
    else
        echo "⚠️ Prisma client directory not found, regenerating..."
        npx prisma generate --no-hints
    fi
    
    echo "✅ Prisma engine checks completed"
}

# ========================================
# SYSTEM HEALTH VERIFICATION
# ========================================
verify_system_health() {
    echo "🔍 Performing OpenLearn system health checks..."
    
    # Verify critical files exist
    local critical_files=("dist/server.js" "dist/app.js")
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "❌ Critical file missing: $file"
            exit 1
        fi
    done
    
    # Verify Prisma client is accessible
    if ! node -e "require('@prisma/client')" 2>/dev/null; then
        echo "❌ Prisma client not accessible"
        exit 1
    fi
    
    echo "✅ System health verification passed"
}

# ========================================
# MAIN INITIALIZATION SEQUENCE
# ========================================
main() {
    echo "OpenLearn Backend Initialization Sequence"
    echo "   Node.js Version: $(node --version)"
    echo "   NPM Version: $(npm --version)"
    echo "   Working Directory: $(pwd)"
    echo "   User: $(whoami)"
    echo "   Environment Variables:"
    echo "     - DATABASE_URL: ${DATABASE_URL:+✅ Configured}${DATABASE_URL:-❌ Missing}"
    echo "     - JWT_SECRET: ${JWT_SECRET:+✅ Configured}${JWT_SECRET:-❌ Missing}"
    echo "     - ADMIN_EMAIL: ${ADMIN_EMAIL:+✅ Set}${ADMIN_EMAIL:-⚠️ Using default}"
    echo "     - NODE_ENV: ${NODE_ENV:-development}"
    echo "     - PORT: ${PORT:-3000}"
    
    # Step 1: Validate environment
    validate_environment
    check_prisma_engines
    
    # Step 3: Run database migrations
    run_migrations
    
    # Step 4: Seed admin user
    seed_admin_user
    
    # Step 5: Verify system health
    verify_system_health
    
    # Step 6: Start the OpenLearn backend server
    echo "Starting OpenLearn Backend Server..."
    echo "Ready to serve Pioneer and Pathfinder communities!"
    echo "Server will be available on port ${PORT:-3000}"
    
    # Execute the main application (replace current process)
    exec node dist/server.js
}

# ========================================
# SIGNAL HANDLING
# ========================================
# Handle shutdown signals gracefully
cleanup() {
    echo "🛑 Received shutdown signal"
    echo "👋 Gracefully shutting down OpenLearn Backend..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# ========================================
# EXECUTION
# ========================================
# Run main initialization function
main "$@"