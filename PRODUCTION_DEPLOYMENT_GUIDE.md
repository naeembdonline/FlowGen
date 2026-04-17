# 🚀 **PRODUCTION DEPLOYMENT GUIDE - LINUX SERVER**
## Fikerflow Lead Generation SaaS - Docker Deployment

**Target Environment:** Ubuntu Server (20.04+ / 22.04 LTS)
**Domain:** leads.naeemmia.bd
**Architecture:** Docker Compose with Nginx Reverse Proxy

---

## 📋 **DEPLOYMENT CHECKLIST**

### Prerequisites
- [ ] Ubuntu Server 20.04+ with SSH access
- [ ] Domain name (leads.naeemmia.bd) pointing to server IP
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] 20GB free disk space
- [ ] Root or sudo access
- [ ] Supabase project credentials
- [ ] Z.ai API key
- [ ] OpenAI API key (optional)

### Before You Start
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git ufw fail2ban

# Check server resources
free -h
df -h
nproc
```

---

## 🌐 **SERVER SETUP & SECURITY**

### 1. Configure Firewall
```bash
# Allow essential ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Frontend (direct access - optional)
sudo ufw allow 3001/tcp  # Backend (direct access - optional)

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Create Deployment User
```bash
# Create dedicated user for deployment
sudo useradd -m -s /bin/bash deployer
sudo usermod -aG docker deployer

# Set password
sudo passwd deployer

# Switch to deployer user
su - deployer
```

### 3. Set Up SSH Keys (Recommended)
```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "deployer@fikerflow"

# Copy public key to server
ssh-copy-id deployer@your-server-ip

# Test SSH login
ssh deployer@your-server-ip
```

---

## 🐳 **DOCKER INSTALLATION**

### Install Docker & Docker Compose
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version

# Enable Docker on boot
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 📁 **PROJECT DEPLOYMENT**

### 1. Clone Repository
```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your repo URL)
git clone https://github.com/your-username/fikerflow-lead-saas.git
cd fikerflow-lead-saas

# Or copy files using SCP (from your local machine)
# scp -r "F:\Parsa\Lead Saas" deployer@your-server-ip:~/fikerflow-lead-saas
```

### 2. Create Production Environment File
```bash
# Create production .env file in backend directory
cat > backend/.env << 'EOF'
# ============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================================================

# SUPABASE CONFIGURATION
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI API KEYS
Z_AI_API_KEY=your-z-ai-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# JWT SECRET (use strong random string)
JWT_SECRET=$(openssl rand -base64 32)

# REDIS CONFIGURATION
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# FRONTEND URL
FRONTEND_URL=https://leads.naeemmia.bd

# APPLICATION SETTINGS
NODE_ENV=production
PORT=3001
USE_IN_MEMORY_CACHE=false
EOF

# Secure the file
chmod 600 backend/.env
```

### 3. Verify Environment Configuration
```bash
# Check if .env file exists and is properly formatted
cat backend/.env

# Test environment loading (from backend directory)
cd backend
node -e "
require('dotenv').config();
console.log('✅ SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('✅ SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('✅ Z_AI_API_KEY exists:', !!process.env.Z_AI_API_KEY);
"
```

---

## 🔐 **SSL CERTIFICATE SETUP (LET'S ENCRYPT)**

### 1. Install Certbot
```bash
# Install Certbot for Nginx
sudo apt install certbot python3-certbot-nginx -y

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl
```

### 2. Obtain SSL Certificate
```bash
# Stop Nginx if running
sudo systemctl stop nginx

# Obtain certificate (standalone mode)
sudo certbot certonly --standalone \
  -d leads.naeemmia.bd \
  -d www.leads.naeemmia.bd \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Verify certificate files
sudo ls -la /etc/letsencrypt/live/leads.naeemmia.bd/
```

### 3. Setup Certificate Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Setup automatic renewal (cron job)
echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'docker restart nginx'" | sudo tee -a /etc/crontab
```

### 4. Create Symbolic Links for Nginx
```bash
# Create symlinks for easy access
sudo ln -s /etc/letsencrypt/live/leads.naeemmia.bd/fullchain.pem /etc/nginx/ssl/fullchain.pem
sudo ln -s /etc/letsencrypt/live/leads.naeemmia.bd/privkey.pem /etc/nginx/ssl/privkey.pem

# Verify links
ls -la /etc/nginx/ssl/
```

---

## 🐋 **DOCKER DEPLOYMENT**

### 1. Build and Start Services
```bash
# Navigate to project directory
cd ~/fikerflow-lead-saas

# Build Docker images
docker-compose -f docker-compose.production.yml build

# Start services (detached mode)
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps
```

### 2. Verify Service Health
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Check individual services
docker logs flowgen-backend
docker logs flowgen-frontend
docker logs flowgen-redis

# Test backend health
curl http://localhost:3001/health

# Expected output:
# {"status":"ok","database":"configured","cache":"redis"}
```

### 3. Verify Container Connections
```bash
# Check network connectivity
docker network inspect fikerflow-lead-saas_flowgen-network

# Test backend to frontend connectivity
docker exec flowgen-backend ping -c 3 frontend

# Test Redis connectivity
docker exec flowgen-backend redis-cli -h redis ping
# Expected output: PONG
```

---

## 🌐 **NGINX CONFIGURATION**

### 1. Copy Nginx Configuration
```bash
# Copy nginx.conf to Nginx config directory
sudo cp nginx.conf /etc/nginx/sites-available/fikerflow-leads

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/fikerflow-leads /etc/nginx/sites-enabled/

# Remove default configuration
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

### 2. Update Nginx Configuration for Docker
```bash
# Edit the upstream servers to match Docker container names
sudo nano /etc/nginx/sites-available/fikerflow-leads

# Ensure upstream servers are configured as:
# upstream frontend { server localhost:3000; }
# upstream backend { server localhost:3001; }
```

### 3. Start Nginx
```bash
# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# Test from external
curl https://leads.naeemmia.bd/health
```

---

## 📊 **SERVICE MANAGEMENT**

### Docker Service Commands
```bash
# Start all services
docker-compose -f docker-compose.production.yml start

# Stop all services
docker-compose -f docker-compose.production.yml stop

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart individual service
docker-compose -f docker-compose.production.yml restart backend

# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Stop and remove containers
docker-compose -f docker-compose.production.yml down

# Stop and remove containers with volumes
docker-compose -f docker-compose.production.yml down -v
```

### System Service Management
```bash
# Check Docker service
sudo systemctl status docker

# Check Nginx service
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart docker
sudo systemctl restart nginx
```

---

## 🔍 **HEALTH MONITORING**

### Create Health Check Script
```bash
cat > ~/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Fikerflow Lead SaaS

echo "=== Fikerflow System Health Check ==="
echo ""

# Check Docker services
echo "📊 Docker Services:"
docker-compose -f ~/fikerflow-lead-saas/docker-compose.production.yml ps
echo ""

# Check Backend API
echo "🔧 Backend Health:"
curl -s http://localhost:3001/health | jq '.'
echo ""

# Check Frontend
echo "🌐 Frontend Health:"
curl -s http://localhost:3000/ | head -n 5
echo ""

# Check Redis
echo "📦 Redis Status:"
docker exec flowgen-redis redis-cli ping
echo ""

# Check Nginx
echo "🌍 Nginx Status:"
sudo systemctl is-active nginx
echo ""

# Check Disk Space
echo "💾 Disk Usage:"
df -h | grep -E "Filesystem|/$"
echo ""

# Check Memory
echo "🧠 Memory Usage:"
free -h
echo ""
EOF

chmod +x ~/health-check.sh
```

### Run Health Checks
```bash
# Run health check
~/health-check.sh

# Setup periodic health checks (every 5 minutes)
echo "*/5 * * * * $HOME/health-check.sh >> $HOME/health-check.log 2>&1" | crontab -
```

---

## 🛡️ **SECURITY HARDENING**

### 1. Setup Fail2Ban
```bash
# Configure Fail2Ban for SSH
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

# Enable and start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 2. Secure Docker Configuration
```bash
# Limit Docker log size
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

### 3. Setup Automatic Backups
```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm \
  -v fikerflow-lead-saas_redis-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/redis-$DATE.tar.gz /data

# Keep last 7 days
find $BACKUP_DIR -name "redis-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x ~/backup.sh

# Setup daily backup at 2 AM
echo "0 2 * * * $HOME/backup.sh >> $HOME/backup.log 2>&1" | crontab -
```

---

## 🚨 **TROUBLESHOOTING**

### Issue 1: Containers Not Starting
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check disk space
df -h

# Check Docker daemon
sudo systemctl status docker

# Rebuild containers
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### Issue 2: Nginx 502 Bad Gateway
```bash
# Check if backend is running
docker ps | grep backend

# Check backend logs
docker logs flowgen-backend

# Test backend directly
curl http://localhost:3001/health

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Issue 3: SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx

# Check certificate expiration
sudo certbot certificates
```

### Issue 4: Database Connection Issues
```bash
# Check Supabase credentials
cat backend/.env | grep SUPABASE

# Test Supabase connection from backend container
docker exec flowgen-backend node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('tenants').select('*').limit(1).then(console.log);
"

# Check Redis connection
docker exec flowgen-backend redis-cli -h redis ping
```

### Issue 5: High Memory Usage
```bash
# Check container resource usage
docker stats

# Limit container resources (add to docker-compose.production.yml)
# deploy:
#   resources:
#     limits:
#       memory: 512M
#     reservations:
#       memory: 256M

# Restart services
docker-compose -f docker-compose.production.yml restart
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### 1. Enable Docker Cleanup
```bash
# Add cron job to clean up old Docker resources
echo "0 3 * * * docker system prune -af --filter "until=24h" >> /var/log/docker-prune.log 2>&1" | sudo tee -a /etc/crontab
```

### 2. Monitor Performance
```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Real-time monitoring
htop
sudo iotop

# Docker container stats
docker stats --no-stream
```

### 3. Setup Log Rotation
```bash
# Configure logrotate for Docker logs
sudo cat > /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

# Test log rotation
sudo logrotate -f /etc/logrotate.d/docker
```

---

## ✅ **POST-DEPLOYMENT VERIFICATION**

### Final Checklist
```bash
# 1. Check all services are running
docker-compose -f docker-compose.production.yml ps

# 2. Verify health endpoints
curl https://leads.naeemmia.bd/health
curl https://leads.naeemmia.bd/api/v1/health

# 3. Check SSL certificate
curl -Iv https://leads.naeemmia.bd 2>&1 | grep "TLS"

# 4. Test frontend access
curl https://leads.naeemmia.bd/

# 5. Verify database connectivity
docker logs flowgen-backend | grep "Database connected"

# 6. Check firewall rules
sudo ufw status

# 7. Monitor system resources
free -h
df -h
```

### Access Your Application
- **Frontend:** https://leads.naeemmia.bd
- **Backend API:** https://leads.naeemmia.bd/api/v1
- **Health Dashboard:** https://leads.naeemmia.bd/health

---

## 📝 **MAINTENANCE TASKS**

### Daily
- Monitor system logs: `sudo journalctl -xe`
- Check container health: `docker ps`
- Review health checks: `~/health-check.sh`

### Weekly
- Review and rotate logs: `sudo logrotate -f /etc/logrotate.d/*`
- Check disk usage: `df -h`
- Monitor performance: `docker stats`

### Monthly
- Update system packages: `sudo apt update && sudo apt upgrade -y`
- Review and update Docker images
- Test backup restoration
- Review security logs: `sudo fail2ban-client status`

---

## 🎯 **SUCCESS INDICATORS**

✅ **Production Deployment Complete When:**
- All Docker containers show "Up" status
- Health endpoints return `{"status":"ok"}`
- SSL certificate is valid and HTTPS works
- Frontend loads without errors
- Backend API responds correctly
- Database connectivity confirmed
- No critical errors in logs

---

## 📞 **SUPPORT & RESOURCES**

- **Documentation:** Check project README.md
- **Logs:** `/var/log/nginx/`, Docker container logs
- **Health Check:** Run `~/health-check.sh`
- **Backup Location:** `~/backups/`

**🎉 Your Fikerflow Lead Generation SaaS is now production-ready!**

---

**Next Steps:**
1. Configure your Supabase database schema using migration scripts
2. Test user registration and authentication
3. Import initial leads and test campaign creation
4. Setup monitoring and alerting
5. Document your custom configurations

**For issues or questions, refer to troubleshooting section or check logs.**