#!/bin/bash

# ============================================================================
# LEAD GENERATION SAAS - COMPLETE SERVER DEPLOYMENT SCRIPT
# Domain: leads.naeemmia.bd
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  LEAD GENERATION SAAS - AUTOMATED SERVER DEPLOYMENT${NC}"
echo -e "${BLUE}============================================================================${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# ============================================================================
# SAFETY CHECKS
# ============================================================================
echo -e "${YELLOW}[SAFETY CHECK] Analyzing existing setup...${NC}"

# Show existing Docker containers
echo -e "\n${YELLOW}Existing Docker containers:${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No existing containers found"

# Show existing Nginx sites
echo -e "\n${YELLOW}Existing Nginx sites:${NC}"
ls -1 /etc/nginx/sites-enabled/ 2>/dev/null || echo "No existing sites found"

echo -e "\n${GREEN}✅ Safety check complete - will not modify existing setups${NC}\n"

read -p "Press Enter to continue or Ctrl+C to cancel..."

# ============================================================================
# PREPARE SYSTEM
# ============================================================================
echo -e "${YELLOW}[1/9] Installing system dependencies...${NC}"
apt update
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban docker.io docker-compose

echo -e "${GREEN}✅ System dependencies installed${NC}\n"

# ============================================================================
# CREATE PROJECT STRUCTURE
# ============================================================================
echo -e "${YELLOW}[2/9] Creating project directory structure...${NC}"
mkdir -p /root/lead-saas/{backend/src,frontend/src,logs,backups,ssl}
cd /root/lead-saas

echo -e "${GREEN}✅ Directory structure created${NC}\n"

# ============================================================================
# CHECK FOR PROJECT FILES
# ============================================================================
echo -e "${YELLOW}[3/9] Checking project files...${NC}"

if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ docker-compose.production.yml not found${NC}"
    echo -e "${YELLOW}Please upload your project files to /root/lead-saas${NC}"
    exit 1
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating environment file...${NC}"
    if [ -f "backend/.env.production.template" ]; then
        cp backend/.env.production.template backend/.env
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit backend/.env with your credentials!${NC}"
        echo -e "${YELLOW}Run: nano /root/lead-saas/backend/.env${NC}"
        read -p "Press Enter after configuring .env file..."
    else
        echo -e "${RED}❌ No environment template found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Project files present${NC}\n"

# ============================================================================
# CREATE NGINX CONFIGURATION
# ============================================================================
echo -e "${YELLOW}[4/9] Creating Nginx configuration for leads.naeemmia.bd...${NC}"

cat > /etc/nginx/sites-available/leads.naeemmia.bd << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name leads.naeemmia.bd www.leads.naeemmia.bd;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name leads.naeemmia.bd www.leads.naeemmia.bd;

    ssl_certificate /etc/letsencrypt/live/leads.naeemmia.bd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leads.naeemmia.bd/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/leads.naeemmia.bd-access.log;
    error_log /var/log/nginx/leads.naeemmia.bd-error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Access-Control-Allow-Origin "https://leads.naeemmia.bd" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        if ($request_method = 'OPTIONS') { return 204; }
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        access_log off;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/leads.naeemmia.bd /etc/nginx/sites-enabled/

if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration created${NC}\n"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

# ============================================================================
# OBTAIN SSL CERTIFICATE
# ============================================================================
echo -e "${YELLOW}[5/9] Obtaining SSL certificate for leads.naeemmia.bd...${NC}"

if certbot certonly --webroot -w /var/www/html \
    -d leads.naeemmia.bd \
    -d www.leads.naeemmia.bd \
    --email admin@naeemmia.bd \
    --agree-tos \
    --no-eff-email \
    --non-interactive 2>/dev/null; then
    echo -e "${GREEN}✅ SSL certificate obtained${NC}\n"
else
    echo -e "${YELLOW}Trying standalone method...${NC}"
    if certbot certonly --standalone \
        -d leads.naeemmia.bd \
        -d www.leads.naeemmia.bd \
        --email admin@naeemmia.bd \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --pre-hook "systemctl stop nginx" \
        --post-hook "systemctl start nginx"; then
        echo -e "${GREEN}✅ SSL certificate obtained${NC}\n"
    else
        echo -e "${YELLOW}⚠️  SSL certificate failed - you can obtain it manually later${NC}\n"
    fi
fi

# ============================================================================
# STOP OLD LEAD SAAS CONTAINERS
# ============================================================================
echo -e "${YELLOW}[6/9] Stopping old Lead SaaS containers...${NC}"
docker stop flowgen-backend flowgen-frontend flowgen-redis 2>/dev/null || echo "No old containers"
docker rm flowgen-backend flowgen-frontend flowgen-redis 2>/dev/null || echo "No old containers"
echo -e "${GREEN}✅ Old containers cleaned${NC}\n"

# ============================================================================
# BUILD AND START DOCKER CONTAINERS
# ============================================================================
echo -e "${YELLOW}[7/9] Building Docker images...${NC}"
docker-compose -f docker-compose.production.yml build
echo -e "${GREEN}✅ Docker images built${NC}\n"

echo -e "${YELLOW}[8/9] Starting Docker containers...${NC}"
docker-compose -f docker-compose.production.yml up -d
echo -e "${GREEN}✅ Docker containers started${NC}\n"

echo -e "${YELLOW}Waiting for services to initialize (20 seconds)...${NC}"
sleep 20

# ============================================================================
# HEALTH VERIFICATION
# ============================================================================
echo -e "${YELLOW}[9/9] Verifying system health...${NC}"

RUNNING=0
if docker ps | grep -q "flowgen-backend"; then
    echo -e "${GREEN}✅ Backend container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Backend container failed${NC}"
    docker logs flowgen-backend | tail -10
fi

if docker ps | grep -q "flowgen-frontend"; then
    echo -e "${GREEN}✅ Frontend container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Frontend container failed${NC}"
    docker logs flowgen-frontend | tail -10
fi

if docker ps | grep -q "flowgen-redis"; then
    echo -e "${GREEN}✅ Redis container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Redis container failed${NC}"
    docker logs flowgen-redis | tail -10
fi

# Test health endpoints
echo ""
BACKEND_HEALTH=$(curl -s http://localhost:3001/health || echo "failed")
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend API healthy: $BACKEND_HEALTH${NC}"
else
    echo -e "${RED}❌ Backend API unhealthy: $BACKEND_HEALTH${NC}"
fi

FRONTEND_TEST=$(curl -s http://localhost:3000/ | head -n 1 || echo "failed")
if [ -n "$FRONTEND_TEST" ]; then
    echo -e "${GREEN}✅ Frontend serving content${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
fi

# Reload Nginx
echo ""
systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}============================================================================${NC}\n"

echo -e "${YELLOW}Containers Running: $RUNNING/3${NC}\n"

echo -e "${YELLOW}Your Lead Generation SaaS is now live at:${NC}"
echo -e "  ${GREEN}https://leads.naeemmia.bd${NC}"
echo -e "  ${GREEN}https://leads.naeemmia.bd/health${NC}\n"

echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View logs: ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml logs -f${NC}"
echo -e "  Restart:   ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml restart${NC}"
echo -e "  Stop all:  ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml stop${NC}\n"

echo -e "${GREEN}🎉 Click the link above to test your application!${NC}"
echo -e "${BLUE}============================================================================${NC}"
