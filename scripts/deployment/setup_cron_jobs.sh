#!/bin/bash

# OpenLearn Cron Job Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"; }

# Configuration
APP_DIR="/home/ubuntu/openlearn-backend"
BACKUP_DIR="/home/ubuntu/openlearn-backups"

log "Setting up cron jobs for OpenLearn backend..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup script
log "Creating backup script at $APP_DIR/scripts/backup.sh..."
cat > $APP_DIR/scripts/backup.sh <<EOF
#!/bin/bash

set -e

DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec openlearn-postgres pg_dump -U postgres openlearn_prod | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Application files backup (uploads and .env)
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C $APP_DIR uploads .env

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF
chmod +x $APP_DIR/scripts/backup.sh
success "Backup script created."

# Add cron jobs
log "Adding cron jobs..."
(crontab -l 2>/dev/null; echo "# OpenLearn automated tasks") | crontab -
(crontab -l; echo "0 2 * * * $APP_DIR/scripts/backup.sh >> $APP_DIR/logs/backup.log 2>&1") | crontab -
(crontab -l; echo "*/5 * * * * $APP_DIR/scripts/monitor.sh > /dev/null 2>&1") | crontab -
success "Cron jobs added: daily backup at 2 AM, and monitoring every 5 minutes."

log "Cron job setup complete."
