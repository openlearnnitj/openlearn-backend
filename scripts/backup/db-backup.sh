#!/bin/bash

# OpenLearn Database Backup Script
# This script creates PostgreSQL backups and uploads them to S3
# Usage: ./db-backup.sh [options]

set -euo pipefail

# Default configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Configuration with defaults
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-openlearn}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# S3 Configuration
S3_BUCKET="${BACKUP_S3_BUCKET:-ol-postgres-backup}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${BACKUP_AWS_ACCESS_KEY_ID:-$AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${BACKUP_AWS_SECRET_ACCESS_KEY:-$AWS_SECRET_ACCESS_KEY}"

# Backup configuration
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${BACKUP_COMPRESSION_LEVEL:-6}"
BACKUP_PREFIX="${BACKUP_PREFIX:-openlearn}"

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

# Logging
LOG_FILE="$BACKUP_DIR/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check dependencies
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi
    
    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        log "INFO" "Install them with: sudo apt-get install postgresql-client awscli gzip"
        exit 1
    fi
    
    log "INFO" "All dependencies satisfied ✅"
}

# Test database connection
test_db_connection() {
    log "INFO" "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        log "INFO" "Database connection successful ✅"
    else
        log "ERROR" "Failed to connect to database"
        log "ERROR" "Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER, Database: $DB_NAME"
        exit 1
    fi
}

# Test S3 connection
test_s3_connection() {
    log "INFO" "Testing S3 connection..."
    
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        log "INFO" "S3 connection successful ✅"
    else
        log "ERROR" "Failed to connect to S3 bucket: $S3_BUCKET"
        log "INFO" "Attempting to create bucket..."
        
        if aws s3 mb "s3://$S3_BUCKET" --region "$S3_REGION" 2>/dev/null; then
            log "INFO" "S3 bucket created successfully ✅"
        else
            log "ERROR" "Failed to create S3 bucket"
            exit 1
        fi
    fi
}

# Create database backup
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_filename="${BACKUP_PREFIX}_${timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"
    local compressed_filename="${backup_filename}.gz"
    local compressed_path="$BACKUP_DIR/$compressed_filename"
    
    log "INFO" "Creating database backup..."
    log "INFO" "Backup file: $backup_filename"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup with verbose output
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --file="$backup_path" 2>/dev/null; then
        
        log "INFO" "Database backup created successfully ✅"
        
        # Get backup size
        local backup_size=$(du -h "$backup_path" | cut -f1)
        log "INFO" "Backup size: $backup_size"
        
        # Compress backup
        log "INFO" "Compressing backup..."
        if gzip -"$COMPRESSION_LEVEL" "$backup_path"; then
            local compressed_size=$(du -h "$compressed_path" | cut -f1)
            log "INFO" "Backup compressed successfully ✅"
            log "INFO" "Compressed size: $compressed_size"
            
            echo "$compressed_path"
        else
            log "ERROR" "Failed to compress backup"
            exit 1
        fi
    else
        log "ERROR" "Failed to create database backup"
        exit 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_path="$1"
    local backup_filename=$(basename "$backup_path")
    local s3_key="backups/$(date '+%Y/%m')/$backup_filename"
    local s3_url="s3://$S3_BUCKET/$s3_key"
    
    log "INFO" "Uploading backup to S3..."
    log "INFO" "S3 destination: $s3_url"
    
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    if aws s3 cp "$backup_path" "$s3_url" \
        --metadata "database=$DB_NAME,host=$DB_HOST,backup-script=openlearn-db-backup" \
        --storage-class STANDARD_IA; then
        
        log "INFO" "Backup uploaded successfully ✅"
        log "INFO" "S3 URL: $s3_url"
        
        # Verify upload
        local s3_size=$(aws s3 ls "$s3_url" | awk '{print $3}')
        local local_size=$(stat -c%s "$backup_path")
        
        if [[ "$s3_size" == "$local_size" ]]; then
            log "INFO" "Upload verification successful ✅"
        else
            log "WARN" "Upload verification failed - size mismatch"
            log "WARN" "Local: $local_size bytes, S3: $s3_size bytes"
        fi
        
        return 0
    else
        log "ERROR" "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old local backups
cleanup_local_backups() {
    log "INFO" "Cleaning up old local backups..."
    
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
        log "DEBUG" "Deleted: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.sql.gz" -mtime +7 -print0 2>/dev/null)
    
    if [[ $deleted_count -gt 0 ]]; then
        log "INFO" "Deleted $deleted_count old local backup(s) ✅"
    else
        log "INFO" "No old local backups to delete"
    fi
}

# Clean up old S3 backups
cleanup_s3_backups() {
    log "INFO" "Cleaning up old S3 backups (older than $BACKUP_RETENTION_DAYS days)..."
    
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" '+%Y-%m-%d')
    
    # List and delete old backups
    local deleted_count=0
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_key=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                if aws s3 rm "s3://$S3_BUCKET/$file_key" &>/dev/null; then
                    ((deleted_count++))
                    log "DEBUG" "Deleted: $file_key"
                fi
            fi
        fi
    done < <(aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | grep "${BACKUP_PREFIX}_")
    
    if [[ $deleted_count -gt 0 ]]; then
        log "INFO" "Deleted $deleted_count old S3 backup(s) ✅"
    else
        log "INFO" "No old S3 backups to delete"
    fi
}

# Send notification (if configured)
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${BACKUP_WEBHOOK_URL:-}" ]]; then
        log "INFO" "Sending webhook notification..."
        
        local payload=$(cat <<EOF
{
    "text": "OpenLearn Database Backup - $status",
    "attachments": [
        {
            "color": "$([[ "$status" == "SUCCESS" ]] && echo "good" || echo "danger")",
            "fields": [
                {
                    "title": "Database",
                    "value": "$DB_NAME",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                },
                {
                    "title": "Timestamp",
                    "value": "$(date '+%Y-%m-%d %H:%M:%S UTC')",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)
        
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$BACKUP_WEBHOOK_URL" &>/dev/null; then
            log "INFO" "Notification sent successfully ✅"
        else
            log "WARN" "Failed to send notification"
        fi
    fi
}

# Main backup function
main() {
    local start_time=$(date '+%Y-%m-%d %H:%M:%S')
    log "INFO" "Starting OpenLearn database backup"
    log "INFO" "Timestamp: $start_time"
    log "INFO" "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    log "INFO" "S3 Bucket: $S3_BUCKET"
    
    local backup_path=""
    local success=true
    local error_message=""
    
    # Execute backup process
    {
        check_dependencies
        test_db_connection
        test_s3_connection
        backup_path=$(create_backup)
        upload_to_s3 "$backup_path"
        cleanup_local_backups
        cleanup_s3_backups
    } || {
        success=false
        error_message="Backup process failed. Check logs for details."
    }
    
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local duration=$(($(date -d "$end_time" +%s) - $(date -d "$start_time" +%s)))
    
    if [[ "$success" == true ]]; then
        log "INFO" "✅ Backup completed successfully"
        log "INFO" "Duration: ${duration}s"
        log "INFO" "Backup file: $(basename "$backup_path")"
        send_notification "SUCCESS" "Database backup completed successfully in ${duration}s"
    else
        log "ERROR" "❌ Backup failed"
        log "ERROR" "Duration: ${duration}s"
        send_notification "FAILED" "$error_message"
        exit 1
    fi
}

# Help function
show_help() {
    cat <<EOF
OpenLearn Database Backup Script

Usage: $0 [options]

Options:
    -h, --help              Show this help message
    -t, --test              Test connections without performing backup
    -v, --verbose           Enable verbose output
    --dry-run              Show what would be done without executing

Environment Variables:
    POSTGRES_HOST           Database host (default: localhost)
    POSTGRES_PORT           Database port (default: 5432)
    POSTGRES_DB             Database name (default: openlearn)
    POSTGRES_USER           Database user (default: postgres)
    POSTGRES_PASSWORD       Database password
    
    BACKUP_S3_BUCKET        S3 bucket name (default: ol-postgres-backup)
    BACKUP_S3_REGION        S3 region (default: us-east-1)
    BACKUP_AWS_ACCESS_KEY_ID    AWS access key
    BACKUP_AWS_SECRET_ACCESS_KEY    AWS secret key
    
    BACKUP_RETENTION_DAYS   Days to keep backups (default: 30)
    BACKUP_COMPRESSION_LEVEL    Gzip compression level (default: 6)
    BACKUP_PREFIX           Backup filename prefix (default: openlearn)
    BACKUP_WEBHOOK_URL      Webhook URL for notifications (optional)

Examples:
    $0                      Run full backup
    $0 --test              Test connections only
    $0 --dry-run           Show what would be done

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--test)
            log "INFO" "Testing connections..."
            check_dependencies
            test_db_connection
            test_s3_connection
            log "INFO" "✅ All tests passed"
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --dry-run)
            log "INFO" "🔍 Dry run mode - showing what would be done"
            log "INFO" "Would backup database: $DB_NAME@$DB_HOST:$DB_PORT"
            log "INFO" "Would upload to S3: s3://$S3_BUCKET/backups/$(date '+%Y/%m')/"
            log "INFO" "Would clean up backups older than $BACKUP_RETENTION_DAYS days"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
