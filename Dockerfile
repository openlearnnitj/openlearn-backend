# Use Node.js LTS version as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

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

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S openlearn -u 1001

# Set working directory
WORKDIR /app

# Copy built application from base stage
COPY --from=base --chown=openlearn:nodejs /app/dist ./dist
COPY --from=base --chown=openlearn:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=openlearn:nodejs /app/package*.json ./
COPY --from=base --chown=openlearn:nodejs /app/prisma ./prisma

# Switch to non-root user
USER openlearn

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
