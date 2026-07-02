# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN npm ci --only=production && npm ci --only=dev || npm ci

# Copy source code and Prisma schema
COPY src ./src
COPY tsconfig.json ./
COPY prisma ./prisma

# Generate Prisma client and build
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install only production dependencies
RUN npm ci --only=production

# Copy Prisma files
COPY prisma ./prisma

# Generate Prisma client
RUN npm run prisma:generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose application port (adjust if your app uses a different port)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
