# 📦 **PRODUCTION DEPLOYMENT PACKAGE**
## Fikerflow Lead Generation SaaS - Complete Docker Deployment

This directory contains everything you need to deploy your Lead Generation SaaS to a Linux production server using Docker and Nginx.

---

## 📁 **DEPLOYMENT FILES OVERVIEW**

### Core Documentation
1. **PRODUCTION_DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide with step-by-step instructions
2. **DEPLOYMENT_QUICK_REFERENCE.md** - Quick reference card for common operations
3. **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist to ensure nothing is missed
4. **DEPLOYMENT_README.md** - This file - overview of deployment package

### Configuration Files
1. **docker-compose.production.yml** - Production Docker Compose configuration
2. **nginx.conf** - Nginx reverse proxy configuration for leads.fikerflow.com
3. **backend/Dockerfile** - Production Docker image with Puppeteer support
4. **backend/.env.production.template** - Environment variables template

### Scripts & Tools
1. **deployment-verify.sh** - Automated deployment verification script
2. **backend/test-env.js** - Environment variable testing script
3. **backend/critical-startup-check.js** - Startup validation script

---

## 🚀 **QUICK START DEPLOYMENT**

### For First-Time Deployment (30-60 minutes):

```bash
# 1. Update server packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Deploy application files
cd ~
# Upload your project files here

# 4. Configure environment
cp backend/.env.production.template backend/.env
nano backend/.env  # Fill in your credentials

# 5. Obtain SSL certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone \
  -d leads.fikerflow.com \
  --email your-email@example.com \
  --agree-tos

# 6. Setup SSL links
sudo mkdir -p /etc/nginx/ssl
sudo ln -s /etc/letsencrypt/live/leads.fikerflow.com/fullchain.pem /etc/nginx/ssl/fullchain.pem
sudo ln -s /etc/letsencrypt/live/leads.fikerflow.com/privkey.pem /etc/nginx/ssl/privkey.pem

# 7. Start Docker services
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# 8. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/fikerflow-leads
sudo ln -s /etc/nginx/sites-available/fikerflow-leads /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 9. Verify deployment
bash deployment-verify.sh
```

---

## 📋 **DEPLOYMENT WORKFLOW**

### Step 1: Pre-Deployment (15 minutes)
- ✅ Review PRODUCTION_DEPLOYMENT_GUIDE.md
- ✅ Gather all required API keys and credentials
- ✅ Ensure domain points to server IP
- ✅ Verify server meets requirements

### Step 2: Server Setup (15 minutes)
- ✅ Install system dependencies
- ✅ Install Docker and Docker Compose
- ✅ Configure firewall rules
- ✅ Setup deployment user

### Step 3: Application Deployment (20 minutes)
- ✅ Upload project files to server
- ✅ Configure environment variables
- ✅ Obtain SSL certificates
- ✅ Build and start Docker containers

### Step 4: Verification (10 minutes)
- ✅ Run deployment-verify.sh
- ✅ Test health endpoints
- ✅ Verify external access
- ✅ Check monitoring setup

### Step 5: Post-Deployment (Ongoing)
- ✅ Setup automatic backups
- ✅ Configure monitoring alerts
- ✅ Document access credentials
- ✅ Test disaster recovery

---

## 🔧 **COMMON DEPLOYMENT TASKS**

### Update Application
```bash
cd ~/fikerflow-lead-saas
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### View Logs
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### Backup Data
```bash
~/backup.sh
```

### Check Health
```bash
~/health-check.sh
curl https://leads.fikerflow.com/health
```

---

## 🛡️ **SECURITY CHECKLIST**

### Before Going Live:
- [ ] All API keys are secure and valid
- [ ] JWT_SECRET is strong and unique
- [ ] SSL certificate is valid
- [ ] Firewall is configured correctly
- [ ] Environment files have proper permissions (600)
- [ ] Fail2Ban is running
- [ ] Only necessary ports are open
- [ ] Database credentials are secure
- [ ] No sensitive data in logs
- [ ] Backup system is configured

### Regular Maintenance:
- [ ] Update SSL certificates before expiration
- [ ] Rotate secrets and API keys periodically
- [ ] Review and update firewall rules
- [ ] Monitor system logs for suspicious activity
- [ ] Keep Docker images updated
- [ ] Test backup restoration
- [ ] Review user access and permissions

---

## 📊 **MONITORING & ALERTS**

### Key Metrics to Monitor:
- **Uptime:** All containers should show "Up" status
- **Health:** `/health` endpoint should return `{"status":"ok"}`
- **Performance:** API response time < 500ms
- **Resources:** CPU < 80%, Memory < 80%, Disk < 80%
- **Errors:** No critical errors in logs
- **SSL:** Certificate should be valid

### Monitoring Commands:
```bash
# Container status
docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats

# System resources
free -h
df -h
htop

# Recent errors
docker logs flowgen-backend --since 1h | grep -i error
```

---

## 🚨 **TROUBLESHOOTING**

### Common Issues:

**Containers Not Starting:**
```bash
docker-compose -f docker-compose.production.yml logs
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

**Nginx 502 Bad Gateway:**
```bash
# Check if backend is running
docker ps | grep backend

# Test backend directly
curl http://localhost:3001/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx
```

**Database Connection Issues:**
```bash
# Check environment variables
cat backend/.env | grep SUPABASE

# Test connection from container
docker exec flowgen-backend node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('tenants').select('*').limit(1).then(console.log);
"
```

**SSL Certificate Issues:**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx

# Check certificate expiration
sudo certbot certificates
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### Container Resources:
- **Backend:** 512MB-1GB RAM
- **Frontend:** 256MB-512MB RAM  
- **Redis:** 128MB-256MB RAM

### Optimization Tips:
1. Enable Docker log rotation
2. Setup automated cleanup of old images
3. Use Redis for caching (not in-memory)
4. Monitor container resource usage
5. Scale horizontally if needed

---

## 📞 **SUPPORT & DOCUMENTATION**

### Documentation Files:
- **PRODUCTION_DEPLOYMENT_GUIDE.md** - Detailed deployment instructions
- **DEPLOYMENT_QUICK_REFERENCE.md** - Quick command reference
- **DEPLOYMENT_CHECKLIST.md** - Complete deployment checklist

### Additional Resources:
- **ENV_DEBUG_GUIDE.md** - Environment variable troubleshooting
- **backend/README.md** - Backend specific documentation
- **frontend/README.md** - Frontend specific documentation

### When You Need Help:
1. Check the troubleshooting section in PRODUCTION_DEPLOYMENT_GUIDE.md
2. Review logs: `docker-compose -f docker-compose.production.yml logs`
3. Run verification: `bash deployment-verify.sh`
4. Check system status: `~/health-check.sh`

---

## ✅ **DEPLOYMENT VERIFICATION**

### Final Checklist:
- [ ] All Docker containers running
- [ ] Health endpoints returning success
- [ ] HTTPS working with valid SSL
- [ ] Frontend accessible via domain
- [ ] API calls working correctly
- [ ] Database connectivity confirmed
- [ ] No critical errors in logs
- [ ] Monitoring setup complete
- [ ] Backup system configured
- [ ] Security measures in place

### Run Automated Verification:
```bash
bash deployment-verify.sh
```

Expected output: All checks should show ✅ PASS

---

## 🎯 **SUCCESS CRITERIA**

Your deployment is successful when:
- ✅ Application accessible at https://leads.fikerflow.com
- ✅ Health dashboard shows all systems operational
- ✅ User can register and login
- ✅ Database operations working correctly
- ✅ No errors in browser console
- ✅ No critical errors in server logs
- ✅ SSL certificate valid and HTTPS working
- ✅ Automated backups configured
- ✅ Monitoring and alerts active

---

## 🎉 **POST-DEPLOYMENT NEXT STEPS**

1. **Test Core Functionality:**
   - User registration and authentication
   - Lead scraping from Google Maps
   - AI message generation
   - Campaign creation and management

2. **Configure Additional Services:**
   - WhatsApp integration (Evolution API)
   - Email marketing (Brevo)
   - Payment processing (Stripe)

3. **Setup Monitoring:**
   - Application performance monitoring
   - Error tracking and alerting
   - User analytics and metrics

4. **Documentation:**
   - Create user documentation
   - Setup admin guides
   - Document custom configurations

---

**🎉 Congratulations! You're ready to deploy your Fikerflow Lead Generation SaaS to production!**

**For detailed instructions, refer to PRODUCTION_DEPLOYMENT_GUIDE.md**
**For quick commands, refer to DEPLOYMENT_QUICK_REFERENCE.md**
**For step-by-step process, use DEPLOYMENT_CHECKLIST.md**

**Last Updated:** 2024-01-16
**Deployment Package Version:** 1.0