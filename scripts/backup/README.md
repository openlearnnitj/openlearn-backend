# OpenLearn Database Backup System

A comprehensive PostgreSQL backup and restore solution with S3 integration and automated scheduling.

## Features

- **Automated PostgreSQL backups** with pg_dump
- **S3 cloud storage** for reliable backup storage
- **Configurable scheduling** with cron integration
- **Backup compression** with configurable levels
- **Automated cleanup** of old backups
- **Restore functionality** with safety features
- **Webhook notifications** for backup status
- **Comprehensive logging** and error handling
- **Test and dry-run modes** for validation

## Files Overview

```
scripts/backup/
├── db-backup.sh          # Main backup script
├── db-restore.sh         # Database restore script
├── setup-cron.sh         # Cron job setup and management
├── backup.env.example    # Environment configuration template
└── README.md             # This file
```

## 🛠️ Setup

### 1. Prerequisites

Install required dependencies:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-client awscli gzip bc

# CentOS/RHEL
sudo yum install postgresql awscli gzip bc
```

### 2. Configuration

Copy the environment template and configure:

```bash
cp scripts/backup/backup.env.example scripts/backup/backup.env
```

Add the backup environment variables to your `.env` file:

```bash
# S3 Configuration
BACKUP_S3_BUCKET=ol-postgres-backup
BACKUP_S3_REGION=us-east-1
BACKUP_AWS_ACCESS_KEY_ID=your_aws_access_key
BACKUP_AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Backup Settings
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION_LEVEL=6
BACKUP_PREFIX=openlearn

# Optional: Webhook for notifications
BACKUP_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. AWS S3 Setup

Create an S3 bucket for backups:

```bash
aws s3 mb s3://ol-postgres-backup --region us-east-1
```

Set up appropriate IAM permissions for the backup user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::ol-postgres-backup",
                "arn:aws:s3:::ol-postgres-backup/*"
            ]
        }
    ]
}
```

### 4. Make Scripts Executable

```bash
chmod +x scripts/backup/*.sh
```

## 📝 Usage

### Manual Backup

Run a one-time backup:

```bash
./scripts/backup/db-backup.sh
```

Test configuration without running backup:

```bash
./scripts/backup/db-backup.sh --test
```

Show what would be done without executing:

```bash
./scripts/backup/db-backup.sh --dry-run
```

### Automated Backups

Set up automated backups with cron:

```bash
# Install backup every 2 hours
./scripts/backup/setup-cron.sh install every-2-hours

# See all available schedules
./scripts/backup/setup-cron.sh schedules

# Check current cron jobs
./scripts/backup/setup-cron.sh status

# Remove backup cron jobs
./scripts/backup/setup-cron.sh remove
```

Available schedules:
- `every-2-hours` - Every 2 hours
- `every-4-hours` - Every 4 hours  
- `every-6-hours` - Every 6 hours
- `every-12-hours` - Every 12 hours
- `daily-midnight` - Daily at midnight
- `daily-2am` - Daily at 2 AM
- `daily-3am` - Daily at 3 AM
- `twice-daily` - Twice daily (2 AM and 2 PM)
- `weekdays-only` - Weekdays only at 2 AM
- `weekends-only` - Weekends only at 2 AM

### Database Restore

List available backups:

```bash
./scripts/backup/db-restore.sh --list
```

Restore latest backup:

```bash
./scripts/backup/db-restore.sh --latest
```

Restore specific backup:

```bash
./scripts/backup/db-restore.sh openlearn_20240830_143000.sql.gz
```

Restore without creating pre-restore backup:

```bash
./scripts/backup/db-restore.sh --latest --skip-backup
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_S3_BUCKET` | `ol-postgres-backup` | S3 bucket for backups |
| `BACKUP_S3_REGION` | `us-east-1` | S3 region |
| `BACKUP_AWS_ACCESS_KEY_ID` | - | AWS access key for backups |
| `BACKUP_AWS_SECRET_ACCESS_KEY` | - | AWS secret key for backups |
| `BACKUP_RETENTION_DAYS` | `30` | Days to keep backups |
| `BACKUP_COMPRESSION_LEVEL` | `6` | Gzip compression level (1-9) |
| `BACKUP_PREFIX` | `openlearn` | Backup filename prefix |
| `BACKUP_WEBHOOK_URL` | - | Webhook URL for notifications |

### Backup File Structure

Backups are stored in S3 with the following structure:

```
s3://ol-postgres-backup/
└── backups/
    ├── 2024/
    │   ├── 08/
    │   │   ├── openlearn_20240830_143000.sql.gz
    │   │   ├── openlearn_20240830_163000.sql.gz
    │   │   └── ...
    │   └── 09/
    │       ├── openlearn_20240901_020000.sql.gz
    │       └── ...
    └── 2024/
        └── ...
```

## 📊 Monitoring and Logging

### Log Files

- **Backup logs**: `backups/backup.log`
- **Cron logs**: `backups/cron-backup.log`

### Webhook Notifications

Configure webhook notifications for backup status:

```bash
# Slack webhook
BACKUP_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX

# Discord webhook  
BACKUP_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/your-webhook-token/slack
```

Notifications include:
- Backup success/failure status
- Backup duration
- File size information
- Error details on failure

### Monitoring Backup Health

Check recent backup logs:

```bash
tail -f backups/backup.log
```

Check cron job logs:

```bash
tail -f backups/cron-backup.log
```

List recent backups in S3:

```bash
aws s3 ls s3://ol-postgres-backup/backups/ --recursive | tail -10
```

## 🔒 Security Considerations

1. **Separate AWS credentials** for backups (principle of least privilege)
2. **Encrypt S3 bucket** with server-side encryption
3. **Secure .env file** permissions (600)
4. **Network security** for database access
5. **Monitor backup access** with CloudTrail

### S3 Security Setup

Enable S3 bucket encryption:

```bash
aws s3api put-bucket-encryption \
    --bucket ol-postgres-backup \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission denied for pg_dump**
   ```bash
   # Check database connection
   ./scripts/backup/db-backup.sh --test
   ```

2. **AWS credentials not found**
   ```bash
   # Verify AWS configuration
   aws configure list
   aws s3 ls s3://ol-postgres-backup
   ```

3. **S3 bucket access denied**
   ```bash
   # Check bucket permissions
   aws s3api get-bucket-policy --bucket ol-postgres-backup
   ```

4. **Cron job not running**
   ```bash
   # Check cron status
   sudo systemctl status cron
   
   # Check cron logs
   sudo tail -f /var/log/cron.log
   ```

### Debug Mode

Run backup script with verbose output:

```bash
./scripts/backup/db-backup.sh --verbose
```

### Test Database Connection

```bash
# Test PostgreSQL connection
pg_isready -h localhost -p 5432 -U postgres -d openlearn

# Test with password
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d openlearn -c "SELECT version();"
```

## 🔄 Backup Strategy Recommendations

### Production Environment

- **Frequency**: Every 2-4 hours during business hours
- **Retention**: 30 days for daily backups, 12 months for weekly backups
- **Monitoring**: Set up alerts for backup failures
- **Testing**: Monthly restore tests to verify backup integrity

### Development Environment

- **Frequency**: Daily backups
- **Retention**: 7-14 days
- **Monitoring**: Email notifications on failure

## 📈 Advanced Features

### Custom Backup Schedules

Create custom cron expressions:

```bash
# Every 30 minutes during business hours (9 AM - 6 PM, weekdays)
*/30 9-18 * * 1-5

# Weekly on Sunday at 2 AM
0 2 * * 0

# Monthly on the 1st at 3 AM
0 3 1 * *
```

### Backup Validation

The backup script includes several validation steps:

1. **Database connectivity test**
2. **S3 access verification**
3. **Backup file integrity check**
4. **Upload verification**
5. **Compression validation**

### Disaster Recovery

For complete disaster recovery:

1. **Document restore procedures**
2. **Test restore process regularly**
3. **Maintain off-site backup copies**
4. **Monitor backup health continuously**

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review log files for error details
3. Test individual components (database, S3 access)
4. Verify environment configuration

---

**Last Updated**: August 30, 2024  
**Version**: 1.0.0
