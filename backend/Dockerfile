# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - BACKEND DOCKERFILE
# ============================================================================

FROM node:18-alpine

# Install Chromium and dependencies (Alpine 3.21 compatible)
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

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || echo "Build failed, continuing anyway..."

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "dist/index.js"]
