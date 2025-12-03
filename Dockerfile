# Production Dockerfile for Railway deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for better-sqlite3 native build (still needed for local dev fallback)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build:client

# Production image
FROM node:20-alpine

WORKDIR /app

# Install dependencies for better-sqlite3 (fallback for local testing)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (we'll run it with tsx)
COPY server ./server
COPY tsconfig.json ./

# Create data directory for SQLite (local dev fallback)
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start server with tsx (runs TypeScript directly)
CMD ["npx", "tsx", "server/index.ts"]
