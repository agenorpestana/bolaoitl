# Multi-stage production build Dockerfile
# Stage 1: Build the client assets and bundle Express backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles and dependencies definition
COPY package*.json ./
RUN npm ci

# Copy codebase
COPY . .

# Compile application
RUN npm run build

# Stage 2: Minimalist production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts from stage 1
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database.json* ./

# Install only production dependencies to save storage space
RUN npm ci --only=production

# Expose reverse-proxy routed port
EXPOSE 3000

# Start deployment server
CMD ["node", "dist/server.cjs"]
