# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - BACKEND DOCKERFILE
# ============================================================================
# Production Docker image with Puppeteer and Chromium support
# Optimized for Linux servers with headless Chrome
# ============================================================================

FROM node:18-alpine

# Metadata
LABEL maintainer="FlowGen <info@flowgen.com>"
LABEL description="FlowGen Lead Generation SaaS - Backend API with Puppeteer scraper"

# ============================================================================
# INSTALL CHROMIUM AND SYSTEM DEPENDENCIES FOR PUPPETEER
# ============================================================================

# Install all required dependencies for Puppeteer/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # Additional dependencies for headless Chrome
    cups-libs \
    libgbm \
    libxkbcommon \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxrandr \
    xdg-utils \
    # Fonts for proper rendering
    msttcore-fonts \
    # Build tools for native modules
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip bundled Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_HEADLESS=true \
    PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

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

# Create logs directory
RUN mkdir -p /app/logs

# ============================================================================
# BUILD TYPESCRIPT
# ============================================================================

RUN npm run build

# ============================================================================
# SECURITY & PERFORMANCE
# ============================================================================

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# ============================================================================
# HEALTH CHECK
# ============================================================================

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health --timeout=5 -O /dev/null || exit 1

# ============================================================================
# STARTUP COMMAND
# ============================================================================

CMD ["node", "dist/index.js"]

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
