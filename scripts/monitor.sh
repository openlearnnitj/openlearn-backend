#!/bin/bash

# OpenLearn Monitoring Script

APP_DIR="/home/ubuntu/openlearn-backend"
ENV_FILE="$APP_DIR/.env"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}OpenLearn System Status${NC}"
echo "========================="

# --- System Resources ---
echo -e "\nSystem Resources:"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEM_USAGE=$(free | awk '/Mem/ {printf("%.1f%%", $3/$2 * 100)}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')

echo "CPU Usage     : $CPU_USAGE%"
echo "Memory Usage  : $MEM_USAGE"
echo "Disk Usage    : $DISK_USAGE"

# --- Docker Containers ---
echo -e "\nDocker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo -e "${YELLOW}⚠ Docker not running${NC}"

# --- Recent Application Logs ---
echo -e "\nRecent Application Logs (last 10 lines):"
docker logs openlearn-app --tail 10 2>/dev/null || echo -e "${YELLOW}⚠ No application logs found or container not running${NC}"

# --- Health Check ---
echo -e "\nHealth Check:"
if curl -fs http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}✗ Application is not responding on localhost:3000${NC}"
fi

# --- SSL Certificate Info ---
echo -e "\nSSL Certificate:"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    if [ -n "$CORS_ORIGIN" ]; then
        DOMAIN=$(echo "$CORS_ORIGIN" | sed -e 's/^https\?:\/\///' | cut -d/ -f1)
        CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
        if [ -f "$CERT_PATH" ]; then
            EXPIRY=$(openssl x509 -in "$CERT_PATH" -noout -enddate | cut -d= -f2)
            echo -e "✓ SSL Certificate for ${GREEN}$DOMAIN${NC} expires on: ${YELLOW}$EXPIRY${NC}"
        else
            echo -e "${YELLOW}⚠ SSL certificate not found for $DOMAIN${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ CORS_ORIGIN not set in .env, cannot check SSL status${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found at $ENV_FILE${NC}"
fi

echo -e "\n${GREEN}✅ Monitoring complete${NC}"
