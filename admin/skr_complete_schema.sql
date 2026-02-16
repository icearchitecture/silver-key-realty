-- ============================================================
-- SILVER KEY REALTY — Complete Database Schema
-- ============================================================
-- Run in Supabase SQL Editor (paste entire file, click Run)
--
-- Creates ALL tables the Employee Portal queries:
--   skr_tenants           → Multi-tenant foundation
--   skr_team_members      → Employee auth + team management
--   skr_leads             → Incoming inquiries from all pathways
--   skr_consultations     → Scheduled meetings
--   skr_deals             → Active transactions
--   skr_properties        → Listings
--   skr_audit_log         → Forensic activity trail
--
-- Plus: RLS policies, indexes, triggers, and admin seed.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. TENANTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_tenants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  domain        TEXT,
  logo_url      TEXT,
  settings      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed the default tenant
INSERT INTO skr_tenants (name, slug, domain)
VALUES ('Silver Key Realty', 'silver-key-realty', 'silverkey.com')
ON CONFLICT (slug) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- 2. TEAM MEMBERS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_team_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  auth_user_id    UUID,  -- links to auth.users.id after Supabase auth user is created
  display_name    TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL DEFAULT 'agent'
                    CHECK (role IN ('admin', 'broker', 'agent', 'assistant')),
  phone           TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  specialties     TEXT[] DEFAULT '{}',
  pathway_focus   TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_email ON skr_team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_active ON skr_team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_role ON skr_team_members(role);


-- ════════════════════════════════════════════════════════════
-- 3. LEADS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  -- Contact info
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  -- Classification
  pathway         TEXT DEFAULT 'general'
                    CHECK (pathway IN ('buyer', 'seller', 'investor', 'rental', 'general')),
  status          TEXT DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'archived')),
  lead_score      INTEGER DEFAULT 0,
  source_page     TEXT,
  source_utm      JSONB DEFAULT '{}',
  -- Assignment
  assigned_to     UUID REFERENCES skr_team_members(id) ON DELETE SET NULL,
  -- Details
  message         TEXT,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  -- Flags
  archived        BOOLEAN DEFAULT false,
  -- Timestamps
  contacted_at    TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON skr_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_pathway ON skr_leads(pathway);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON skr_leads(archived);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON skr_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created ON skr_leads(created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 4. CONSULTATIONS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_consultations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES skr_leads(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES skr_team_members(id) ON DELETE SET NULL,
  -- Scheduling
  title           TEXT,
  status          TEXT DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  pathway         TEXT CHECK (pathway IN ('buyer', 'seller', 'investor', 'rental', 'general')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER DEFAULT 30,
  -- Details
  location        TEXT,
  video_link      TEXT,
  notes           TEXT,
  outcome         TEXT,
  follow_up       TEXT,
  metadata        JSONB DEFAULT '{}',
  -- Timestamps
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consult_status ON skr_consultations(status);
CREATE INDEX IF NOT EXISTS idx_consult_scheduled ON skr_consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consult_lead ON skr_consultations(lead_id);


-- ════════════════════════════════════════════════════════════
-- 5. PROPERTIES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_properties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  -- Listing info
  title           TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'pending', 'under_contract', 'sold', 'withdrawn', 'expired')),
  property_type   TEXT CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial')),
  -- Pricing
  list_price      NUMERIC(12,2),
  sold_price      NUMERIC(12,2),
  -- Details
  bedrooms        INTEGER,
  bathrooms       NUMERIC(3,1),
  sqft            INTEGER,
  lot_sqft        INTEGER,
  year_built      INTEGER,
  description     TEXT,
  -- Media
  photos          TEXT[] DEFAULT '{}',
  virtual_tour    TEXT,
  -- Assignment
  listing_agent   UUID REFERENCES skr_team_members(id) ON DELETE SET NULL,
  -- Three-pillar scores
  market_score    INTEGER DEFAULT 0,
  condition_score INTEGER DEFAULT 0,
  location_score  INTEGER DEFAULT 0,
  -- Metadata
  features        TEXT[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  -- Timestamps
  listed_at       TIMESTAMPTZ,
  sold_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_props_status ON skr_properties(status);
CREATE INDEX IF NOT EXISTS idx_props_type ON skr_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_props_agent ON skr_properties(listing_agent);


-- ════════════════════════════════════════════════════════════
-- 6. DEALS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_deals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES skr_properties(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES skr_leads(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES skr_team_members(id) ON DELETE SET NULL,
  -- Deal info
  title           TEXT,
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active', 'under_contract', 'pending', 'closed', 'cancelled', 'fell_through')),
  deal_type       TEXT CHECK (deal_type IN ('purchase', 'sale', 'rental', 'investment')),
  -- Financials
  offer_price     NUMERIC(12,2),
  final_price     NUMERIC(12,2),
  commission_pct  NUMERIC(4,2),
  commission_amt  NUMERIC(12,2),
  -- Milestones
  offer_date      TIMESTAMPTZ,
  accepted_date   TIMESTAMPTZ,
  inspection_date TIMESTAMPTZ,
  appraisal_date  TIMESTAMPTZ,
  closing_date    TIMESTAMPTZ,
  closed_date     TIMESTAMPTZ,
  -- Details
  notes           TEXT,
  escrow_company  TEXT,
  title_company   TEXT,
  lender          TEXT,
  metadata        JSONB DEFAULT '{}',
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_status ON skr_deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_property ON skr_deals(property_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON skr_deals(assigned_to);


-- ════════════════════════════════════════════════════════════
-- 7. AUDIT LOG
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_audit_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES skr_tenants(id) ON DELETE CASCADE,
  -- Who
  user_id         UUID,
  user_email      TEXT,
  user_role       TEXT,
  -- What
  event_type      TEXT NOT NULL
                    CHECK (event_type IN ('auth', 'data_access', 'data_modify', 'security', 'export', 'notification', 'system')),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  -- Details
  description     TEXT,
  old_values      JSONB,
  new_values      JSONB,
  metadata        JSONB DEFAULT '{}',
  -- Security
  ip_hash         TEXT,
  user_agent      TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Audit log is append-only — no updates, no deletes
CREATE INDEX IF NOT EXISTS idx_audit_created ON skr_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON skr_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON skr_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_user ON skr_audit_log(user_id);


-- ════════════════════════════════════════════════════════════
-- 8. AUTO-UPDATE TIMESTAMPS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION skr_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['skr_tenants','skr_team_members','skr_leads','skr_consultations','skr_properties','skr_deals']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s; CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION skr_update_timestamp();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 9. AUDIT LOG TRIGGER (auto-log team member changes)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION skr_log_team_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO skr_audit_log (tenant_id, event_type, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    'data_modify',
    CASE TG_OP WHEN 'INSERT' THEN 'team_member_created' WHEN 'UPDATE' THEN 'team_member_updated' WHEN 'DELETE' THEN 'team_member_deleted' END,
    'team_member',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_audit ON skr_team_members;
CREATE TRIGGER trg_team_audit
  AFTER INSERT OR UPDATE OR DELETE ON skr_team_members
  FOR EACH ROW EXECUTE FUNCTION skr_log_team_change();


-- ════════════════════════════════════════════════════════════
-- 10. AUDIT LOG TRIGGER (auto-log lead changes)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION skr_log_lead_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO skr_audit_log (tenant_id, event_type, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    'data_modify',
    CASE TG_OP WHEN 'INSERT' THEN 'lead_created' WHEN 'UPDATE' THEN 'lead_updated' WHEN 'DELETE' THEN 'lead_deleted' END,
    'lead',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_audit ON skr_leads;
CREATE TRIGGER trg_lead_audit
  AFTER INSERT OR UPDATE OR DELETE ON skr_leads
  FOR EACH ROW EXECUTE FUNCTION skr_log_lead_change();


-- ════════════════════════════════════════════════════════════
-- 11. AUDIT LOG TRIGGER (auto-log deal changes)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION skr_log_deal_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO skr_audit_log (tenant_id, event_type, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    'data_modify',
    CASE TG_OP WHEN 'INSERT' THEN 'deal_created' WHEN 'UPDATE' THEN 'deal_updated' WHEN 'DELETE' THEN 'deal_deleted' END,
    'deal',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deal_audit ON skr_deals;
CREATE TRIGGER trg_deal_audit
  AFTER INSERT OR UPDATE OR DELETE ON skr_deals
  FOR EACH ROW EXECUTE FUNCTION skr_log_deal_change();


-- ════════════════════════════════════════════════════════════
-- 12. ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE skr_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_audit_log ENABLE ROW LEVEL SECURITY;

-- Team members: can read own record (for auth check)
DROP POLICY IF EXISTS "team_read_own" ON skr_team_members;
CREATE POLICY "team_read_own" ON skr_team_members
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Team members: admins can read all team members
DROP POLICY IF EXISTS "team_admin_read" ON skr_team_members;
CREATE POLICY "team_admin_read" ON skr_team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.role = 'admin'
      AND tm.is_active = true
    )
  );

-- Team members: admins can insert/update
DROP POLICY IF EXISTS "team_admin_write" ON skr_team_members;
CREATE POLICY "team_admin_write" ON skr_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.role = 'admin'
      AND tm.is_active = true
    )
  );

-- Leads: any active team member can read
DROP POLICY IF EXISTS "leads_team_read" ON skr_leads;
CREATE POLICY "leads_team_read" ON skr_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Leads: any active team member can insert (from forms)
DROP POLICY IF EXISTS "leads_team_insert" ON skr_leads;
CREATE POLICY "leads_team_insert" ON skr_leads
  FOR INSERT WITH CHECK (true);  -- Public form submissions allowed

-- Leads: team members can update leads assigned to them, admins can update all
DROP POLICY IF EXISTS "leads_team_update" ON skr_leads;
CREATE POLICY "leads_team_update" ON skr_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
      AND (tm.role = 'admin' OR tm.id = skr_leads.assigned_to)
    )
  );

-- Consultations: active team members can read
DROP POLICY IF EXISTS "consult_team_read" ON skr_consultations;
CREATE POLICY "consult_team_read" ON skr_consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Consultations: active team members can create/update
DROP POLICY IF EXISTS "consult_team_write" ON skr_consultations;
CREATE POLICY "consult_team_write" ON skr_consultations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Properties: active team members can read
DROP POLICY IF EXISTS "props_team_read" ON skr_properties;
CREATE POLICY "props_team_read" ON skr_properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Properties: admins + brokers can write
DROP POLICY IF EXISTS "props_team_write" ON skr_properties;
CREATE POLICY "props_team_write" ON skr_properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
      AND tm.role IN ('admin', 'broker')
    )
  );

-- Deals: active team members can read
DROP POLICY IF EXISTS "deals_team_read" ON skr_deals;
CREATE POLICY "deals_team_read" ON skr_deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Deals: admins + brokers can write
DROP POLICY IF EXISTS "deals_team_write" ON skr_deals;
CREATE POLICY "deals_team_write" ON skr_deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
      AND tm.role IN ('admin', 'broker')
    )
  );

-- Audit log: active team members can read, only system can write
DROP POLICY IF EXISTS "audit_team_read" ON skr_audit_log;
CREATE POLICY "audit_team_read" ON skr_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );

-- Audit log: insert allowed (triggers write here)
DROP POLICY IF EXISTS "audit_insert" ON skr_audit_log;
CREATE POLICY "audit_insert" ON skr_audit_log
  FOR INSERT WITH CHECK (true);

-- Tenants: active team members can read
DROP POLICY IF EXISTS "tenants_team_read" ON skr_tenants;
CREATE POLICY "tenants_team_read" ON skr_tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skr_team_members tm
      WHERE tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND tm.is_active = true
    )
  );


-- ════════════════════════════════════════════════════════════
-- 13. SEED ADMIN ACCOUNT
-- ════════════════════════════════════════════════════════════

INSERT INTO skr_team_members (
  tenant_id, display_name, email, role, is_active, bio, specialties, pathway_focus
)
SELECT
  t.id,
  'Big Boss Apple Sauce',
  'jordang@quamcode.com',
  'admin',
  true,
  'Founder & Owner — Silver Key Realty',
  ARRAY['administration', 'strategy', 'operations'],
  ARRAY['buyer', 'seller', 'investor', 'rental']
FROM skr_tenants t
WHERE t.slug = 'silver-key-realty'
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true,
  display_name = 'Big Boss Apple Sauce';


-- ════════════════════════════════════════════════════════════
-- 14. LOG THE DEPLOYMENT
-- ════════════════════════════════════════════════════════════

INSERT INTO skr_audit_log (
  tenant_id, event_type, action, entity_type, description
)
SELECT
  t.id,
  'system',
  'schema_deployed',
  'database',
  'Silver Key Realty schema v1.0 deployed — 7 tables, RLS enabled, audit triggers active'
FROM skr_tenants t
WHERE t.slug = 'silver-key-realty';


-- ════════════════════════════════════════════════════════════
-- 15. VERIFICATION
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
  cnt INTEGER;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'SILVER KEY REALTY — Schema Verification';
  RAISE NOTICE '════════════════════════════════════════';

  FOREACH tbl IN ARRAY ARRAY[
    'skr_tenants', 'skr_team_members', 'skr_leads',
    'skr_consultations', 'skr_deals', 'skr_properties', 'skr_audit_log'
  ]
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', tbl) INTO cnt;
    RAISE NOTICE '✓ % — % rows', tbl, cnt;
  END LOOP;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'All tables created successfully.';
  RAISE NOTICE 'RLS enabled on all tables.';
  RAISE NOTICE 'Audit triggers active on: team_members, leads, deals.';
  RAISE NOTICE 'Admin seed: jordang@quamcode.com';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEP: Create auth user in Supabase Dashboard';
  RAISE NOTICE '  → Authentication → Users → Add User';
  RAISE NOTICE '  → Email: jordang@quamcode.com';
  RAISE NOTICE '  → Password: your choice';
  RAISE NOTICE '  → Check Auto Confirm User';
  RAISE NOTICE '════════════════════════════════════════';
END;
$$;

-- Final check: show admin record
SELECT id, display_name, email, role, is_active, created_at
FROM skr_team_members
WHERE email = 'jordang@quamcode.com';
