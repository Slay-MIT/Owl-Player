# Frontend Dockerfile (Next.js)
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Create necessary directories
RUN mkdir -p .next/static

# Copy source code
COPY . .

# Build the application with clean cache
RUN rm -rf .next/cache && \
    npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./static
COPY --from=builder /app/public ./public

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
