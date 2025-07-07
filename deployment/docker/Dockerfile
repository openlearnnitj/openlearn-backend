# Production Dockerfile for OpenLearn Backend
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S openlearn -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=openlearn:nodejs /app/dist ./dist
COPY --from=builder --chown=openlearn:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=openlearn:nodejs /app/prisma ./prisma
COPY --from=builder --chown=openlearn:nodejs /app/package*.json ./
COPY --from=builder --chown=openlearn:nodejs /app/public ./public

# Create logs and uploads directories
RUN mkdir -p logs uploads && chown -R openlearn:nodejs logs uploads

# Switch to non-root user
USER openlearn

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
