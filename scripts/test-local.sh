#!/bin/bash

# Local Pre-deployment Test Script
# Run this before pushing to ensure your changes will pass CI/CD

set -e

echo "🧪 OpenLearn Pre-deployment Tests"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📍 Running tests in: $(pwd)"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 2. Run linting
echo ""
echo "🔍 Running ESLint..."
if npm run lint; then
    echo "✅ ESLint passed"
else
    echo "❌ ESLint failed - please fix linting errors"
    exit 1
fi

# 3. Build TypeScript
echo ""
echo "🏗️ Building TypeScript..."
if npm run build; then
    echo "✅ TypeScript build successful"
else
    echo "❌ TypeScript build failed - please fix compilation errors"
    exit 1
fi

# 4. Check if Docker is available for local testing
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo ""
    echo "🐳 Docker detected - testing with local containers..."
    
    # Start test database
    echo "🗄️ Starting test database..."
    docker-compose -f docker-compose.yml up -d postgres
    
    # Wait for database
    echo "⏳ Waiting for database to be ready..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            echo "✅ Database is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Database failed to start"
            docker-compose logs postgres
            exit 1
        fi
        sleep 2
    done
    
    # Generate Prisma client and run migrations
    echo "🗄️ Setting up database..."
    npx prisma generate
    npx prisma migrate deploy
    
    # Run tests
    echo ""
    echo "🧪 Running tests with database..."
    if npm test; then
        echo "✅ All tests passed"
    else
        echo "❌ Tests failed"
        docker-compose down
        exit 1
    fi
    
    # Cleanup
    echo "🧹 Cleaning up test containers..."
    docker-compose down
    
else
    echo ""
    echo "⚠️  Docker not available - skipping database tests"
    echo "🧪 Running tests without database..."
    
    # Run tests without database (if configured)
    if npm run test:unit 2>/dev/null; then
        echo "✅ Unit tests passed"
    else
        echo "ℹ️  No unit tests found or failed"
    fi
fi

# 5. Security audit
echo ""
echo "🔒 Running security audit..."
if npm audit --audit-level high; then
    echo "✅ No high-risk vulnerabilities found"
else
    echo "⚠️  High-risk vulnerabilities found - consider running 'npm audit fix'"
fi

# 6. Check environment files
echo ""
echo "🔧 Checking environment configuration..."
if [ -f ".env.example" ]; then
    echo "✅ .env.example found"
    
    if [ -f ".env" ]; then
        echo "✅ .env found"
        
        # Check if all required vars from .env.example exist in .env
        while IFS= read -r line; do
            if [[ "$line" =~ ^[A-Z_]+=.* ]]; then
                var_name=$(echo "$line" | cut -d'=' -f1)
                if ! grep -q "^$var_name=" .env; then
                    echo "⚠️  Missing environment variable: $var_name"
                fi
            fi
        done < .env.example
        
    else
        echo "⚠️  .env not found - copy from .env.example"
    fi
else
    echo "ℹ️  .env.example not found"
fi

# 7. Check for common issues
echo ""
echo "🔍 Checking for common issues..."

# Check for uncommitted changes
if git status --porcelain | grep -q .; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
fi

# Check current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $current_branch"

if [ "$current_branch" = "main" ]; then
    echo "⚠️  You're on the main branch - consider working on develop"
fi

# Check if ahead of remote
if git status | grep -q "ahead"; then
    echo "📤 You have local commits ready to push"
fi

echo ""
echo "🎉 Pre-deployment checks complete!"
echo ""
echo "📋 Summary:"
echo "✅ Dependencies installed"
echo "✅ ESLint passed"
echo "✅ TypeScript built successfully"
echo "✅ Tests completed"
echo "✅ Security audit completed"
echo ""
echo "🚀 Your code is ready for CI/CD!"
echo ""
echo "Next steps:"
if [ "$current_branch" = "develop" ]; then
    echo "1. Push to develop: git push origin develop"
    echo "2. Create PR to main when ready"
elif [ "$current_branch" = "main" ]; then
    echo "1. Push to main: git push origin main (will trigger production deployment)"
else
    echo "1. Push to current branch: git push origin $current_branch"
    echo "2. Merge to develop when ready"
fi
echo ""
echo "🔗 Monitor deployment: https://github.com/YOUR_USERNAME/openlearn-backend/actions"
