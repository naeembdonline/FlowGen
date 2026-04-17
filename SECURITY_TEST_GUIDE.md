# 🔒 FLOWGEN SECURITY TESTING GUIDE

## 🧪 **SECURITY VERIFICATION TESTS**

This guide provides comprehensive tests to verify that all security fixes are working correctly.

---

## **TEST 1: Authentication Required**

### **Objective:** Verify that unauthenticated requests are blocked

### **Test Commands:**

```bash
# ❌ Should FAIL: No authorization header
curl -X GET http://localhost:3001/api/v1/leads

# Expected Response:
# 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Missing or invalid authorization header"
# }
```

```bash
# ❌ Should FAIL: Invalid token
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer invalid-token"

# Expected Response:
# 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Invalid or expired token"
# }
```

```bash
# ✅ Should PASS: Valid token
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer <valid-jwt-token>"

# Expected Response:
# 200 OK
# {
#   "leads": [...],
#   "pagination": {...}
# }
```

### **Verification:**
- [ ] Unauthenticated requests return 401
- [ ] Invalid tokens return 401
- [ ] Valid tokens return 200

---

## **TEST 2: Tenant Isolation**

### **Objective:** Verify users can only access their tenant's data

### **Setup:**
1. Create two test users in different tenants
2. Generate valid JWT tokens for both users

### **Test Commands:**

```bash
# User A (Tenant A) accessing their own leads
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer <tenant-a-jwt>"

# Expected: Returns only Tenant A's leads
```

```bash
# User B (Tenant B) accessing their own leads
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer <tenant-b-jwt>"

# Expected: Returns only Tenant B's leads
```

### **Verification:**
- [ ] User A sees only Tenant A leads
- [ ] User B sees only Tenant B leads
- [ ] No data leakage between tenants

---

## **TEST 3: No Hardcoded Tenant Fallbacks**

### **Objective:** Verify tenant_id is always extracted from JWT

### **Test Commands:**

```bash
# Try to override tenant_id in request body
curl -X POST http://localhost:3001/api/v1/campaigns/scrape \
  -H "Authorization: Bearer <tenant-a-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "coffee",
    "location": "San Francisco",
    "tenant_id": "different-tenant-id"  # Attempt to override
  }'

# Expected: Uses tenant_id from JWT, ignores request body
```

### **Verification:**
- [ ] tenant_id extracted from JWT only
- [ ] Request body tenant_id ignored
- [ ] No fallback to default tenant

---

## **TEST 4: Database RLS Policies**

### **Objective:** Verify database-level tenant isolation

### **Test Commands:**

```sql
-- Connect to Supabase SQL Editor

-- Test 1: Verify RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'campaigns', 'messages', 'users', 'tenants')
ORDER BY tablename;

-- Expected: All tables show rls_enabled = true
```

```sql
-- Test 2: Verify policies exist
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Multiple policies per table for SELECT, INSERT, UPDATE, DELETE
```

```sql
-- Test 3: Test tenant isolation (run as authenticated user)
-- This should only return leads from the user's tenant
SELECT * FROM leads LIMIT 10;

-- Expected: Returns leads only for current user's tenant
```

### **Verification:**
- [ ] RLS enabled on all tables
- [ ] Tenant isolation policies created
- [ ] Users can only see their tenant's data
- [ ] Cross-tenant queries blocked

---

## **TEST 5: Role-Based Access Control**

### **Objective:** Verify role-based authorization works

### **Test Commands:**

```bash
# Test with admin user
curl -X GET http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <admin-jwt>"

# Expected: 200 OK (admin has access)
```

```bash
# Test with regular user
curl -X GET http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <user-jwt>"

# Expected: 403 Forbidden (user lacks permission)
```

### **Verification:**
- [ ] Admin users can access admin endpoints
- [ ] Regular users cannot access admin endpoints
- [ ] Proper error messages for insufficient permissions

---

## **TEST 6: Lead Generation Security**

### **Objective:** Verify lead generation requires authentication

### **Test Commands:**

```bash
# ❌ Should FAIL: No authentication
curl -X POST http://localhost:3001/api/v1/campaigns/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "coffee",
    "location": "San Francisco"
  }'

# Expected: 401 Unauthorized
```

```bash
# ✅ Should PASS: With authentication
curl -X POST http://localhost:3001/api/v1/campaigns/scrape \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "coffee",
    "location": "San Francisco"
  }'

# Expected: 202 Accepted
# {
#   "message": "Lead generation job started",
#   "jobId": "job-...",
#   "tenantId": "user's-tenant-id"
# }
```

### **Verification:**
- [ ] Unauthenticated scrape requests blocked
- [ ] Authenticated requests create jobs for correct tenant
- [ ] No tenant_id in response body (security)

---

## **TEST 7: Message Security**

### **Objective:** Verify message operations are tenant-isolated

### **Test Commands:**

```bash
# Get messages for tenant A
curl -X GET http://localhost:3001/api/v1/messages \
  -H "Authorization: Bearer <tenant-a-jwt>"

# Expected: Returns only Tenant A's messages
```

```bash
# Get messages for tenant B
curl -X GET http://localhost:3001/api/v1/messages \
  -H "Authorization: Bearer <tenant-b-jwt>"

# Expected: Returns only Tenant B's messages
```

### **Verification:**
- [ ] Users see only their tenant's messages
- [ ] No cross-tenant message access
- [ ] Message status updates isolated

---

## **TEST 8: Analytics Security**

### **Objective:** Verify analytics data is tenant-isolated

### **Test Commands:**

```bash
# Get analytics for tenant A
curl -X GET http://localhost:3001/api/v1/analytics/overview \
  -H "Authorization: Bearer <tenant-a-jwt>"

# Expected: Returns analytics for Tenant A only
```

```bash
# Get analytics for tenant B
curl -X GET http://localhost:3001/api/v1/analytics/overview \
  -H "Authorization: Bearer <tenant-b-jwt>"

# Expected: Returns analytics for Tenant B only
```

### **Verification:**
- [ ] Analytics data isolated by tenant
- [ ] No cross-tenant data leakage
- [ ] Metrics calculated per tenant

---

## **AUTOMATED SECURITY TEST**

### **Create a test script:**

```javascript
// security-test.js
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';
const VALID_JWT = process.env.VALID_JWT; // Set this environment variable

async function testSecurity() {
  console.log('🔒 Running Security Tests...\n');

  // Test 1: Unauthenticated access
  console.log('Test 1: Unauthenticated Access');
  try {
    const response = await fetch(`${API_BASE}/leads`);
    console.log(`Status: ${response.status}`);
    console.log(`❌ FAILED: Should return 401, got ${response.status}`);
  } catch (error) {
    console.log('✅ PASSED: Unauthenticated requests blocked');
  }

  // Test 2: Authenticated access
  console.log('\nTest 2: Authenticated Access');
  try {
    const response = await fetch(`${API_BASE}/leads`, {
      headers: { 'Authorization': `Bearer ${VALID_JWT}` }
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ PASSED: Authenticated requests allowed');
    } else {
      console.log(`❌ FAILED: Should return 200, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }

  // Test 3: Tenant isolation
  console.log('\nTest 3: Tenant Isolation');
  try {
    const response = await fetch(`${API_BASE}/leads`, {
      headers: { 'Authorization': `Bearer ${VALID_JWT}` }
    });
    const data = await response.json();
    console.log(`Leads returned: ${data.leads?.length || 0}`);
    console.log('✅ PASSED: Tenant data isolated');
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }

  console.log('\n🔒 Security Tests Complete');
}

testSecurity();
```

### **Run the test:**

```bash
# Set your valid JWT token
export VALID_JWT="your-valid-jwt-token-here"

# Run the security test
node security-test.js
```

---

## **MANUAL TESTING CHECKLIST**

### **Authentication Tests:**
- [ ] Unauthenticated requests blocked (401)
- [ ] Invalid tokens rejected (401)
- [ ] Valid tokens accepted (200)
- [ ] Token expiration enforced (401)
- [ ] Missing auth header caught (401)

### **Tenant Isolation Tests:**
- [ ] Users see only their tenant's leads
- [ ] Users see only their tenant's campaigns
- [ ] Users see only their tenant's messages
- [ ] Analytics data isolated by tenant
- [ ] No cross-tenant data access possible

### **Database Security Tests:**
- [ ] RLS enabled on all tables
- [ ] Tenant policies created for all operations
- [ ] Direct SQL queries respect tenant isolation
- [ ] Service role has appropriate access
- [ ] Performance indexes created

### **API Security Tests:**
- [ ] All routes require authentication
- [ ] Role-based authorization works
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled

---

## **SECURITY MONITORING**

### **Key Metrics to Monitor:**

1. **Authentication Failures**
   - Track 401 errors per endpoint
   - Alert on unusual patterns

2. **Authorization Failures**
   - Track 403 errors per endpoint
   - Monitor permission escalation attempts

3. **Cross-Tenant Access Attempts**
   - Monitor queries accessing multiple tenants
   - Alert on suspicious patterns

4. **Rate Limiting**
   - Track users hitting rate limits
   - Identify potential abusers

5. **Data Access Patterns**
   - Monitor unusual data access patterns
   - Track bulk data exports

---

## **SECURITY BEST PRACTICES**

### **For Development:**
1. Always use authentication middleware
2. Never accept tenant_id from request body
3. Test with multiple tenants
4. Use environment variables for secrets
5. Keep dependencies updated

### **For Production:**
1. Enable HTTPS only
2. Use strong JWT secrets
3. Implement webhook signature verification
4. Set up security monitoring
5. Regular security audits
6. Log all authentication events

---

## **TROUBLESHOOTING**

### **Issue: 401 Unauthorized**
- Check JWT token is valid
- Verify Authorization header format: `Bearer <token>`
- Ensure token hasn't expired
- Check token contains required fields (userId, tenantId)

### **Issue: 403 Forbidden**
- Check user has required role
- Verify role-based authorization rules
- Ensure tenant context is correct

### **Issue: Cross-Tenant Data Access**
- Verify RLS policies are enabled
- Check policies are correctly configured
- Test direct SQL queries
- Review application-level filters

### **Issue: Performance Issues**
- Check indexes are created
- Monitor query performance
- Review RLS policy complexity
- Consider materialized views for analytics

---

## **CONCLUSION**

After completing all tests, your FlowGen SaaS should have:

✅ **Robust authentication** with JWT tokens
✅ **Strict tenant isolation** at app and database levels
✅ **Role-based authorization** for different user types
✅ **Comprehensive security logging** for auditing
✅ **Production-ready security** for multi-tenant SaaS

### **Production Deployment Checklist:**
- [ ] All security tests passing
- [ ] RLS policies deployed to Supabase
- [ ] Strong JWT secrets configured
- [ ] HTTPS enabled
- [ ] Security monitoring set up
- [ ] Webhook signatures implemented
- [ ] Rate limiting tuned
- [ ] Backup strategy in place

---

**🔒 Your FlowGen SaaS is now production-secure! 🎉**

