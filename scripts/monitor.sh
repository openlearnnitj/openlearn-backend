#!/bin/bash

# OpenLearn Monitoring Script
APP_DIR="/home/ubuntu/openlearn-backend"
ENV_FILE="$APP_DIR/.env"

echo "==== OpenLearn EC2 Monitoring Report ===="
date

# System Metrics
echo -e "\n-- System Metrics --"
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
MEM=$(free -m | awk '/Mem:/ { printf "%.1f%%", $3/$2*100 }')
DISK=$(df -h / | awk 'NR==2{print $5}')

echo "CPU Usage: $CPU%"
echo "Memory Usage: $MEM"
echo "Disk Usage: $DISK"

# Docker Status
echo -e "\n-- Docker Containers --"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "Docker not running."

# Application Logs
echo -e "\n-- Application Logs (last 10 lines) --"
docker logs openlearn-app --tail 10 2>/dev/null || echo "No logs or container 'openlearn-app' not found."

# Application Health
echo -e "\n-- Health Check --"
if curl -sf http://localhost:3000/health > /dev/null; then
    echo "Application is healthy (responded to /health)"
else
    echo "Application is NOT responding on /health"
fi

# SSL Certificate Check
echo -e "\n-- SSL Certificate Status --"
if [ -f "$ENV_FILE" ]; then
    DOMAIN=$(grep '^CORS_ORIGIN=' "$ENV_FILE" | cut -d'=' -f2 | sed 's|https://||')
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if [ -f "$CERT_PATH" ]; then
        EXPIRY=$(openssl x509 -in "$CERT_PATH" -noout -enddate | cut -d= -f2)
        echo "SSL Certificate for $DOMAIN expires on: $EXPIRY"
    else
        echo "No SSL certificate found at: $CERT_PATH"
    fi
else
    echo ".env not found or CORS_ORIGIN missing"
fi

echo -e "\n==== End of Report ===="
