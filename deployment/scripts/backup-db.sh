#!/bin/bash

# Database backup script for OpenLearn Backend
# Usage: ./backup-db.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/home/$(whoami)/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Load environment variables
ENV_FILE="$SCRIPT_DIR/../../environments/.env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    log_info "Loaded environment: $ENVIRONMENT"
else
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set in environment"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    log_error "Invalid DATABASE_URL format"
    exit 1
fi

# Backup filename
BACKUP_FILE="$BACKUP_DIR/openlearn_${ENVIRONMENT}_${TIMESTAMP}.sql"

log_info "🗄️  Starting database backup..."
log_info "Environment: $ENVIRONMENT"
log_info "Database: $DB_NAME"
log_info "Host: $DB_HOST"
log_info "Backup file: $BACKUP_FILE"

# Set PGPASSWORD for pg_dump
export PGPASSWORD="$DB_PASS"

# Create database backup
log_info "Creating backup..."
if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_FILE.custom" 2>/dev/null; then
    
    log_success "Custom format backup created: $BACKUP_FILE.custom"
    
    # Also create SQL format for easier inspection
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --file="$BACKUP_FILE" 2>/dev/null; then
        
        log_success "SQL format backup created: $BACKUP_FILE"
        
        # Compress SQL backup
        gzip "$BACKUP_FILE"
        log_success "SQL backup compressed: $BACKUP_FILE.gz"
    fi
else
    log_error "Database backup failed!"
    exit 1
fi

# Get backup file sizes
if [ -f "$BACKUP_FILE.custom" ]; then
    CUSTOM_SIZE=$(du -h "$BACKUP_FILE.custom" | cut -f1)
    log_info "Custom backup size: $CUSTOM_SIZE"
fi

if [ -f "$BACKUP_FILE.gz" ]; then
    SQL_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    log_info "SQL backup size: $SQL_SIZE"
fi

# Verify backup integrity
log_info "Verifying backup integrity..."
if pg_restore --list "$BACKUP_FILE.custom" >/dev/null 2>&1; then
    log_success "Backup integrity verified"
else
    log_error "Backup integrity check failed!"
    exit 1
fi

# Clean up old backups (keep last 7 days for staging, 30 days for production)
if [ "$ENVIRONMENT" = "production" ]; then
    RETENTION_DAYS=30
else
    RETENTION_DAYS=7
fi

log_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "openlearn_${ENVIRONMENT}_*.sql*" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "openlearn_${ENVIRONMENT}_*.custom" -type f -mtime +$RETENTION_DAYS -delete

# List recent backups
log_info "Recent backups:"
ls -lah "$BACKUP_DIR"/openlearn_${ENVIRONMENT}_* | tail -5

# Upload to S3 (if configured)
if [ -n "$AWS_S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log_info "Uploading backup to S3..."
    
    S3_PATH="s3://$AWS_S3_BACKUP_BUCKET/database-backups/$ENVIRONMENT/"
    
    if aws s3 cp "$BACKUP_FILE.custom" "$S3_PATH" --storage-class STANDARD_IA; then
        log_success "Backup uploaded to S3: $S3_PATH"
    else
        log_warning "Failed to upload backup to S3"
    fi
fi

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Database backup completed for $ENVIRONMENT environment\n📁 Size: $CUSTOM_SIZE\n🕐 Time: $(date)\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
fi

# Unset password
unset PGPASSWORD

log_success "🎉 Database backup completed successfully!"
log_info "Custom format: $BACKUP_FILE.custom"
log_info "SQL format: $BACKUP_FILE.gz"

# Backup metadata
cat > "$BACKUP_DIR/openlearn_${ENVIRONMENT}_${TIMESTAMP}.metadata.json" << EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$TIMESTAMP",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "backup_files": {
    "custom": "$(basename "$BACKUP_FILE.custom")",
    "sql": "$(basename "$BACKUP_FILE.gz")"
  },
  "sizes": {
    "custom": "$CUSTOM_SIZE",
    "sql": "$SQL_SIZE"
  },
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "retention_days": $RETENTION_DAYS
}
EOF

log_info "Backup metadata saved"
