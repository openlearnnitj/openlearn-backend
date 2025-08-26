#!/bin/bash

set -e

echo "Starting deployment..."

# Change to the project root directory
cd /home/ubuntu/openlearn-backend

# Pull the latest code from main branch
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Restart the containers
docker-compose down
docker-compose up -d --build

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Attempt $i/30: PostgreSQL not ready, waiting 2 seconds..."
    sleep 2
done

# Check if PostgreSQL is ready
if ! docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "PostgreSQL failed to become ready within 60 seconds"
    echo "Checking PostgreSQL logs:"
    docker-compose logs postgres
    exit 1
fi

# Wait a bit more for the app to start connecting
echo "Waiting for app container to stabilize..."
sleep 10

# Check if app container is still running
if ! docker-compose ps app | grep -q "Up"; then
    echo "App container crashed. Checking logs:"
    docker-compose logs app
    
    # Try to restart the app container
    echo "Attempting to restart app container..."
    docker-compose restart app
    sleep 10
fi

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy --schema prisma/schema.prisma


# Wait for the application to be healthy
echo "Waiting for application to become healthy..."
for i in {1..20}; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "Application is healthy!"
        break
    fi
    
    # Check if app container is still running
    if ! docker-compose ps app | grep -q "Up"; then
        echo "App container crashed during startup. Checking logs:"
        docker-compose logs app
        exit 1
    fi
    
    echo "Attempt $i/20: Application not yet healthy, waiting 5 seconds..."
    sleep 5
done

if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "Application did not become healthy within the expected time."
    echo "Checking Docker container status:"
    docker-compose ps
    echo "Checking application logs:"
    docker-compose logs app
    echo "Checking PostgreSQL logs:"
    docker-compose logs postgres
    exit 1
fi

echo "Deployment finished successfully!"

echo ""
echo "=== Deployment Summary ==="
echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3000/health"
echo "📊 Detailed Health: http://localhost:3000/health/detailed"
echo ""
echo "🐳 Container Status:"
docker-compose ps
echo ""
echo "📋 Useful Commands:"
echo "  View logs: docker-compose logs -f app"
echo "  Restart app: docker-compose restart app"
echo "  Stop all: docker-compose down"
echo "  Database logs: docker-compose logs postgres"
echo "  Health check: curl http://localhost:3000/health"

