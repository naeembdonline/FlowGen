# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - FRONTEND DOCKERFILE
# ============================================================================

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for compatibility)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
