-- ============================================================================
-- FIKERFLOW LEAD GENERATION SAAS - INITIAL DATABASE SCHEMA
-- ============================================================================
-- This migration creates all tables, indexes, and Row Level Security (RLS)
-- policies needed for the multi-tenant SaaS platform.
--
-- IMPORTANT: Run this in Supabase SQL Editor after creating your project
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TENANTS TABLE
-- ----------------------------------------------------------------------------
-- Each tenant represents an agency or company using the platform
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  logo_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'canceled', 'past_due', 'incomplete')),
  plan_limits JSONB DEFAULT '{
    "max_leads": 100,
    "max_messages_per_month": 500,
    "max_campaigns": 3
  }'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick tenant lookups by slug
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ----------------------------------------------------------------------------
-- USERS TABLE (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
-- User accounts with tenant associations
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id, tenant_id)
);

-- Create indexes for common queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(id) WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL);

-- ----------------------------------------------------------------------------
-- LEADS TABLE
-- ----------------------------------------------------------------------------
-- Business leads imported from Google Maps or other sources
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  postal_code TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  google_maps_id TEXT,
  google_maps_url TEXT,
  google_rating DECIMAL(3, 2),
  google_reviews_count INTEGER,
  raw_data JSONB DEFAULT '{}'::jsonb, -- Store full API response for flexibility
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'converted', 'unqualified')),
  source TEXT DEFAULT 'google_maps' CHECK (source IN ('google_maps', 'manual', 'import', 'api')),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, google_maps_id) -- Prevent duplicate leads per tenant
);

-- Create indexes for lead searches and filters
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_imported_at ON leads(imported_at DESC);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- ----------------------------------------------------------------------------
-- CAMPAIGNS TABLE
-- ----------------------------------------------------------------------------
-- Outreach campaigns (WhatsApp or Email)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  message_template TEXT,
  ai_prompt TEXT, -- Claude AI prompt for message generation
  ai_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  target_leads UUID[] DEFAULT '{}', -- Array of lead IDs to target
  segment_filters JSONB DEFAULT '{}'::jsonb, -- Dynamic filters for lead targeting
  schedule_type TEXT DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
  scheduled_for TIMESTAMPTZ,
  settings JSONB DEFAULT '{
    "rate_limit_per_minute": 60,
    "retry_failed": true,
    "max_retries": 3
  }'::jsonb,
  stats JSONB DEFAULT '{
    "total_leads": 0,
    "messages_sent": 0,
    "messages_delivered": 0,
    "messages_read": 0,
    "responses_received": 0
  }'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for campaign queries
CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);

-- ----------------------------------------------------------------------------
-- MESSAGES TABLE
-- ----------------------------------------------------------------------------
-- Individual message tracking
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'responded')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  subject TEXT, -- For email messages
  attachments JSONB[] DEFAULT '{}',
  external_id TEXT, -- WhatsApp message ID or Email ID (for tracking)
  external_status TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for message tracking
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_external_id ON messages(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ----------------------------------------------------------------------------
-- WEBHOOK LOGS TABLE
-- ----------------------------------------------------------------------------
-- Log external webhook events (Evolution API, Brevo, Stripe, etc.)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'evolution', 'brevo', 'stripe', etc.
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_attempt INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for webhook lookups
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source, processed);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- ANALYTICS EVENTS TABLE
-- ----------------------------------------------------------------------------
-- Track user events for analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
-- RLS ensures users can only access data from their own tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- TENANTS policies
-- Only authenticated users can read tenants
CREATE POLICY "Authenticated users can read tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- USERS policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can read other users in same tenant
CREATE POLICY "Users can read same tenant users"
  ON users FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- LEADS policies
-- Users can read leads from their tenant
CREATE POLICY "Users can read own tenant leads"
  ON leads FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Users can insert leads for their tenant
CREATE POLICY "Users can insert leads for own tenant"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Users can update leads from their tenant
CREATE POLICY "Users can update own tenant leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Users can delete leads from their tenant
CREATE POLICY "Users can delete own tenant leads"
  ON leads FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- CAMPAIGNS policies
CREATE POLICY "Users can read own tenant campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert campaigns for own tenant"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update own tenant campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- MESSAGES policies
CREATE POLICY "Users can read own tenant messages"
  ON messages FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert messages for own tenant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- WEBHOOK LOGS policies
CREATE POLICY "Users can read own tenant webhooks"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ANALYTICS EVENTS policies
CREATE POLICY "Users can insert own tenant analytics"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can read own tenant analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- FUNCTIONS AND TRIGGERS
-- ----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Your database is now set up for the Fikerflow Lead Generation SaaS!
--
-- Next steps:
-- 1. Create a Supabase project at https://supabase.com
-- 2. Run this SQL in the Supabase SQL Editor
-- 3. Set up authentication (Supabase Auth is pre-configured)
-- 4. Test RLS policies by creating test users
-- ============================================================================
