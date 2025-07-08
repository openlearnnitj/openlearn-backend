#!/bin/bash

set -e

echo "Starting deployment..."

# Load environment variables for docker-compose
set -a
source ../.env
set +a

# Pull the latest code
git pull

# Install dependencies
npm install

# Build the application
npm run build

# Restart the containers
docker-compose down
docker-compose up -d --build

# Run database migrations
docker-compose exec -T app npx prisma migrate deploy --schema prisma/schema.prisma


# Wait for the application to be healthy
echo "Waiting for application to become healthy..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "Application is healthy!"
        break
    fi
    echo "Attempt $i/10: Application not yet healthy, waiting 5 seconds..."
    sleep 5
done

if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "Application did not become healthy within the expected time."
    echo "Checking Docker container status:"
    docker-compose ps
    echo "Checking application logs:"
    docker-compose logs app
    exit 1
fi

echo "Deployment finished successfully!"

