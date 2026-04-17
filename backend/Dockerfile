# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - BACKEND DOCKERFILE
# ============================================================================
# Multi-stage build for production optimization
# Development mode: uses tsx for direct TypeScript execution
# Production mode: builds and runs compiled JavaScript
# ============================================================================

FROM node:18-alpine AS base

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    cups-libs \
    libxkbcommon \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxrandr \
    xdg-utils \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_HEADLESS=true

WORKDIR /app

# ============================================================================
# DEPENDENCIES STAGE
# ============================================================================
FROM base AS dependencies

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for tsx in dev mode)
RUN npm ci

# ============================================================================
# DEVELOPMENT STAGE
# ============================================================================
FROM base AS development

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Start with tsx (TypeScript executor) - skip build for hot reload
CMD ["npx", "tsx", "src/index.ts"]

# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM base AS production

# Copy only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Start production server
CMD ["node", "dist/index.js"]
