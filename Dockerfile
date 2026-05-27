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

# Copy all built assets, configurations, and dependencies from the builder stage
# This preserves the entire node_modules structure (including the pre-built Prisma client engine)
# and the crucial schema definitions in /prisma
COPY --from=builder /app ./

# Expose reverse-proxy routed port
EXPOSE 3000

# Start deployment server
CMD ["node", "dist/server.cjs"]
