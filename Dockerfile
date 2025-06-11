# Use Node.js LTS version as base image
FROM node:18-alpine AS base

# Install bash and other build dependencies
RUN apk add --no-cache bash curl git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Make build script executable and run it
RUN chmod +x ./render-build.sh && bash ./render-build.sh

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S openlearn -u 1001

# Set working directory
WORKDIR /app

# Copy built application from base stage
COPY --from=base --chown=openlearn:nodejs /app/dist ./dist
COPY --from=base --chown=openlearn:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=openlearn:nodejs /app/package*.json ./
COPY --from=base --chown=openlearn:nodejs /app/prisma ./prisma

# Switch to non-root user
USER openlearn

# Expose port (Render will use PORT environment variable)
EXPOSE $PORT

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
