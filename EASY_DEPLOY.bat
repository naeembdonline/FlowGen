@echo off
REM ============================================================================
REM LEAD GENERATION SAAS - FULLY AUTOMATED DIRECT UPLOAD DEPLOYMENT
REM Domain: leads.naeemmia.bd
REM No Git dependencies - direct local upload to server
REM ============================================================================

echo ============================================================================
echo   LEAD GENERATION SAAS - AUTOMATED DEPLOYMENT
echo ============================================================================
echo.
echo This will deploy your local code directly to the server.
echo.
echo Server: 72.60.234.138
echo Domain: leads.naeemmia.bd
echo.

REM ============================================================================
REM CONFIGURATION
REM ============================================================================
set SERVER=root@72.60.234.138
set PROJECT_DIR=F:\Parsa\Lead Saas
set TEMP_DIR=%TEMP%\lead-saas-deploy
set ZIP_FILE=%TEMP_DIR%\lead-saas-upload.zip
set REMOTE_DIR=/root/lead-saas

echo ============================================================================
echo   STEP 1: PREPARING LOCAL FILES
echo ============================================================================

echo.
echo Creating temporary deployment directory...
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

echo.
echo Creating clean project structure...
mkdir %TEMP_DIR%\lead-saas
mkdir %TEMP_DIR%\lead-saas\backend
mkdir %TEMP_DIR%\lead-saas\frontend

echo.
echo Copying backend files (excluding node_modules)...
xcopy "%PROJECT_DIR%\backend" "%TEMP_DIR%\lead-saas\backend\" /E /I /Y /Q /EXCLUDE:%PROJECT_DIR%\.gitignore > nul 2>&1
if exist "%TEMP_DIR%\lead-saas\backend\node_modules" rmdir /s /q "%TEMP_DIR%\lead-saas\backend\node_modules"

echo.
echo Copying frontend files (excluding node_modules)...
xcopy "%PROJECT_DIR%\frontend" "%TEMP_DIR%\lead-saas\frontend\" /E /I /Y /Q /EXCLUDE:%PROJECT_DIR%\.gitignore > nul 2>&1
if exist "%TEMP_DIR%\lead-saas\frontend\node_modules" rmdir /s /q "%TEMP_DIR%\lead-saas\frontend\node_modules"

echo.
echo Copying configuration files...
copy "%PROJECT_DIR%\docker-compose.production.yml" "%TEMP_DIR%\lead-saas\" /Y > nul
copy "%PROJECT_DIR%\nginx.conf" "%TEMP_DIR%\lead-saas\" /Y > nul
copy "%PROJECT_DIR%\backend\.env" "%TEMP_DIR%\lead-saas\backend\" /Y > nul 2>&1

echo.
echo Creating server deployment script...
copy "%PROJECT_DIR%\deploy-to-server-updated.sh" "%TEMP_DIR%\lead-saas\deploy.sh" /Y > nul 2>&1

echo ✅ Local files prepared successfully
echo.

echo ============================================================================
echo   STEP 2: CREATING DEPLOYMENT PACKAGE
echo ============================================================================

echo.
echo Creating compressed archive...
echo.

REM Use PowerShell to create zip file
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\lead-saas\*' -DestinationPath '%ZIP_FILE%' -Force"

if errorlevel 1 (
    echo ❌ Failed to create deployment package
    pause
    exit /b 1
)

echo ✅ Deployment package created: %ZIP_FILE%
echo.

echo ============================================================================
echo   STEP 3: TESTING SERVER CONNECTION
echo ============================================================================

echo.
echo Testing SSH connection to %SERVER%...
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null %SERVER% "echo '✅ Server connection successful'" 2>nul

if errorlevel 1 (
    echo.
    echo ❌ Failed to connect to server!
    echo.
    echo Please check:
    echo 1. Server IP is correct: 72.60.234.138
    echo 2. SSH service is running on server
    echo 3. You have the correct password/SSH keys
    echo.
    pause
    exit /b 1
)

echo ✅ Server connection verified
echo.

echo ============================================================================
echo   STEP 4: UPLOADING TO SERVER
echo ============================================================================

echo.
echo Uploading deployment package...
echo This may take a few minutes depending on your connection speed...
echo.

scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "%ZIP_FILE%" %SERVER%:/tmp/lead-saas-upload.zip

if errorlevel 1 (
    echo.
    echo ❌ Upload failed!
    echo.
    echo Troubleshooting:
    echo 1. Check your internet connection
    echo 2. Verify server is accessible
    echo 3. Ensure you have SSH access
    echo.
    pause
    exit /b 1
)

echo ✅ Upload completed successfully
echo.

echo ============================================================================
echo   STEP 5: DEPLOYING ON SERVER
echo ============================================================================

echo.
echo Starting automated deployment on server...
echo This will take 10-15 minutes...
echo.

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null %SERVER% bash -s << 'ENDSSH'
set -e

echo "============================================================================"
echo "  SERVER-SIDE DEPLOYMENT - leads.naeemmia.bd"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/8] Extracting deployment package...${NC}"
cd /tmp
rm -rf /tmp/lead-saas
unzip -q lead-saas-upload.zip -d /tmp/lead-saas
echo -e "${GREEN}✅ Package extracted${NC}"

echo -e "${YELLOW}[2/8] Installing system dependencies...${NC}"
apt update > /dev/null 2>&1
apt install -y curl wget git nginx certbot python3-certbot-nginx docker.io docker-compose > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${YELLOW}[3/8] Creating project directory...${NC}"
rm -rf /root/lead-saas
mkdir -p /root/lead-saas
cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/
cd /root/lead-saas
echo -e "${GREEN}✅ Project directory created${NC}"

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

echo -e "${YELLOW}[6/8] Stopping old containers...${NC}"
docker stop flowgen-backend flowgen-frontend flowgen-redis > /dev/null 2>&1 || echo "No old containers"
docker rm flowgen-backend flowgen-frontend flowgen-redis > /dev/null 2>&1 || echo "No old containers"
echo -e "${GREEN}✅ Old containers stopped${NC}"

echo -e "${YELLOW}[7/8] Building and starting Docker containers...${NC}"
docker-compose -f docker-compose.production.yml build --no-cache > /dev/null 2>&1
docker-compose -f docker-compose.production.yml up -d
echo -e "${GREEN}✅ Docker containers started${NC}"

echo -e "${YELLOW}Waiting for containers to initialize (25 seconds)...${NC}"
sleep 25

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
ENDSSH

if errorlevel 1 (
    echo.
    echo ❌ Deployment failed on server!
    echo.
    echo You can SSH into the server to troubleshoot:
    echo ssh root@72.60.234.138
    echo.
    echo Check logs:
    echo docker logs flowgen-backend
    echo docker logs flowgen-frontend
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   CLEANUP
echo ============================================================================

echo.
echo Cleaning up local temporary files...
rmdir /s /q %TEMP_DIR%

echo ✅ Local cleanup complete
echo.

echo ============================================================================
echo   🎉 DEPLOYMENT COMPLETE!
echo ============================================================================
echo.

echo Your application should now be live at:
echo   https://leads.naeemmia.bd
echo   https://leads.naeemmia.bd/health
echo.

echo Press any key to open your application in browser...
pause > nul

start https://leads.naeemmia.bd
start https://leads.naeemmia.bd/health

echo.
echo Check your browser - your application should be loading!
echo.
pause