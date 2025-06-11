#!/bin/bash

# Render Build Script for OpenLearn Backend
# This script runs during deployment on Render

echo "Starting OpenLearn Backend deployment..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "Building TypeScript application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "✅ Build completed successfully!"
