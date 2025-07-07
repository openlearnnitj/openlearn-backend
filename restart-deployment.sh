#!/bin/bash

# Restart Deployment Script for OpenLearn Backend
# This script stops all containers and starts them fresh with the updated configuration

set -e

echo "🔄 Restarting OpenLearn deployment..."

# Stop and remove all containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.production.yml down --remove-orphans

# Remove any dangling containers
echo "🧹 Cleaning up..."
docker system prune -f

# Build and start all services
echo "🚀 Starting all services (API, Postgres, Redis)..."
docker-compose -f docker-compose.production.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.production.yml ps

# Check logs for any immediate errors
echo "📋 Recent logs:"
docker-compose -f docker-compose.production.yml logs --tail=20

# Test database connection
echo "🔌 Testing database connection..."
if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U postgres; then
    echo "✅ Database is ready!"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# Test Redis connection
echo "🔌 Testing Redis connection..."
if docker-compose -f docker-compose.production.yml exec -T redis redis-cli -a "${REDIS_PASSWORD}" ping; then
    echo "✅ Redis is ready!"
else
    echo "❌ Redis connection failed!"
    exit 1
fi

# Test API health
echo "🔌 Testing API health..."
sleep 10
if curl -f http://localhost:3000/health 2>/dev/null; then
    echo "✅ API is healthy!"
else
    echo "⚠️  API health check failed (this might be normal if still starting)"
fi

echo "🎉 Deployment restart complete!"
echo "📊 Monitor logs with: docker-compose -f docker-compose.production.yml logs -f"
echo "📈 Check status with: docker-compose -f docker-compose.production.yml ps"
