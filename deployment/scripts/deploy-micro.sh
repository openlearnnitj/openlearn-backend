#!/bin/bash

# Micro Instance Deployment Script for OpenLearn Backend
# Optimized for 950MB RAM - Only Postgres + App

set -e

echo "Starting OpenLearn Micro Deployment (Postgres + App only)..."

# Load environment variables
if [ -f "environments/.env.micro" ]; then
    echo "Loading micro instance environment..."
    export $(grep -v '^#' environments/.env.micro | xargs)
else
    echo "❌ Micro environment file not found!"
    echo "Please ensure environments/.env.micro exists"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f deployment/docker/docker-compose.micro.yml down --remove-orphans 2>/dev/null || true

# Clean up resources
echo "Cleaning up Docker resources..."
docker system prune -f

# Check available memory
echo "System Resources:"
free -h
echo ""

# Build and start services
echo "Building and starting services (App + Postgres only)..."
docker-compose -f deployment/docker/docker-compose.micro.yml up -d --build

# Wait for services to initialize
echo "Waiting for services to start..."
sleep 45

# Check container status
echo "Container Status:"
docker-compose -f deployment/docker/docker-compose.micro.yml ps

# Wait for Postgres to be ready
echo "Waiting for Postgres to be ready..."
for i in {1..30}; do
    if docker-compose -f deployment/docker/docker-compose.micro.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ Postgres is ready!"
        break
    fi
    echo "   Attempt $i/30... waiting 2 seconds"
    sleep 2
done

# Run database migrations
echo "Running database migrations..."
if docker-compose -f deployment/docker/docker-compose.micro.yml exec -T app npx prisma migrate deploy; then
    echo "✅ Database migrations completed!"
else
    echo "⚠️  Migration failed or no migrations to run"
fi

# Test API health
echo "Testing API health..."
sleep 10
for i in {1..10}; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ API is healthy!"
        break
    fi
    echo "   Health check attempt $i/10... waiting 3 seconds"
    sleep 3
done

# Show resource usage
echo "Current Resource Usage:"
docker stats --no-stream

# Show recent logs
echo "Recent Application Logs:"
docker-compose -f deployment/docker/docker-compose.micro.yml logs --tail=15 app

echo ""
echo "Micro Deployment Complete!"
echo ""
echo "Management Commands:"
echo "   View logs: docker-compose -f deployment/docker/docker-compose.micro.yml logs -f"
echo "   Check status: docker-compose -f deployment/docker/docker-compose.micro.yml ps"
echo "   Restart app: docker-compose -f deployment/docker/docker-compose.micro.yml restart app"
echo "   Stop all: docker-compose -f deployment/docker/docker-compose.micro.yml down"
echo ""
echo "API Health Check: curl http://localhost:3000/health"
