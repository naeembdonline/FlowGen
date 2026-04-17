#!/bin/bash

# ============================================================================
# LEAD GENERATION SAAS - SERVER DEPLOYMENT SCRIPT
# Domain: leads.naeemmia.bd
# This script is uploaded automatically by EASY_DEPLOY.bat
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "  SERVER DEPLOYMENT - leads.naeemmia.bd"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: EXTRACT DEPLOYMENT PACKAGE
# ============================================================================
echo -e "${YELLOW}[1/8] Extracting deployment package...${NC}"
cd /tmp
rm -rf /tmp/lead-saas
unzip -q lead-saas-upload.zip -d /tmp/lead-saas
echo -e "${GREEN}✅ Package extracted${NC}"

# ============================================================================
# STEP 2: INSTALL SYSTEM DEPENDENCIES
# ============================================================================
echo -e "${YELLOW}[2/8] Installing system dependencies...${NC}"
apt update > /dev/null 2>&1
apt install -y curl wget git nginx certbot python3-certbot-nginx docker.io docker-compose > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies installed${NC}"

# ============================================================================
# STEP 3: CREATE PROJECT DIRECTORY
# ============================================================================
echo -e "${YELLOW}[3/8] Creating project directory...${NC}"
rm -rf /root/lead-saas
mkdir -p /root/lead-saas
cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/
cd /root/lead-saas
echo -e "${GREEN}✅ Project directory created${NC}"

# ============================================================================
# STEP 4: CREATE NGINX CONFIGURATION
# ============================================================================
echo -e "${YELLOW}[4/8] Creating Nginx configuration...${NC}"

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
nginx -t > /dev/null 2>&1
echo -e "${GREEN}✅ Nginx configuration created${NC}"

# ============================================================================
# STEP 5: OBTAIN SSL CERTIFICATE
# ============================================================================
echo -e "${YELLOW}[5/8] Obtaining SSL certificate...${NC}"

if certbot certonly --webroot -w /var/www/html \
    -d leads.naeemmia.bd \
    -d www.leads.naeemmia.bd \
    --email admin@naeemmia.bd \
    --agree-tos \
    --no-eff-email \
    --non-interactive > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SSL certificate obtained${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate failed - trying standalone method...${NC}"
    systemctl stop nginx > /dev/null 2>&1
    if certbot certonly --standalone \
        -d leads.naeemmia.bd \
        -d www.leads.naeemmia.bd \
        --email admin@naeemmia.bd \
        --agree-tos \
        --no-eff-email \
        --non-interactive > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSL certificate obtained${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL certificate failed - configure manually${NC}"
    fi
    systemctl start nginx > /dev/null 2>&1
fi

# ============================================================================
# STEP 6: STOP OLD CONTAINERS
# ============================================================================
echo -e "${YELLOW}[6/8] Stopping old containers...${NC}"
docker stop flowgen-backend flowgen-frontend flowgen-redis > /dev/null 2>&1 || echo "No old containers"
docker rm flowgen-backend flowgen-frontend flowgen-redis > /dev/null 2>&1 || echo "No old containers"
echo -e "${GREEN}✅ Old containers stopped${NC}"

# ============================================================================
# STEP 7: BUILD AND START DOCKER CONTAINERS
# ============================================================================
echo -e "${YELLOW}[7/8] Building and starting Docker containers...${NC}"
docker-compose -f docker-compose.production.yml build --no-cache > /dev/null 2>&1
docker-compose -f docker-compose.production.yml up -d
echo -e "${GREEN}✅ Docker containers started${NC}"

echo -e "${YELLOW}Waiting for containers to initialize (25 seconds)...${NC}"
sleep 25

# ============================================================================
# STEP 8: VERIFY DEPLOYMENT
# ============================================================================
echo -e "${YELLOW}[8/8] Verifying deployment...${NC}"

RUNNING=0
if docker ps | grep -q "flowgen-backend"; then
    echo -e "${GREEN}✅ Backend container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Backend container failed${NC}"
fi

if docker ps | grep -q "flowgen-frontend"; then
    echo -e "${GREEN}✅ Frontend container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Frontend container failed${NC}"
fi

if docker ps | grep -q "flowgen-redis"; then
    echo -e "${GREEN}✅ Redis container running${NC}"
    ((RUNNING++))
else
    echo -e "${RED}❌ Redis container failed${NC}"
fi

# Test health endpoints
BACKEND_HEALTH=$(curl -s http://localhost:3001/health || echo "failed")
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend API healthy${NC}"
else
    echo -e "${RED}❌ Backend API unhealthy${NC}"
fi

systemctl reload nginx > /dev/null 2>&1
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# Cleanup
rm -f /tmp/lead-saas-upload.zip
rm -rf /tmp/lead-saas

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Containers Running: $RUNNING/3${NC}"
echo ""
echo -e "${YELLOW}Your Lead Generation SaaS is now live at:${NC}"
echo -e "  ${GREEN}https://leads.naeemmia.bd${NC}"
echo -e "  ${GREEN}https://leads.naeemmia.bd/health${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View logs: ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml logs -f${NC}"
echo -e "  Restart:   ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml restart${NC}"
echo -e "  Stop all:  ${BLUE}docker-compose -f /root/lead-saas/docker-compose.production.yml stop${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}============================================================================${NC}"