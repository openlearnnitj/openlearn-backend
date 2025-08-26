#!/bin/bash

# OpenLearn Backend Troubleshooting Script
# Use this script to diagnose deployment issues

echo "🔍 OpenLearn Backend Diagnostic Report"
echo "====================================="
echo "Timestamp: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the OpenLearn backend directory"
    echo "Expected files: docker-compose.yml, package.json"
    exit 1
fi

# Check Docker and Docker Compose
echo "🐳 Docker Environment:"
echo "  Docker version: $(docker --version 2>/dev/null || echo 'Not installed')"
echo "  Docker Compose version: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
echo ""

# Check container status
echo "📊 Container Status:"
docker-compose ps 2>/dev/null || echo "❌ Could not get container status"
echo ""

# Check if containers are running
app_status=$(docker-compose ps app 2>/dev/null | grep -c "Up" || echo "0")
db_status=$(docker-compose ps postgres 2>/dev/null | grep -c "Up" || echo "0")

echo "🔍 Service Status:"
echo "  App Container: $([ "$app_status" -gt 0 ] && echo "✅ Running" || echo "❌ Not running")"
echo "  Database Container: $([ "$db_status" -gt 0 ] && echo "✅ Running" || echo "❌ Not running")"
echo ""

# Check environment variables
echo "🔧 Environment Check:"
if [ -f ".env" ]; then
    echo "  ✅ .env file exists"
    echo "  📋 Environment variables:"
    while IFS= read -r line; do
        if [[ "$line" =~ ^[A-Z_]+=.* ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            if [[ "$var_name" == *"PASSWORD"* || "$var_name" == *"SECRET"* ]]; then
                echo "    $var_name=***"
            else
                echo "    $line"
            fi
        fi
    done < .env
else
    echo "  ❌ .env file missing"
fi
echo ""

# Check logs if containers exist
if [ "$app_status" -gt 0 ] || docker-compose ps app 2>/dev/null | grep -q "Exit"; then
    echo "📋 Recent App Logs (last 20 lines):"
    docker-compose logs --tail=20 app 2>/dev/null || echo "❌ Could not get app logs"
    echo ""
fi

if [ "$db_status" -gt 0 ] || docker-compose ps postgres 2>/dev/null | grep -q "Exit"; then
    echo "📋 Recent Database Logs (last 10 lines):"
    docker-compose logs --tail=10 postgres 2>/dev/null || echo "❌ Could not get database logs"
    echo ""
fi

# Test connectivity
echo "🌐 Connectivity Tests:"
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "  ✅ Health endpoint responding"
    echo "  📊 Health details:"
    curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "  ❌ Health endpoint not responding"
fi
echo ""

# Database connectivity
if [ "$db_status" -gt 0 ]; then
    echo "🗄️ Database Connectivity:"
    if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "  ✅ PostgreSQL is ready"
    else
        echo "  ❌ PostgreSQL is not ready"
    fi
    echo ""
fi

# Disk space and resources
echo "💾 System Resources:"
echo "  Disk usage:"
df -h . 2>/dev/null | tail -1 | awk '{print "    Available: " $4 " (" $5 " used)"}'
echo "  Memory usage:"
free -h 2>/dev/null | grep "Mem:" | awk '{print "    Available: " $7 " / " $2}'
echo ""

# Docker system info
echo "🐳 Docker Resources:"
docker system df 2>/dev/null | grep -v "REPOSITORY" || echo "❌ Could not get Docker resource usage"
echo ""

echo "🔍 Troubleshooting Suggestions:"
if [ "$app_status" -eq 0 ]; then
    echo "  📝 App container not running:"
    echo "    - Check app logs: docker-compose logs app"
    echo "    - Try restarting: docker-compose restart app"
    echo "    - Check environment variables in .env file"
fi

if [ "$db_status" -eq 0 ]; then
    echo "  📝 Database container not running:"
    echo "    - Check database logs: docker-compose logs postgres"
    echo "    - Verify POSTGRES_* environment variables"
    echo "    - Try restarting: docker-compose restart postgres"
fi

if ! curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "  📝 Application not responding:"
    echo "    - Wait for database to be ready (can take 30-60 seconds)"
    echo "    - Check if port 3000 is in use: netstat -tlnp | grep 3000"
    echo "    - Try rebuilding: docker-compose down && docker-compose up -d --build"
fi

echo ""
echo "📞 Quick Commands:"
echo "  Restart everything: docker-compose down && docker-compose up -d --build"
echo "  View live logs: docker-compose logs -f"
echo "  Health check: curl http://localhost:3000/health"
echo "  Stop everything: docker-compose down"
