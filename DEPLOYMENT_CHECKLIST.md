# ✅ **DEPLOYMENT CHECKLIST - STEP-BY-STEP**
## Fikerflow Lead SaaS Production Deployment

**Use this checklist during deployment to ensure nothing is missed**

---

## 📋 **PRE-DEPLOYMENT PREPARATION**

### Server Requirements
- [ ] Ubuntu Server 20.04+ or 22.04 LTS ready
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] 20GB free disk space
- [ ] Root or sudo access available
- [ ] Domain (leads.fikerflow.com) pointing to server IP

### External Accounts Setup
- [ ] **Supabase Account Created**
  - [ ] Project created at https://supabase.com
  - [ ] Database schema imported
  - [ ] SUPABASE_URL copied
  - [ ] SUPABASE_ANON_KEY copied
  - [ ] SUPABASE_SERVICE_ROLE_KEY copied

- [ ] **AI Services Configured**
  - [ ] Z.ai account created
  - [ ] Z_AI_API_KEY generated
  - [ ] OpenAI account created (optional)
  - [ ] OPENAI_API_KEY generated (optional)

### Security Preparation
- [ ] SSH keys generated
- [ ] Firewall rules planned
- [ ] SSL certificate domain verified
- [ ] Strong passwords generated (JWT_SECRET)

---

## 🔧 **SERVER INITIALIZATION**

### 1. Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git ufw fail2ban htop
```

- [ ] System updated successfully
- [ ] Essential tools installed

### 2. User Management
```bash
# Create deployment user
sudo useradd -m -s /bin/bash deployer
sudo usermod -aG docker deployer
sudo passwd deployer
```

- [ ] Deployment user created
- [ ] User added to docker group

### 3. Firewall Configuration
```bash
# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

- [ ] Firewall enabled
- [ ] Essential ports opened
- [ ] Firewall status confirmed active

---

## 🐳 **DOCKER INSTALLATION**

### 4. Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
```

- [ ] Docker installed successfully
- [ ] User added to docker group
- [ ] Docker version verified (`docker --version`)

### 5. Install Docker Compose
```bash
# Docker Compose should be included
docker-compose --version

# If not present, install manually
sudo apt install docker-compose -y
```

- [ ] Docker Compose installed
- [ ] Version verified

---

## 📁 **PROJECT DEPLOYMENT**

### 6. Deploy Application Files
```bash
# Clone repository or upload files
cd ~
git clone <your-repo-url> fikerflow-lead-saas
cd fikerflow-lead-saas

# Or upload via SCP
# scp -r /local/path deployer@server-ip:~/fikerflow-lead-saas
```

- [ ] Project files uploaded
- [ ] Directory structure verified
- [ ] Docker compose file exists

### 7. Configure Environment Variables
```bash
# Copy environment template
cp backend/.env.production.template backend/.env

# Edit with your values
nano backend/.env
```

Required variables to configure:
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] Z_AI_API_KEY
- [ ] OPENAI_API_KEY
- [ ] JWT_SECRET (generate with: `openssl rand -base64 32`)
- [ ] REDIS_HOST=redis
- [ ] REDIS_PORT=6379
- [ ] FRONTEND_URL=https://leads.fikerflow.com

```bash
# Secure the file
chmod 600 backend/.env
```

- [ ] All required variables set
- [ ] File permissions set to 600
- [ ] Environment variables tested with `node test-env.js`

---

## 🔐 **SSL CERTIFICATE SETUP**

### 8. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

- [ ] Certbot installed

### 9. Obtain SSL Certificate
```bash
# Stop Nginx if running
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d leads.fikerflow.com \
  -d www.leads.fikerflow.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

- [ ] SSL certificate obtained
- [ ] Certificate files exist in `/etc/letsencrypt/live/leads.fikerflow.com/`

### 10. Setup SSL Links
```bash
# Create symbolic links
sudo ln -s /etc/letsencrypt/live/leads.fikerflow.com/fullchain.pem /etc/nginx/ssl/fullchain.pem
sudo ln -s /etc/letsencrypt/live/leads.fikerflow.com/privkey.pem /etc/nginx/ssl/privkey.pem
```

- [ ] Symbolic links created
- [ ] Links verified

---

## 🐋 **DOCKER DEPLOYMENT**

### 11. Build Docker Images
```bash
cd ~/fikerflow-lead-saas
docker-compose -f docker-compose.production.yml build
```

- [ ] Backend image built successfully
- [ ] Frontend image built successfully
- [ ] No build errors

### 12. Start Docker Services
```bash
docker-compose -f docker-compose.production.yml up -d
```

- [ ] Containers started
- [ ] All services show "Up" status in `docker ps`

### 13. Verify Container Health
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Check container logs
docker-compose -f docker-compose.production.yml logs
```

- [ ] Backend container running
- [ ] Frontend container running
- [ ] Redis container running
- [ ] No critical errors in logs

---

## 🌐 **NGINX CONFIGURATION**

### 14. Configure Nginx
```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/fikerflow-leads

# Enable site
sudo ln -s /etc/nginx/sites-available/fikerflow-leads /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

- [ ] Nginx configuration copied
- [ ] Site enabled
- [ ] Configuration test passed

### 15. Start Nginx
```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

- [ ] Nginx started successfully
- [ ] Nginx status is active

---

## ✅ **VERIFICATION TESTING**

### 16. Run Health Checks
```bash
# Test backend health
curl http://localhost:3001/health

# Test via Nginx
curl http://localhost/health

# Test external access
curl https://leads.fikerflow.com/health
```

Expected response: `{"status":"ok","database":"configured","cache":"redis"}`

- [ ] Backend health endpoint responding
- [ ] Database configured
- [ ] Cache system active
- [ ] Nginx reverse proxy working
- [ ] External HTTPS access working

### 17. Run Verification Script
```bash
chmod +x deployment-verify.sh
bash deployment-verify.sh
```

- [ ] Verification script executed
- [ ] All critical checks passed
- [ ] No critical failures

### 18. Test Frontend Access
```bash
# Test frontend
curl https://leads.fikerflow.com/

# Open in browser
# Navigate to: https://leads.fikerflow.com
```

- [ ] Frontend loads in browser
- [ ] No console errors
- [ ] Assets loading correctly

---

## 🛡️ **SECURITY HARDENING**

### 19. Configure Fail2Ban
```bash
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

- [ ] Fail2Ban configured
- [ ] Fail2Ban running

### 20. Setup Automatic Backups
```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup Redis
docker run --rm \
  -v fikerflow-lead-saas_redis-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/redis-$DATE.tar.gz /data

# Keep last 7 days
find $BACKUP_DIR -name "redis-*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup.sh

# Add to crontab
echo "0 2 * * * $HOME/backup.sh >> $HOME/backup.log 2>&1" | crontab -
```

- [ ] Backup script created
- [ ] Cron job configured
- [ ] Backup tested manually

---

## 📊 **MONITORING SETUP**

### 21. Setup Health Monitoring
```bash
# Create health check script
cat > ~/health-check.sh << 'EOF'
#!/bin/bash
echo "=== Fikerflow Health Check ==="
docker-compose -f ~/fikerflow-lead-saas/docker-compose.production.yml ps
curl -s http://localhost:3001/health | jq '.'
EOF

chmod +x ~/health-check.sh

# Add to crontab (every 5 minutes)
echo "*/5 * * * * $HOME/health-check.sh >> $HOME/health-check.log 2>&1" | crontab -
```

- [ ] Health monitoring script created
- [ ] Periodic checks configured

### 22. Configure Log Rotation
```bash
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
```

- [ ] Log rotation configured

---

## 🎯 **FINAL ACCEPTANCE TESTING**

### 23. Complete System Test
- [ ] Frontend accessible via HTTPS
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads correctly
- [ ] API calls successful
- [ ] Database operations working
- [ ] Redis caching functional
- [ ] No errors in browser console
- [ ] No errors in server logs

### 24. Performance Verification
- [ ] Page load time acceptable (<3 seconds)
- [ ] API response time acceptable (<500ms)
- [ ] No memory leaks detected
- [ ] CPU usage normal
- [ ] Disk space adequate

### 25. Security Verification
- [ ] HTTPS working correctly
- [ ] SSL certificate valid
- [ ] Firewall active
- [ ] Only necessary ports open
- [ ] Environment files secured
- [ ] No sensitive data in logs

---

## 📝 **POST-DEPLOYMENT DOCUMENTATION**

### 26. Documentation
- [ ] Deployment documentation updated
- [ ] Admin credentials documented
- [ ] Backup procedures documented
- [ ] Recovery procedures documented
- [ ] Support contact info available

### 27. Handover Preparation
- [ ] Admin credentials transferred
- [ ] Access instructions provided
- [ ] Troubleshooting guide shared
- [ ] Monitoring dashboards set up
- [ ] Alert notifications configured

---

## 🚨 **ROLLBACK PLAN**

### If Deployment Fails:
1. **Stop Services:** `docker-compose -f docker-compose.production.yml down`
2. **Check Logs:** `docker-compose -f docker-compose.production.yml logs`
3. **Verify Config:** Check all environment variables
4. **Rebuild:** `docker-compose -f docker-compose.production.yml build --no-cache`
5. **Restart:** `docker-compose -f docker-compose.production.yml up -d`

### Previous Version Recovery:
```bash
# Stop current version
docker-compose -f docker-compose.production.yml down

# Checkout previous version
git checkout PREVIOUS_TAG

# Restart
docker-compose -f docker-compose.production.yml up -d
```

---

## ✅ **DEPLOYMENT COMPLETE**

**When all checklist items are complete:**
- ✅ Your Fikerflow Lead SaaS is production-ready
- ✅ All services are running and healthy
- ✅ Security measures are in place
- ✅ Monitoring and backup systems active
- ✅ System is accessible via HTTPS

**🎉 CONGRATULATIONS! Your production deployment is complete!**

---

## 📞 **SUPPORT CONTACTS**

Keep these handy for post-deployment support:
- System Administrator: _______________
- Database Administrator: _______________
- Network Administrator: _______________
- Emergency Contact: _______________

**Last Updated:** 2024-01-16
**Deployment Version:** _______________