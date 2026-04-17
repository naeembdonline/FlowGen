# ⚡ **DEPLOYMENT QUICK REFERENCE CARD**
## Fikerflow Lead SaaS - Common Commands

---

## 🚀 **DEPLOYMENT COMMANDS**

### Initial Deployment
```bash
# Clone and setup
git clone <repo-url>
cd fikerflow-lead-saas

# Configure environment
cp backend/.env.example backend/.env
nano backend/.env

# Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Update Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Clean old images
docker image prune -af
```

---

## 📊 **SERVICE MANAGEMENT**

### Docker Services
```bash
# View all services
docker-compose -f docker-compose.production.yml ps

# View logs (all services)
docker-compose -f docker-compose.production.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f redis

# Restart services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend

# Stop services
docker-compose -f docker-compose.production.yml stop

# Start services
docker-compose -f docker-compose.production.yml start
```

### Individual Containers
```bash
# Backend container
docker logs flowgen-backend
docker restart flowgen-backend
docker exec -it flowgen-backend sh

# Frontend container
docker logs flowgen-frontend
docker restart flowgen-frontend
docker exec -it flowgen-frontend sh

# Redis container
docker logs flowgen-redis
docker restart flowgen-redis
docker exec -it flowgen-redis redis-cli
```

---

## 🔍 **HEALTH & MONITORING**

### System Health
```bash
# Quick health check
curl http://localhost:3001/health
curl https://leads.naeemmia.bd/health

# Container stats
docker stats

# Docker system info
docker system df
docker system events

# Service status
docker-compose -f docker-compose.production.yml ps
```

### Log Management
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker logs flowgen-backend --tail 100
docker logs flowgen-frontend --tail 100

# System logs
sudo journalctl -xe -u docker
sudo journalctl -xe -u nginx
```

---

## 🔧 **MAINTENANCE**

### Database Management
```bash
# Access Redis CLI
docker exec -it flowgen-redis redis-cli

# View Redis keys
docker exec flowgen-redis redis-cli KEYS "*"

# Flush Redis cache (careful!)
docker exec flowgen-redis redis-cli FLUSHALL

# Check Redis memory
docker exec flowgen-redis redis-cli INFO memory
```

### SSL Certificate Management
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Restart Nginx after renewal
sudo systemctl restart nginx
```

### Cleanup Operations
```bash
# Clean Docker system
docker system prune -af --filter "until=24h"

# Clean old Docker images
docker image prune -af

# Clean unused volumes
docker volume prune -f

# Clean build cache
docker builder prune -af
```

---

## 🛡️ **TROUBLESHOOTING**

### Connection Issues
```bash
# Test backend directly
curl http://localhost:3001/health

# Test via Nginx
curl https://leads.naeemmia.bd/health

# Check container networking
docker network inspect fikerflow-lead-saas_flowgen-network

# Test DNS resolution
docker exec flowgen-backend ping frontend
docker exec flowgen-backend ping redis
```

### Performance Issues
```bash
# Check resource usage
docker stats --no-stream

# Check disk usage
df -h

# Check memory usage
free -h

# Check process listing
docker exec flowgen-backend ps aux
```

### Service Recovery
```bash
# Full service restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Force rebuild
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Reset to factory (WARNING: deletes data)
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

---

## 📝 **ENVIRONMENT MANAGEMENT**

### View/Update Environment Variables
```bash
# View current .env
cat backend/.env

# Edit .env file
nano backend/.env

# Restart after changes
docker-compose -f docker-compose.production.yml restart backend

# Verify variables loaded
docker exec flowgen-backend printenv | grep SUPABASE
```

---

## 🔐 **SECURITY COMMANDS**

### Firewall Management
```bash
# View firewall status
sudo ufw status

# Add new rule
sudo ufw allow PORT/tcp

# Reload firewall
sudo ufw reload

# Enable firewall
sudo ufw enable
```

### Fail2Ban Management
```bash
# Check Fail2Ban status
sudo fail2ban-client status

# Unban IP
sudo fail2ban-client set sshd unbanip IP_ADDRESS

# Check banned IPs
sudo fail2ban-client get sshd banip
```

---

## 📦 **BACKUP & RESTORE**

### Backup Operations
```bash
# Run backup script
~/backup.sh

# Manual Redis backup
docker run --rm \
  -v fikerflow-lead-saas_redis-data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/redis-manual-$(date +%Y%m%d).tar.gz /data

# List backups
ls -lh ~/backups/
```

### Restore Operations
```bash
# Restore Redis from backup
docker run --rm \
  -v fikerflow-lead-saas_redis-data:/data \
  -v ~/backups:/backup \
  alpine tar xzf /backup/redis-20240101.tar.gz -C /
```

---

## 🌐 **NGINX MANAGEMENT**

### Configuration Management
```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx (graceful)
sudo systemctl reload nginx

# Restart Nginx (forceful)
sudo systemctl restart nginx

# View Nginx status
sudo systemctl status nginx

# Edit Nginx config
sudo nano /etc/nginx/sites-available/fikerflow-leads
```

---

## 📈 **MONITORING COMMANDS**

### Real-time Monitoring
```bash
# System resources
htop

# Docker stats
docker stats

# Network connections
sudo netstat -tulpn

# Disk I/O
sudo iotop

# Process monitoring
ps aux | grep node
```

### Log Analysis
```bash
# Error logs
docker logs flowgen-backend | grep -i error
sudo tail -f /var/log/nginx/error.log

# Access logs
sudo tail -f /var/log/nginx/access.log

# Search logs
docker logs flowgen-backend --since 1h | grep "ERROR"
```

---

## 🚨 **EMERGENCY COMMANDS**

### Full System Reset
```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Remove all containers and volumes (WARNING: data loss!)
docker-compose -f docker-compose.production.yml down -v

# Rebuild from scratch
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Verify health
curl http://localhost:3001/health
```

### Emergency Rollback
```bash
# Stop current services
docker-compose -f docker-compose.production.yml stop

# Switch to previous version
git checkout TAG_NAME

# Restart with previous version
docker-compose -f docker-compose.production.yml up -d
```

---

## 📞 **HELP & SUPPORT**

### Get System Information
```bash
# Docker version
docker --version
docker-compose --version

# System info
uname -a
lsb_release -a

# Container info
docker info
docker network ls
docker volume ls
```

### Export Logs for Support
```bash
# Create log bundle
mkdir ~/support-logs
docker logs flowgen-backend > ~/support-logs/backend.log
docker logs flowgen-frontend > ~/support-logs/frontend.log
docker logs flowgen-redis > ~/support-logs/redis.log
sudo journalctl -u docker > ~/support-logs/docker.log
sudo journalctl -u nginx > ~/support-logs/nginx.log

# Create archive
tar czf ~/support-logs-$(date +%Y%m%d).tar.gz ~/support-logs/
```

---

**💡 TIP:** Add aliases to your `.bashrc` for frequently used commands:
```bash
alias dc='docker-compose -f ~/fikerflow-lead-saas/docker-compose.production.yml'
alias dcl='dc logs -f'
alias dcr='dc restart'
alias dcs='dc ps'
alias health='curl -s http://localhost:3001/health | jq .'
```

**🎯 Save this file for quick reference during deployment and maintenance!**