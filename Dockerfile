
# syntax=docker/dockerfile:1

# Use Node.js 18 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for Prisma and other packages
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN npx prisma generate --schema=./src/data/repositories/prisma/schema.prisma && \
    npm run build

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 botuser && \
    chown -R botuser:nodejs /app

# Switch to non-root user
USER botuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Run database migrations and start the application
CMD npx prisma migrate deploy --schema=./src/data/repositories/prisma/schema.prisma && \
    npx prisma generate --schema=./src/data/repositories/prisma/schema.prisma && \
    npm start

