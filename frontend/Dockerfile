# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - FRONTEND DOCKERFILE
# ============================================================================
# Multi-stage build for Next.js application
# Development mode: runs with next dev for hot reloading
# Production mode: builds optimized static assets and runs with next start
# ============================================================================

FROM node:18-alpine AS base

WORKDIR /app

# ============================================================================
# DEPENDENCIES STAGE
# ============================================================================
FROM base AS dependencies

# Copy package files for proper caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# ============================================================================
# DEVELOPMENT STAGE
# ============================================================================
FROM base AS development

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in dev mode with hot reload
CMD ["npm", "run", "dev"]

# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM base AS production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies only
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
