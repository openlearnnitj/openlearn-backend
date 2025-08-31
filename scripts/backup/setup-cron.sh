#!/bin/bash

# OpenLearn Database Backup Cron Setup Script
# This script helps set up automated database backups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/db-backup.sh"

# Colors for output
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

# Predefined cron schedules
declare -A CRON_SCHEDULES=(
    ["every-2-hours"]="0 */2 * * *"
    ["every-4-hours"]="0 */4 * * *"
    ["every-6-hours"]="0 */6 * * *"
    ["every-12-hours"]="0 */12 * * *"
    ["daily-midnight"]="0 0 * * *"
    ["daily-2am"]="0 2 * * *"
    ["daily-3am"]="0 3 * * *"
    ["twice-daily"]="0 2,14 * * *"
    ["weekdays-only"]="0 2 * * 1-5"
    ["weekends-only"]="0 2 * * 6,0"
)

# Generate cron job entry
generate_cron_entry() {
    local schedule="$1"
    local cron_expression="${CRON_SCHEDULES[$schedule]}"
    local log_file="$PROJECT_ROOT/backups/cron-backup.log"
    
    cat <<EOF
# OpenLearn Database Backup - $schedule
$cron_expression cd $PROJECT_ROOT && $BACKUP_SCRIPT >> $log_file 2>&1
EOF
}

# Show current cron jobs
show_current_cron() {
    log "INFO" "Current cron jobs for $(whoami):"
    echo "----------------------------------------"
    crontab -l 2>/dev/null || echo "No cron jobs found"
    echo "----------------------------------------"
}

# Install cron job
install_cron() {
    local schedule="$1"
    
    if [[ ! -f "$BACKUP_SCRIPT" ]]; then
        log "ERROR" "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    # Make backup script executable
    chmod +x "$BACKUP_SCRIPT"
    
    # Create backup directory and log file
    mkdir -p "$PROJECT_ROOT/backups"
    touch "$PROJECT_ROOT/backups/cron-backup.log"
    
    # Generate new cron entry
    local new_cron_entry=$(generate_cron_entry "$schedule")
    
    # Get current crontab
    local current_cron=$(crontab -l 2>/dev/null || true)
    
    # Remove any existing OpenLearn backup cron jobs
    local filtered_cron=$(echo "$current_cron" | grep -v "OpenLearn Database Backup" || true)
    
    # Add new cron job
    local updated_cron="$filtered_cron"$'\n'"$new_cron_entry"
    
    # Install updated crontab
    echo "$updated_cron" | crontab -
    
    log "INFO" "✅ Cron job installed successfully"
    log "INFO" "Schedule: $schedule (${CRON_SCHEDULES[$schedule]})"
    log "INFO" "Log file: $PROJECT_ROOT/backups/cron-backup.log"
    
    echo
    log "INFO" "New cron job:"
    echo "$new_cron_entry"
}

# Remove cron job
remove_cron() {
    local current_cron=$(crontab -l 2>/dev/null || true)
    local filtered_cron=$(echo "$current_cron" | grep -v "OpenLearn Database Backup" || true)
    
    if [[ "$current_cron" != "$filtered_cron" ]]; then
        echo "$filtered_cron" | crontab -
        log "INFO" "✅ OpenLearn backup cron jobs removed"
    else
        log "INFO" "No OpenLearn backup cron jobs found to remove"
    fi
}

# Test backup script
test_backup() {
    log "INFO" "Testing backup script..."
    
    if [[ ! -f "$BACKUP_SCRIPT" ]]; then
        log "ERROR" "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    chmod +x "$BACKUP_SCRIPT"
    
    if "$BACKUP_SCRIPT" --test; then
        log "INFO" "✅ Backup script test passed"
    else
        log "ERROR" "❌ Backup script test failed"
        exit 1
    fi
}

# Show help
show_help() {
    cat <<EOF
OpenLearn Database Backup Cron Setup

Usage: $0 [command] [options]

Commands:
    install [schedule]      Install cron job with specified schedule
    remove                  Remove existing backup cron jobs
    test                    Test backup script configuration
    status                  Show current cron jobs
    schedules               List available schedules

Available Schedules:
EOF

    for schedule in "${!CRON_SCHEDULES[@]}"; do
        printf "    %-20s %s\n" "$schedule" "${CRON_SCHEDULES[$schedule]}"
    done

    cat <<EOF

Examples:
    $0 install every-2-hours    Install backup every 2 hours
    $0 install daily-3am        Install daily backup at 3 AM
    $0 test                     Test backup configuration
    $0 status                   Show current cron jobs
    $0 remove                   Remove backup cron jobs

Log Files:
    Cron logs: $PROJECT_ROOT/backups/cron-backup.log
    Backup logs: $PROJECT_ROOT/backups/backup.log

EOF
}

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        "install")
            local schedule="${2:-}"
            if [[ -z "$schedule" ]]; then
                log "ERROR" "Schedule required. Use '$0 schedules' to see available options"
                exit 1
            fi
            
            if [[ ! -v "CRON_SCHEDULES[$schedule]" ]]; then
                log "ERROR" "Invalid schedule: $schedule"
                log "INFO" "Use '$0 schedules' to see available options"
                exit 1
            fi
            
            install_cron "$schedule"
            ;;
        "remove")
            remove_cron
            ;;
        "test")
            test_backup
            ;;
        "status")
            show_current_cron
            ;;
        "schedules")
            log "INFO" "Available backup schedules:"
            echo
            for schedule in $(printf '%s\n' "${!CRON_SCHEDULES[@]}" | sort); do
                printf "%-20s %s\n" "$schedule" "${CRON_SCHEDULES[$schedule]}"
            done
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    log "WARN" "Running as root. Cron jobs will be installed for root user."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

main "$@"
