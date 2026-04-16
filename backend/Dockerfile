# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - BACKEND DOCKERFILE
# ============================================================================
# Production Docker image with Puppeteer and Chromium support
# For self-hosted Google Maps scraping (100% free)
# ============================================================================

FROM node:18-alpine

# Metadata
LABEL maintainer="FlowGen <info@flowgen.com>"
LABEL description="FlowGen Lead Generation SaaS - Backend API with Puppeteer scraper"

# ============================================================================
# INSTALL CHROMIUM AND DEPENDENCIES
# ============================================================================

# Install Chromium and system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip bundled Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ============================================================================
# WORKDIR SETUP
# ============================================================================

WORKDIR /app

# ============================================================================
# NODE.JS SETUP
# ============================================================================

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================

ENV NODE_ENV=production \
    PORT=3001 \
    PUPPETEER_HEADLESS=true \
    PUPPETEER_TIMEOUT=60000

# ============================================================================
# CREATE LOG DIRECTORY
# ============================================================================

RUN mkdir -p logs && \
    chown -R node:node /app

# ============================================================================
# HEALTH CHECK
# ============================================================================

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health')"

# ============================================================================
# EXPOSE PORT
# ============================================================================

EXPOSE 3001

# ============================================================================
# STARTUP COMMAND
# ============================================================================

CMD ["node", "dist/index.js"]

# ============================================================================
# BUILD NOTES
# ============================================================================
#
# Build the Docker image:
#   docker build -t fikerflow-backend -f Dockerfile ../
#
# Run the container:
#   docker run -p 3001:3001 fikerflow-backend
#
# With Docker Compose:
#   docker-compose up -d backend
#
# ============================================================================
