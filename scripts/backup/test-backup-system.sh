#!/bin/bash

# OpenLearn Backup System Test Script
# This script tests the backup system configuration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local message="$*"
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
}

echo "OpenLearn Backup System Test"
echo "================================"

# Test 1: Check if backup scripts exist and are executable
log "INFO" "Test 1: Checking backup scripts..."
scripts=(
    "scripts/backup/db-backup.sh"
    "scripts/backup/db-restore.sh"
    "scripts/backup/setup-cron.sh"
)

for script in "${scripts[@]}"; do
    if [[ -f "$PROJECT_ROOT/$script" ]]; then
        if [[ -x "$PROJECT_ROOT/$script" ]]; then
            log "INFO" "✅ $script - exists and executable"
        else
            log "WARN" "⚠️  $script - exists but not executable"
            chmod +x "$PROJECT_ROOT/$script"
            log "INFO" "✅ Made $script executable"
        fi
    else
        log "ERROR" "❌ $script - not found"
    fi
done

# Test 2: Check dependencies
log "INFO" "Test 2: Checking dependencies..."
dependencies=(
    "pg_dump:postgresql-client"
    "aws:awscli"
    "gzip:gzip"
    "bc:bc"
)

for dep in "${dependencies[@]}"; do
    cmd="${dep%%:*}"
    package="${dep##*:}"
    
    if command -v "$cmd" &> /dev/null; then
        log "INFO" "✅ $cmd - available"
    else
        log "ERROR" "❌ $cmd - not found (install with: sudo apt-get install $package)"
    fi
done

# Test 3: Check environment configuration
log "INFO" "Test 3: Checking environment configuration..."

if [[ -f "$PROJECT_ROOT/.env" ]]; then
    source "$PROJECT_ROOT/.env"
    
    # Required database variables
    db_vars=("POSTGRES_HOST" "POSTGRES_PORT" "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")
    for var in "${db_vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            log "INFO" "✅ $var - configured"
        else
            log "WARN" "⚠️  $var - not set (using default or will derive from DATABASE_URL)"
        fi
    done
    
    # Backup-specific variables
    backup_vars=("BACKUP_S3_BUCKET" "BACKUP_AWS_ACCESS_KEY_ID" "BACKUP_AWS_SECRET_ACCESS_KEY")
    for var in "${backup_vars[@]}"; do
        if [[ -n "${!var:-}" && "${!var}" != *"your_"* ]]; then
            log "INFO" "✅ $var - configured"
        else
            log "WARN" "⚠️  $var - not configured or contains placeholder"
        fi
    done
    
else
    log "ERROR" "❌ .env file not found"
fi

# Test 4: Test backup script connectivity
log "INFO" "Test 4: Testing backup script connectivity..."

if [[ -f "$PROJECT_ROOT/scripts/backup/db-backup.sh" ]]; then
    if "$PROJECT_ROOT/scripts/backup/db-backup.sh" --test 2>/dev/null; then
        log "INFO" "✅ Backup script connectivity test passed"
    else
        log "WARN" "⚠️  Backup script connectivity test failed (check credentials)"
    fi
else
    log "ERROR" "❌ Backup script not found"
fi

# Test 5: Check backup directory
log "INFO" "Test 5: Checking backup directory..."

backup_dir="$PROJECT_ROOT/backups"
if [[ -d "$backup_dir" ]]; then
    log "INFO" "✅ Backup directory exists: $backup_dir"
else
    mkdir -p "$backup_dir"
    log "INFO" "✅ Created backup directory: $backup_dir"
fi

# Test 6: Show cron setup instructions
log "INFO" "Test 6: Cron setup information..."

if crontab -l 2>/dev/null | grep -q "OpenLearn Database Backup"; then
    log "INFO" "✅ OpenLearn backup cron job is installed"
    log "INFO" "Current backup schedule:"
    crontab -l | grep -A1 "OpenLearn Database Backup"
else
    log "INFO" "ℹ️No backup cron job installed yet"
    log "INFO" "To install automated backups, run:"
    log "INFO" "   ./scripts/backup/setup-cron.sh install every-2-hours"
fi

echo
echo "Next Steps:"
echo "=============="

# Check if AWS credentials need to be configured
if [[ "${BACKUP_AWS_ACCESS_KEY_ID:-}" == *"your_"* || -z "${BACKUP_AWS_ACCESS_KEY_ID:-}" ]]; then
    echo "1. Configure AWS credentials in .env file:"
    echo "   BACKUP_AWS_ACCESS_KEY_ID=your_actual_access_key"
    echo "   BACKUP_AWS_SECRET_ACCESS_KEY=your_actual_secret_key"
    echo
fi

echo "2. Test manual backup:"
echo "   ./scripts/backup/db-backup.sh --dry-run"
echo "   ./scripts/backup/db-backup.sh --test"
echo
echo "3. Set up automated backups:"
echo "   ./scripts/backup/setup-cron.sh schedules"
echo "   ./scripts/backup/setup-cron.sh install every-2-hours"
echo
echo "4. Test restore functionality:"
echo "   ./scripts/backup/db-restore.sh --list"
echo
echo "5. Monitor backup logs:"
echo "   tail -f backups/backup.log"

echo
log "INFO" "🎉 Backup system test completed!"
