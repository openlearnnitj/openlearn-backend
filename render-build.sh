#!/bin/bash
# filepath: /home/rishi/StudioProjects/openlearn-js/render-build.sh

echo "Starting OpenLearn Backend deployment on Render..."

# Display environment information for debugging
echo "Environment Information:"
echo "   Node Version: $(node --version)"
echo "   NPM Version: $(npm --version)"
echo "   Platform: $(uname -a)"
echo "   Environment: ${NODE_ENV:-development}"

# Install dependencies with clean cache
echo "Installing dependencies..."
npm ci --only=production

# Install dev dependencies needed for build
echo "Installing development dependencies for build..."
npm install typescript @types/node prisma --save-dev

# Clean any existing Prisma generated files
echo "Cleaning existing Prisma client..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Generate Prisma client with correct binary targets
echo "Generating Prisma client for production environment..."
npx prisma generate --no-hints

# Verify Prisma client generation
echo "Verifying Prisma client generation..."
if [ -d "node_modules/.prisma/client" ]; then
    echo "✅ Prisma client generated successfully"
    ls -la node_modules/.prisma/client/
else
    echo "❌ Prisma client generation failed"
    exit 1
fi

# Build TypeScript application
echo "🔨 Building TypeScript application..."
npm run build

# Verify build output
echo "🔍 Verifying build output..."
if [ -d "dist" ]; then
    echo "✅ TypeScript build successful"
    ls -la dist/
else
    echo "❌ TypeScript build failed"
    exit 1
fi

# Run database migrations (uses DATABASE_URL from Render environment)
echo "Running database migrations..."
npx prisma migrate deploy

# Verify database connection
echo "Testing database connection..."
npx prisma db execute --stdin <<< "SELECT 1;" && echo "✅ Database connection successful" || echo "⚠️ Database connection test failed"

# Seed admin user for production (only if it doesn't exist)
echo "Checking and seeding Grand Pathfinder admin..."
npm run seed:admin:production

echo "Build completed successfully! OpenLearn Backend ready for deployment."