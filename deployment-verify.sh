#!/bin/bash

# ============================================================================
# FIKERFLOW LEAD SAAS - DEPLOYMENT VERIFICATION SCRIPT
# ============================================================================
# This script verifies that your production deployment is working correctly
# Usage: bash deployment-verify.sh
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Print header
print_header() {
    echo -e "\n${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}\n"
}

# Print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASS++))
    elif [ $1 -eq 1 ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $2"
        ((WARN++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAIL++))
    fi
}

# Test function
test_service() {
    local service_name=$1
    local test_command=$2

    if eval "$test_command" > /dev/null 2>&1; then
        print_result 0 "$service_name is accessible"
        return 0
    else
        print_result 2 "$service_name is not accessible"
        return 1
    fi
}

# ============================================================================
# MAIN VERIFICATION SEQUENCE
# ============================================================================

clear
print_header "FIKERFLOW LEAD SAAS - DEPLOYMENT VERIFICATION"

echo -e "${BLUE}Starting comprehensive deployment verification...${NC}\n"

# ============================================================================
# 1. DOCKER SERVICES CHECK
# ============================================================================

print_header "1. DOCKER SERVICES VERIFICATION"

# Check if Docker is running
if systemctl is-active --quiet docker; then
    print_result 0 "Docker daemon is running"
else
    print_result 2 "Docker daemon is not running"
    exit 1
fi

# Check if docker-compose exists
if [ -f "docker-compose.production.yml" ]; then
    print_result 0 "Docker Compose configuration file exists"
else
    print_result 2 "Docker Compose configuration file not found"
    exit 1
fi

# Check if containers are running
BACKEND_RUNNING=$(docker ps -q -f name=flowgen-backend)
FRONTEND_RUNNING=$(docker ps -q -f name=flowgen-frontend)
REDIS_RUNNING=$(docker ps -q -f name=flowgen-redis)

if [ -n "$BACKEND_RUNNING" ]; then
    print_result 0 "Backend container is running"
else
    print_result 2 "Backend container is not running"
fi

if [ -n "$FRONTEND_RUNNING" ]; then
    print_result 0 "Frontend container is running"
else
    print_result 2 "Frontend container is not running"
fi

if [ -n "$REDIS_RUNNING" ]; then
    print_result 0 "Redis container is running"
else
    print_result 2 "Redis container is not running"
fi

# ============================================================================
# 2. NETWORK CONNECTIVITY CHECK
# ============================================================================

print_header "2. NETWORK CONNECTIVITY VERIFICATION"

# Test backend to frontend connectivity
if docker exec flowgen-backend ping -c 1 frontend > /dev/null 2>&1; then
    print_result 0 "Backend can reach Frontend"
else
    print_result 2 "Backend cannot reach Frontend"
fi

# Test backend to Redis connectivity
if docker exec flowgen-backend redis-cli -h redis ping > /dev/null 2>&1; then
    print_result 0 "Backend can reach Redis"
else
    print_result 2 "Backend cannot reach Redis"
fi

# Test Redis response
REDIS_RESPONSE=$(docker exec flowgen-redis redis-cli ping 2>/dev/null)
if [ "$REDIS_RESPONSE" = "PONG" ]; then
    print_result 0 "Redis is responding correctly"
else
    print_result 2 "Redis is not responding correctly"
fi

# ============================================================================
# 3. HEALTH ENDPOINTS CHECK
# ============================================================================

print_header "3. HEALTH ENDPOINTS VERIFICATION"

# Test backend health endpoint
BACKEND_HEALTH=$(curl -s http://localhost:3001/health)
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    print_result 0 "Backend health endpoint is responding"

    # Check database status
    if echo "$BACKEND_HEALTH" | grep -q "configured"; then
        print_result 0 "Database connection is configured"
    else
        print_result 2 "Database connection is not configured"
    fi

    # Check cache status
    if echo "$BACKEND_HEALTH" | grep -q "redis\|in-memory"; then
        print_result 0 "Cache system is active"
    else
        print_result 1 "Cache system status unclear"
    fi
else
    print_result 2 "Backend health endpoint is not responding"
fi

# Test frontend
FRONTEND_RESPONSE=$(curl -s http://localhost:3000/)
if [ -n "$FRONTEND_RESPONSE" ]; then
    print_result 0 "Frontend is serving content"
else
    print_result 2 "Frontend is not serving content"
fi

# ============================================================================
# 4. ENVIRONMENT VARIABLES CHECK
# ============================================================================

print_header "4. ENVIRONMENT VARIABLES VERIFICATION"

# Check if .env file exists
if [ -f "backend/.env" ]; then
    print_result 0 "Environment file exists"

    # Check if file is readable
    if [ -r "backend/.env" ]; then
        print_result 0 "Environment file is readable"
    else
        print_result 2 "Environment file is not readable"
    fi

    # Check file permissions (should be 600)
    PERMS=$(stat -c %a backend/.env 2>/dev/null || stat -f %A backend/.env 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        print_result 0 "Environment file has secure permissions (600)"
    else
        print_result 1 "Environment file permissions are $PERMS (should be 600)"
    fi
else
    print_result 2 "Environment file does not exist"
fi

# Test environment variable loading
ENV_TEST=$(cd backend && node -e "
require('dotenv').config();
console.log(process.env.SUPABASE_URL ? 'SUPABASE_URL:set' : 'SUPABASE_URL:missing');
console.log(process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY:set' : 'SUPABASE_ANON_KEY:missing');
console.log(process.env.JWT_SECRET ? 'JWT_SECRET:set' : 'JWT_SECRET:missing');
" 2>/dev/null)

if echo "$ENV_TEST" | grep -q "SUPABASE_URL:set"; then
    print_result 0 "SUPABASE_URL is set"
else
    print_result 2 "SUPABASE_URL is not set"
fi

if echo "$ENV_TEST" | grep -q "SUPABASE_ANON_KEY:set"; then
    print_result 0 "SUPABASE_ANON_KEY is set"
else
    print_result 2 "SUPABASE_ANON_KEY is not set"
fi

if echo "$ENV_TEST" | grep -q "JWT_SECRET:set"; then
    print_result 0 "JWT_SECRET is set"
else
    print_result 2 "JWT_SECRET is not set"
fi

# ============================================================================
# 5. NGINX CONFIGURATION CHECK
# ============================================================================

print_header "5. NGINX VERIFICATION"

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    print_result 0 "Nginx is running"
else
    print_result 2 "Nginx is not running"
fi

# Check Nginx configuration
if nginx -t 2>/dev/null; then
    print_result 0 "Nginx configuration is valid"
else
    print_result 2 "Nginx configuration has errors"
fi

# Test Nginx reverse proxy
NGINX_TEST=$(curl -s http://localhost/health)
if echo "$NGINX_TEST" | grep -q "ok"; then
    print_result 0 "Nginx reverse proxy is working"
else
    print_result 2 "Nginx reverse proxy is not working"
fi

# ============================================================================
# 6. SSL CERTIFICATE CHECK
# ============================================================================

print_header "6. SSL CERTIFICATE VERIFICATION"

# Check if SSL certificate exists
if [ -f "/etc/letsencrypt/live/leads.fikerflow.com/fullchain.pem" ]; then
    print_result 0 "SSL certificate file exists"

    # Check certificate expiration
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/leads.fikerflow.com/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        echo -e "${GREEN}✅ Certificate expires: $CERT_EXPIRY${NC}"
        ((PASS++))
    else
        print_result 1 "Could not determine certificate expiration"
    fi
else
    print_result 1 "SSL certificate file not found (HTTP only)"
fi

# Test HTTPS connection
if curl -k -s https://localhost/health > /dev/null 2>&1; then
    print_result 0 "HTTPS connection is working"
else
    print_result 1 "HTTPS connection is not working"
fi

# ============================================================================
# 7. SYSTEM RESOURCES CHECK
# ============================================================================

print_header "7. SYSTEM RESOURCES VERIFICATION"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_result 0 "Disk usage is at ${DISK_USAGE}% (healthy)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_result 1 "Disk usage is at ${DISK_USAGE}% (warning)"
else
    print_result 2 "Disk usage is at ${DISK_USAGE}% (critical)"
fi

# Check memory usage
MEM_AVAILABLE=$(free | grep Mem | awk '{printf("%.0f", $4/$2 * 100.0)}')
if [ "$MEM_AVAILABLE" -gt 20 ]; then
    print_result 0 "Memory available: ${MEM_AVAILABLE}% (healthy)"
elif [ "$MEM_AVAILABLE" -gt 10 ]; then
    print_result 1 "Memory available: ${MEM_AVAILABLE}% (warning)"
else
    print_result 2 "Memory available: ${MEM_AVAILABLE}% (critical)"
fi

# Check CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_COUNT=$(nproc)
if (( $(echo "$CPU_LOAD < $CPU_COUNT" | bc -l) )); then
    print_result 0 "CPU load is $CPU_LOAD (healthy)"
elif (( $(echo "$CPU_LOAD < $CPU_COUNT * 2" | bc -l) )); then
    print_result 1 "CPU load is $CPU_LOAD (elevated)"
else
    print_result 2 "CPU load is $CPU_LOAD (critical)"
fi

# ============================================================================
# 8. FIREWALL AND SECURITY CHECK
# ============================================================================

print_header "8. SECURITY VERIFICATION"

# Check firewall status
if command -v ufw > /dev/null 2>&1; then
    if ufw status | grep -q "Status: active"; then
        print_result 0 "UFW firewall is active"
    else
        print_result 1 "UFW firewall is not active"
    fi
else
    print_result 1 "UFW firewall not found"
fi

# Check Fail2Ban status
if systemctl is-active --quiet fail2ban; then
    print_result 0 "Fail2Ban is running"
else
    print_result 1 "Fail2Ban is not running"
fi

# ============================================================================
# 9. DOCKER CONTAINER HEALTH
# ============================================================================

print_header "9. CONTAINER HEALTH STATUS"

# Check backend health status
BACKEND_HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' flowgen-backend 2>/dev/null)
if [ "$BACKEND_HEALTH_STATUS" = "healthy" ]; then
    print_result 0 "Backend container health check: healthy"
elif [ "$BACKEND_HEALTH_STATUS" = "starting" ]; then
    print_result 1 "Backend container health check: starting"
else
    print_result 1 "Backend container health check: $BACKEND_HEALTH_STATUS"
fi

# Check frontend health status
FRONTEND_HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' flowgen-frontend 2>/dev/null)
if [ "$FRONTEND_HEALTH_STATUS" = "healthy" ]; then
    print_result 0 "Frontend container health check: healthy"
elif [ "$FRONTEND_HEALTH_STATUS" = "starting" ]; then
    print_result 1 "Frontend container health check: starting"
else
    print_result 1 "Frontend container health check: $FRONTEND_HEALTH_STATUS"
fi

# ============================================================================
# 10. FINAL SUMMARY
# ============================================================================

print_header "VERIFICATION SUMMARY"

echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

TOTAL=$((PASS + WARN + FAIL))
PASS_RATE=$((PASS * 100 / TOTAL))

echo -e "\nPass Rate: ${PASS_RATE}%"

if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All checks passed! Your deployment is healthy.${NC}\n"
    exit 0
elif [ $FAIL -eq 0 ]; then
    echo -e "\n${YELLOW}⚠️  Deployment is functional but has warnings. Review above.${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Deployment has critical failures. Please fix the issues above.${NC}\n"
    exit 1
fi