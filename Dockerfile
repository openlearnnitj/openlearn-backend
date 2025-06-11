# ========================================
# BUILD STAGE - Compile TypeScript & Generate Prisma Client
# ========================================
FROM node:18-alpine AS builder

# Install build dependencies needed for compilation
RUN apk add --no-cache bash curl git python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build process)
RUN echo "📦 Installing OpenLearn dependencies..." && \
    npm ci && \
    npm cache clean --force && \
    echo "✅ Dependencies installed successfully"

# Copy Prisma schema for client generation
COPY prisma ./prisma

# Generate Prisma client (no DATABASE_URL needed for generation)
RUN echo "🔧 Generating Prisma client for OpenLearn..." && \
    npx prisma generate --no-hints && \
    echo "✅ Prisma client generated successfully"

# Copy source code for TypeScript compilation
COPY src ./src

# Build TypeScript application
RUN echo "🔨 Building OpenLearn Backend TypeScript..." && \
    npm run build && \
    echo "✅ TypeScript compilation successful"

# Verify build output exists
RUN if [ ! -d "dist" ]; then \
        echo "❌ Build failed - dist directory not found" && exit 1; \
    else \
        echo "✅ Build verification passed" && ls -la dist/; \
    fi

# Install only production dependencies for final image
RUN echo "🧹 Installing production dependencies only..." && \
    npm ci --only=production && \
    npm cache clean --force && \
    echo "✅ Production dependencies ready"

# ========================================
# PRODUCTION STAGE - Runtime Environment
# ========================================
FROM node:18-alpine AS production

# Install runtime system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    bash \
    postgresql-client \
    && echo "✅ Runtime dependencies installed"

# Create non-root user for security (OpenLearn security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S openlearn -u 1001 -G nodejs && \
    echo "✅ OpenLearn user created"

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=openlearn:nodejs /app/dist ./dist
COPY --from=builder --chown=openlearn:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=openlearn:nodejs /app/package*.json ./
COPY --from=builder --chown=openlearn:nodejs /app/prisma ./prisma

# Copy and prepare runtime initialization script
COPY --chown=openlearn:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user for security
USER openlearn

# Expose port (Render provides PORT environment variable)
EXPOSE $PORT

# Health check for OpenLearn platform monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Use custom entrypoint that handles database setup at runtime
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]