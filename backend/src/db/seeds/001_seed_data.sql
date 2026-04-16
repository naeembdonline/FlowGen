-- ============================================================================
-- FIKERFLOW LEAD GENERATION SAAS - SEED DATA
-- ============================================================================
-- This script creates sample data for development and testing.
-- WARNING: Only run this in development environments!
--
-- Usage: Run in Supabase SQL Editor after running the initial schema migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INSERT TEST TENANT
-- ----------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, plan, plan_limits)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Fikerflow Digital Agency',
  'fikerflow-agency',
  'pro',
  '{
    "max_leads": 5000,
    "max_messages_per_month": 10000,
    "max_campaigns": 100
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INSERT TEST USERS
-- ----------------------------------------------------------------------------
-- Note: You need to create these users in Supabase Auth first!
-- Go to Authentication -> Users in Supabase Dashboard and create:
-- - admin@fikerflow.com (id: 22222222-2222-2222-2222-222222222222)
-- - user@fikerflow.com (id: 33333333-3333-3333-3333-333333333333)

-- Admin user
INSERT INTO users (id, tenant_id, role, full_name, email_verified)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin',
  'Admin User',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Regular user
INSERT INTO users (id, tenant_id, role, full_name, email_verified)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'Test User',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INSERT SAMPLE LEADS
-- ----------------------------------------------------------------------------
INSERT INTO leads (tenant_id, name, description, phone, email, website, address, city, state, category, google_rating, google_reviews_count, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sunrise Cafe', 'Cozy neighborhood cafe serving artisan coffee and fresh pastries', '+1-555-0101', 'contact@sunrisecafe.com', 'https://sunrisecafe.com', '123 Main Street', 'San Francisco', 'CA', 'Coffee Shop', 4.5, 234, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Tech Solutions Inc', 'IT consulting and managed services for small businesses', '+1-555-0102', 'info@techsolutions.com', 'https://techsolutions.com', '456 Tech Blvd', 'Austin', 'TX', 'Business Services', 4.8, 156, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'FitLife Gym', '24/7 fitness center with personal training and group classes', '+1-555-0103', NULL, 'https://fitlifegym.com', '789 Fitness Way', 'Miami', 'FL', 'Gym', 4.6, 412, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Green Leaf Landscaping', 'Full-service landscaping and lawn care for residential properties', '+1-555-0104', 'greenleaf@email.com', NULL, '321 Garden Lane', 'Seattle', 'WA', 'Landscaping', 4.7, 89, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Downtown Dental', 'Family and cosmetic dentistry', '+1-555-0105', 'appointments@downtowndental.com', 'https://downtowndental.com', '555 Smile Street', 'Denver', 'CO', 'Healthcare', 4.9, 328, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Pizza Palace', 'Authentic Italian pizza and pasta', '+1-555-0106', 'order@pizzapalace.com', 'https://pizzapalace.com', '888 Pizza Avenue', 'New York', 'NY', 'Restaurant', 4.3, 567, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Pet Paradise', 'Pet grooming and boarding services', '+1-555-0107', 'info@petparadise.com', 'https://petparadise.com', '111 Pet Lane', 'Los Angeles', 'CA', 'Pet Services', 4.8, 245, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'AutoFix Garage', 'Complete auto repair and maintenance', '+1-555-0108', NULL, 'https://autofixgarage.com', '222 Mechanic Street', 'Chicago', 'IL', 'Automotive', 4.5, 178, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Beauty Bliss Spa', 'Full-service spa and salon', '+1-555-0109', 'book@beautybliss.com', NULL, '333 Relax Road', 'Phoenix', 'AZ', 'Beauty', 4.9, 412, 'new'),
  ('11111111-1111-1111-1111-111111111111', 'Law Partners LLP', 'Business and personal legal services', '+1-555-0110', 'contact@lawpartners.com', 'https://lawpartners.com', '444 Legal Lane', 'Boston', 'MA', 'Legal Services', 4.6, 134, 'new')
ON CONFLICT (tenant_id, google_maps_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INSERT SAMPLE CAMPAIGN
-- ----------------------------------------------------------------------------
INSERT INTO campaigns (
  id,
  tenant_id,
  created_by,
  name,
  description,
  type,
  status,
  message_template,
  ai_prompt,
  target_leads,
  schedule_type
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Coffee Shop Outreach - March 2024',
  'Personalized outreach to coffee shops for digital marketing services',
  'email',
  'draft',
  'Hi {name},

I noticed your coffee shop, {business}, has great reviews on Google Maps ({rating} ⭐)!

I''m reaching out because we specialize in helping local cafes boost their online presence and attract more customers through social media marketing and Google Business optimization.

Would you be open to a quick 15-minute call to discuss how we''ve helped similar cafes increase their foot traffic by 40%?

Best regards,
{sender_name}',
  'Generate a personalized email for a coffee shop owner named {name} at {business}. Their Google rating is {rating}. Keep it friendly and professional, under 150 words.',
  ARRAY(
    (SELECT id FROM leads WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND category = 'Coffee Shop' LIMIT 1)
  ),
  'immediate'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INSERT SAMPLE MESSAGES
-- ----------------------------------------------------------------------------
-- Get a lead ID to create sample messages
DO $$
DECLARE
  v_lead_id UUID;
  v_campaign_id UUID;
BEGIN
  SELECT id INTO v_lead_id FROM leads WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Sunrise Cafe' LIMIT 1;
  v_campaign_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO messages (tenant_id, campaign_id, lead_id, status, channel, content, sent_at, delivered_at)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      v_campaign_id,
      v_lead_id,
      'delivered',
      'email',
      'Hi Sunrise Cafe team!

I noticed your great reviews on Google Maps and wanted to reach out. We specialize in digital marketing for local cafes and would love to help you attract more customers.

Would you be interested in a quick call to discuss?

Best regards,
Fikerflow Team',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- CREATE HELPER FUNCTION: Get tenant_id from auth.uid()
-- ----------------------------------------------------------------------------
-- This function is useful in application logic to get the current user's tenant
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM users
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a tenant';
  END IF;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================
--
-- Your database now has sample data to work with!
--
-- Test credentials (after creating in Supabase Auth):
-- - Admin: admin@fikerflow.com (id: 22222222-2222-2222-2222-222222222222)
-- - User: user@fikerflow.com (id: 33333333-3333-3333-3333-333333333333)
--
-- Sample data includes:
-- - 1 tenant (Fikerflow Digital Agency)
-- - 2 users (admin and regular user)
-- - 10 sample leads across various categories
-- - 1 sample campaign (draft status)
-- - 1 sample message (delivered)
--
-- ============================================================================
