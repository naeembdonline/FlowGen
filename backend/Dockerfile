# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - BACKEND DOCKERFILE (Development Mode)
# ============================================================================

FROM node:18-alpine

# Install Chromium and dependencies
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

# Install all dependencies (including dev dependencies for tsx)
RUN npm ci

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Start with tsx (TypeScript executor) - skip build
CMD ["npx", "tsx", "src/index.ts"]
