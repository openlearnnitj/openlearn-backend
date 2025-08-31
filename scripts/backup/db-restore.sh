#!/bin/bash

# OpenLearn Database Restore Script
# This script restores PostgreSQL backups from S3
# Usage: ./db-restore.sh [backup-file] [options]

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

# Restore configuration
BACKUP_PREFIX="${BACKUP_PREFIX:-openlearn}"
RESTORE_DIR="$PROJECT_ROOT/restore"
mkdir -p "$RESTORE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
}

# List available backups
list_backups() {
    log "INFO" "Available backups in S3:"
    
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    echo "----------------------------------------"
    aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | \
        grep "${BACKUP_PREFIX}_" | \
        sort -r | \
        head -20 | \
        while read -r line; do
            local date=$(echo "$line" | awk '{print $1}')
            local time=$(echo "$line" | awk '{print $2}')
            local size=$(echo "$line" | awk '{print $3}')
            local key=$(echo "$line" | awk '{print $4}')
            local filename=$(basename "$key")
            
            # Convert size to human readable
            local human_size
            if [[ $size -gt 1073741824 ]]; then
                human_size=$(echo "scale=1; $size/1073741824" | bc -l)GB
            elif [[ $size -gt 1048576 ]]; then
                human_size=$(echo "scale=1; $size/1048576" | bc -l)MB
            elif [[ $size -gt 1024 ]]; then
                human_size=$(echo "scale=1; $size/1024" | bc -l)KB
            else
                human_size="${size}B"
            fi
            
            printf "%-35s %10s %s %s\n" "$filename" "$human_size" "$date" "$time"
        done
    echo "----------------------------------------"
}

# Download backup from S3
download_backup() {
    local backup_file="$1"
    local local_path="$RESTORE_DIR/$backup_file"
    
    # If backup_file doesn't contain full path, search for it
    local s3_key
    if [[ "$backup_file" == *"/"* ]]; then
        s3_key="$backup_file"
    else
        # Find the backup file in S3
        s3_key=$(aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | \
                 grep "$backup_file" | \
                 head -1 | \
                 awk '{print $4}')
        
        if [[ -z "$s3_key" ]]; then
            log "ERROR" "Backup file not found: $backup_file"
            log "INFO" "Use '$0 --list' to see available backups"
            exit 1
        fi
    fi
    
    local s3_url="s3://$S3_BUCKET/$s3_key"
    
    log "INFO" "Downloading backup from S3..."
    log "INFO" "Source: $s3_url"
    log "INFO" "Destination: $local_path"
    
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    if aws s3 cp "$s3_url" "$local_path"; then
        log "INFO" "Download completed successfully ✅"
        echo "$local_path"
    else
        log "ERROR" "Failed to download backup"
        exit 1
    fi
}

# Verify backup file
verify_backup() {
    local backup_path="$1"
    
    log "INFO" "Verifying backup file..."
    
    if [[ ! -f "$backup_path" ]]; then
        log "ERROR" "Backup file not found: $backup_path"
        exit 1
    fi
    
    # Check if file is gzipped
    if file "$backup_path" | grep -q "gzip"; then
        log "INFO" "Backup is gzip compressed"
        
        # Test gzip integrity
        if gzip -t "$backup_path" 2>/dev/null; then
            log "INFO" "Gzip integrity check passed ✅"
        else
            log "ERROR" "Gzip integrity check failed"
            exit 1
        fi
    else
        log "INFO" "Backup is not compressed"
    fi
    
    # Get file size
    local file_size=$(du -h "$backup_path" | cut -f1)
    log "INFO" "Backup file size: $file_size"
}

# Create database backup before restore
create_pre_restore_backup() {
    log "INFO" "Creating pre-restore backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_filename="pre_restore_${timestamp}.sql.gz"
    local backup_path="$RESTORE_DIR/$backup_filename"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --clean \
        --if-exists \
        --create \
        --format=plain | gzip > "$backup_path"; then
        
        log "INFO" "Pre-restore backup created: $backup_filename ✅"
        echo "$backup_path"
    else
        log "ERROR" "Failed to create pre-restore backup"
        exit 1
    fi
}

# Restore database
restore_database() {
    local backup_path="$1"
    local skip_backup="${2:-false}"
    
    log "INFO" "🔄 Starting database restore..."
    log "INFO" "Backup file: $(basename "$backup_path")"
    log "INFO" "Target database: $DB_NAME@$DB_HOST:$DB_PORT"
    
    # Create pre-restore backup unless skipped
    if [[ "$skip_backup" != "true" ]]; then
        local pre_restore_backup=$(create_pre_restore_backup)
        log "INFO" "Pre-restore backup saved: $(basename "$pre_restore_backup")"
    fi
    
    # Prepare restore command
    local restore_cmd
    if file "$backup_path" | grep -q "gzip"; then
        restore_cmd="gunzip -c '$backup_path'"
    else
        restore_cmd="cat '$backup_path'"
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Stop all connections to the database
    log "INFO" "Terminating existing database connections..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF || true
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
EOF
    
    # Perform restore
    log "INFO" "Restoring database..."
    if eval "$restore_cmd" | psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname=postgres \
        --quiet \
        --single-transaction \
        --set ON_ERROR_STOP=on; then
        
        log "INFO" "Database restored successfully ✅"
        
        # Verify restore
        log "INFO" "Verifying restored database..."
        local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        
        if [[ $table_count -gt 0 ]]; then
            log "INFO" "Verification successful - found $table_count tables ✅"
        else
            log "WARN" "Verification warning - no tables found in public schema"
        fi
        
    else
        log "ERROR" "Database restore failed"
        
        if [[ "$skip_backup" != "true" ]]; then
            log "INFO" "You can restore the pre-restore backup if needed:"
            log "INFO" "$0 $(basename "$pre_restore_backup") --skip-backup"
        fi
        
        exit 1
    fi
}

# Show help
show_help() {
    cat <<EOF
OpenLearn Database Restore Script

Usage: $0 [backup-file] [options]

Options:
    -h, --help              Show this help message
    -l, --list              List available backups in S3
    --latest                Restore the latest backup
    --skip-backup           Skip creating pre-restore backup
    --dry-run              Show what would be done without executing

Arguments:
    backup-file             Name or path of backup file to restore
                           (use --list to see available backups)

Examples:
    $0 --list                                List available backups
    $0 --latest                             Restore latest backup
    $0 openlearn_20240830_143000.sql.gz    Restore specific backup
    $0 --latest --skip-backup               Restore latest without pre-backup

Safety Features:
    - Creates pre-restore backup by default
    - Terminates existing database connections
    - Uses single transaction for atomicity
    - Verifies restore completion

Environment Variables:
    Same as db-backup.sh script

EOF
}

# Get latest backup
get_latest_backup() {
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    local latest=$(aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | \
                   grep "${BACKUP_PREFIX}_" | \
                   sort -k1,2 | \
                   tail -1 | \
                   awk '{print $4}')
    
    if [[ -z "$latest" ]]; then
        log "ERROR" "No backups found in S3"
        exit 1
    fi
    
    echo "$latest"
}

# Main function
main() {
    local backup_file=""
    local skip_backup="false"
    local dry_run="false"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--list)
                list_backups
                exit 0
                ;;
            --latest)
                backup_file=$(get_latest_backup)
                log "INFO" "Latest backup: $(basename "$backup_file")"
                shift
                ;;
            --skip-backup)
                skip_backup="true"
                shift
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done
    
    # Validate arguments
    if [[ -z "$backup_file" ]]; then
        log "ERROR" "Backup file required"
        show_help
        exit 1
    fi
    
    # Dry run mode
    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "🔍 Dry run mode - showing what would be done"
        log "INFO" "Would restore backup: $(basename "$backup_file")"
        log "INFO" "Target database: $DB_NAME@$DB_HOST:$DB_PORT"
        log "INFO" "Pre-restore backup: $([[ "$skip_backup" == "true" ]] && echo "SKIPPED" || echo "ENABLED")"
        exit 0
    fi
    
    # Warning about destructive operation
    echo
    log "WARN" "⚠️  DATABASE RESTORE WARNING ⚠️"
    log "WARN" "This will REPLACE the current database: $DB_NAME"
    log "WARN" "Host: $DB_HOST:$DB_PORT"
    log "WARN" "Backup: $(basename "$backup_file")"
    
    if [[ "$skip_backup" != "true" ]]; then
        log "INFO" "A pre-restore backup will be created automatically"
    else
        log "WARN" "Pre-restore backup is DISABLED"
    fi
    
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^(yes|YES)$ ]]; then
        log "INFO" "Restore cancelled by user"
        exit 0
    fi
    
    # Execute restore
    local start_time=$(date '+%Y-%m-%d %H:%M:%S')
    log "INFO" "🚀 Starting database restore"
    log "INFO" "Timestamp: $start_time"
    
    local local_backup_path
    if [[ -f "$backup_file" ]]; then
        # Local file
        local_backup_path="$backup_file"
    else
        # Download from S3
        local_backup_path=$(download_backup "$backup_file")
    fi
    
    verify_backup "$local_backup_path"
    restore_database "$local_backup_path" "$skip_backup"
    
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local duration=$(($(date -d "$end_time" +%s) - $(date -d "$start_time" +%s)))
    
    log "INFO" "✅ Database restore completed successfully"
    log "INFO" "Duration: ${duration}s"
    log "INFO" "Restored from: $(basename "$backup_file")"
}

# Run main function
main "$@"
