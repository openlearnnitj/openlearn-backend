#!/bin/bash

# OpenLearn Development Environment Setup Script
# This script sets up a complete local development environment

set -e  # Exit on any error

echo "🚀 Setting up OpenLearn Development Environment..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
print_status "Checking required tools..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

print_success "All required tools are available"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Please create one from .env.example"
    exit 1
fi

print_success ".env file found"

# Stop any existing containers
print_status "Stopping any existing containers..."
sudo docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Clean up Docker system
print_status "Cleaning up Docker system..."
sudo docker system prune -f

# Start database and Redis services
print_status "Starting PostgreSQL and Redis services..."
sudo docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if PostgreSQL is ready
print_status "Checking PostgreSQL connection..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if sudo docker exec openlearn-postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL failed to start after $max_attempts attempts"
        exit 1
    fi
    
    print_status "Attempt $attempt/$max_attempts: Waiting for PostgreSQL..."
    sleep 2
    ((attempt++))
done

# Check if Redis is ready
print_status "Checking Redis connection..."
if sudo docker exec openlearn-redis-dev redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready!"
else
    print_error "Redis failed to start"
    exit 1
fi

# Install npm dependencies
print_status "Installing npm dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Run database migrations
print_status "Running database migrations..."
npx prisma migrate deploy

# Seed the database with development data
print_status "Seeding database with development data..."
npx tsx prisma/seed-dev.ts

# Build the application
print_status "Building the application..."
npm run build

print_success "Development environment setup complete!"
echo ""
echo "🎉 OpenLearn Development Environment is Ready!"
echo "=============================================="
echo ""
echo "📋 Services Status:"
echo "   ✅ PostgreSQL: Running on localhost:5432"
echo "   ✅ Redis: Running on localhost:6379"
echo "   ✅ Adminer (DB UI): Running on localhost:8080"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Admin: admin@openlearn.org.in / admin123!"
echo "   Developer: developer@openlearn.org.in / dev123!"
echo "   Pioneer: test.pioneer@openlearn.org.in / pioneer123!"
echo ""
echo "🌐 Database Management (Adminer):"
echo "   URL: http://localhost:8080"
echo "   Server: postgres"
echo "   Username: postgres"
echo "   Password: openlearn_dev_password"
echo "   Database: openlearn_dev"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "🔧 Useful Development Commands:"
echo "   npm run dev          - Start development server"
echo "   npm run build        - Build for production"
echo "   npm run prisma:studio - Open Prisma Studio"
echo "   npm run db:reset     - Reset database with fresh data"
echo "   npm run db:seed      - Re-seed database"
echo "   npm run test         - Run tests"
echo ""
echo "📝 Logs and Debugging:"
echo "   Logs: ./logs/ directory"
echo "   Database logs: Docker container logs"
echo ""
echo "🛑 To stop services:"
echo "   sudo docker-compose -f docker-compose.dev.yml down"
echo ""
print_success "Happy coding! 🎯"
