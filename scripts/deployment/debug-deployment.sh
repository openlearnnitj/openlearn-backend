# Quick Debug Script for Server
# Run this on your EC2 server to diagnose the issue

#!/bin/bash

echo "=== Checking Docker Container Logs ==="
docker logs current-app-1 --tail=100

echo ""
echo "=== Checking if .env file exists ==="
ls -la /home/ubuntu/openlearn-backend/.env
ls -la /home/ubuntu/openlearn-backend/current/.env

echo ""
echo "=== Checking current symlink ==="
ls -la /home/ubuntu/openlearn-backend/current

echo ""
echo "=== Checking container environment variables ==="
docker exec current-app-1 env | grep -E "POSTGRES|DATABASE_URL" || echo "Container not accessible"

echo ""
echo "=== Checking file structure in current ==="
ls -la /home/ubuntu/openlearn-backend/current/

echo ""
echo "=== Checking docker-compose.yml location ==="
cat /home/ubuntu/openlearn-backend/current/docker-compose.yml | head -20
