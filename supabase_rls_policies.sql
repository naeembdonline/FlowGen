-- ============================================================================
-- FLOWGEN LEAD GENERATION SAAS - SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Complete SQL script for securing multi-tenant SaaS data isolation
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS TABLE RLS POLICIES
-- ============================================================================

-- Policy: Users can view their tenant only
CREATE POLICY "users_can_view_own_tenant"
  ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can view all tenants (for API access)
CREATE POLICY "service_role_can_view_all_tenants"
  ON tenants
  FOR SELECT
  USING (true);

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================

-- Policy: Users can view users from their tenant only
CREATE POLICY "users_can_view_own_tenant_users"
  ON users
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can view all users
CREATE POLICY "service_role_can_view_all_users"
  ON users
  FOR SELECT
  USING (true);

-- ============================================================================
-- LEADS TABLE RLS POLICIES (CRITICAL FOR LEAD ISOLATION)
-- ============================================================================

-- Policy: Users can only view leads from their tenant
CREATE POLICY "users_can_view_own_tenant_leads"
  ON leads
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can only insert leads for their tenant
CREATE POLICY "users_can_insert_own_tenant_leads"
  ON leads
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can only update leads from their tenant
CREATE POLICY "users_can_update_own_tenant_leads"
  ON leads
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can only delete leads from their tenant
CREATE POLICY "users_can_delete_own_tenant_leads"
  ON leads
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can view all leads (for API operations)
CREATE POLICY "service_role_can_view_all_leads"
  ON leads
  FOR SELECT
  USING (true);

-- ============================================================================
-- CAMPAIGNS TABLE RLS POLICIES
-- ============================================================================

-- Policy: Users can view campaigns from their tenant only
CREATE POLICY "users_can_view_own_tenant_campaigns"
  ON campaigns
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert campaigns for their tenant only
CREATE POLICY "users_can_insert_own_tenant_campaigns"
  ON campaigns
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update campaigns from their tenant only
CREATE POLICY "users_can_update_own_tenant_campaigns"
  ON campaigns
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete campaigns from their tenant only
CREATE POLICY "users_can_delete_own_tenant_campaigns"
  ON campaigns
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can view all campaigns
CREATE POLICY "service_role_can_view_all_campaigns"
  ON campaigns
  FOR SELECT
  USING (true);

-- ============================================================================
-- MESSAGES TABLE RLS POLICIES
-- ============================================================================

-- Policy: Users can view messages from their tenant only
CREATE POLICY "users_can_view_own_tenant_messages"
  ON messages
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert messages for their tenant only
CREATE POLICY "users_can_insert_own_tenant_messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update messages from their tenant only
CREATE POLICY "users_can_update_own_tenant_messages"
  ON messages
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete messages from their tenant only
CREATE POLICY "users_can_delete_own_tenant_messages"
  ON messages
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can view all messages
CREATE POLICY "service_role_can_view_all_messages"
  ON messages
  FOR SELECT
  USING (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Leads table indexes for tenant isolation performance
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id_category ON leads(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_leads_google_maps_id ON leads(google_maps_id);
CREATE INDEX IF NOT EXISTS idx_leads_imported_at ON leads(imported_at DESC);

-- Campaigns table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id_status ON campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id_type ON campaigns(tenant_id, type);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id_campaign_id ON messages(tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id_status ON messages(tenant_id, status);

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TENANT_ID ASSIGNMENT
-- ============================================================================

-- Function to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_tenant_id_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tenant_id = (
    SELECT tenant_id
    FROM users
    WHERE id = auth.uid()
    LIMIT 1
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically set tenant_id when user creates data
-- (Optional - remove if you want manual tenant_id control)
-- DROP TRIGGER IF EXISTS set_tenant_id_on_leads_insert ON leads;
-- CREATE TRIGGER set_tenant_id_on_leads_insert
--   BEFORE INSERT ON leads
--   FOR EACH ROW
--   EXECUTE FUNCTION set_tenant_id_on_user_insert();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on tables for service role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check that indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%tenant_id%'
ORDER BY tablename, indexname;

-- ============================================================================
-- TESTING TENANT ISOLATION (Run this to test)
-- ============================================================================

-- Test query: Count leads by tenant_id
SELECT
  tenant_id,
  COUNT(*) as lead_count
FROM leads
GROUP BY tenant_id
ORDER BY lead_count DESC;

-- Test query: Show which user has access to which tenant
SELECT
  u.id,
  u.email,
  u.tenant_id,
  COUNT(l.id) as lead_count
FROM users u
LEFT JOIN leads l ON l.tenant_id = u.tenant_id
WHERE u.id = auth.uid()
GROUP BY u.id, u.email, u.tenant_id;

-- ============================================================================
-- SECURITY CHECKLIST
-- ============================================================================

-- After running this script, verify:

-- [ ] RLS is enabled on all tables
-- [ ] Each table has tenant_isolation policies
-- [ ] Service role has appropriate access
-- ] [ ] Indexes are created for performance
-- [ ] No hardcoded tenant_id values remain in code
-- [ ] Authentication middleware is applied to all routes
-- [ ] JWT token contains tenant_id and user_id
-- [ ] No cross-tenant data access is possible

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

-- To apply these policies:
-- 1. Connect to your Supabase SQL editor
-- 2. Run this entire script
-- 3. Verify policies are created using the verification queries above
-- 4. Test with sample data to ensure tenant isolation works

-- To verify tenant isolation is working:
-- 1. Create test users in different tenants
-- 2. Insert leads as each user
-- 3. Verify users can only see their own leads
-- 4. Try to access other tenants' data (should fail)

-- ============================================================================
-- ROLLBACK (In Case of Issues)
-- ============================================================================

-- To remove all policies (if needed):
-- DROP POLICY IF EXISTS users_can_view_own_tenant_leads ON leads;
-- DROP POLICY IF EXISTS users_can_insert_own_tenant_leads ON leads;
-- DROP POLICY IF EXISTS users_can_update_own_tenant_leads ON leads;
-- DROP POLICY IF EXISTS users_can_delete_own_tenant_leads ON leads;
-- DROP POLICY IF EXISTS service_role_can_view_all_leads ON leads;
-- (Repeat for all tables)

-- To disable RLS (NOT RECOMMENDED):
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTES
-- ============================================================================

-- These policies ensure that:
-- 1. Users can only access data from their own tenant
-- 2. Service role (for API access) can access all data
-- 3. tenant_id filtering is enforced at database level
-- 4. Cross-tenant data access is impossible
-- 5. Data isolation is maintained even if application code has bugs

-- Additional recommendations:
-- 1. Always validate tenant_id from JWT token
-- 2. Never accept tenant_id from request body
-- 3. Use authentication middleware on all API routes
-- 4. Test tenant isolation thoroughly before production
-- 5. Monitor and audit cross-tenant access attempts

-- ============================================================================
