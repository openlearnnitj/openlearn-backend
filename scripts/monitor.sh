#!/bin/bash

# OpenLearn Monitoring Script

APP_DIR="/home/ubuntu/openlearn-backend"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "OpenLearn System Status"
echo "========================="

# System resources
echo -e "\nSystem Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf(\"%.1f%%\", $3/$2 * 100.0)}'")"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf \"%s\", $5}')"

# Docker containers
echo -e "\nDocker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Recent logs (assuming Docker logs for the app container)
echo -e "\nRecent Application Logs (last 10 lines):"
docker logs openlearn-app --tail 10 2>/dev/null || echo "No application logs found or container not running."

# Health check
echo -e "\nHealth Check:"
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}✗ Application is not responding${NC}"
fi

# SSL certificate status (assuming Nginx is configured and domain is set in .env)
echo -e "\nSSL Certificate:"
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
    if [ -n "$CORS_ORIGIN" ]; then
        DOMAIN=$(echo $CORS_ORIGIN | sed -e 's/^https:\/\///')
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates | grep notAfter | cut -d= -f2)
            echo "Expires: $EXPIRY"
        else
            echo -e "${YELLOW}⚠ SSL certificate not found for $DOMAIN${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ CORS_ORIGIN not set in .env, cannot check SSL status.${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found, cannot check SSL status.${NC}"
fi
