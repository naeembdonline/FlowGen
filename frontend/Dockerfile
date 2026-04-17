# ============================================================================
# FLOWGEN LEAD GENERATION SAAS - FRONTEND DOCKERFILE (Dev Mode)
# ============================================================================

FROM node:18-alpine

WORKDIR /app

# Copy package.json only (skip lockfile)
COPY package.json ./

# Install dependencies fresh
RUN npm install --force

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in dev mode
CMD ["npm", "run", "dev"]
