CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'broker', 'agent', 'assistant')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_encrypted    BYTEA NOT NULL,
  email_encrypted   BYTEA NOT NULL,
  phone_encrypted   BYTEA,
  email_hash        TEXT NOT NULL,
  phone_hash        TEXT,
  pathway           TEXT NOT NULL CHECK (pathway IN ('buyer', 'seller', 'investor', 'rental', 'general')),
  source_page       TEXT,
  referral_source   TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  message_encrypted BYTEA,
  status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'qualified', 'consultation_scheduled',
    'active_client', 'closed_won', 'closed_lost',
    'nurture', 'unresponsive', 'disqualified'
  )),
  assigned_to       UUID REFERENCES team_members(id),
  lead_score        INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_contact_at  TIMESTAMPTZ,
  last_activity_at  TIMESTAMPTZ,
  archived          BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at       TIMESTAMPTZ
);

CREATE INDEX idx_leads_email_hash ON leads(email_hash);
CREATE INDEX idx_leads_phone_hash ON leads(phone_hash);
CREATE INDEX idx_leads_pathway ON leads(pathway);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_assigned ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_active ON leads(status, pathway) WHERE archived = FALSE;

CREATE TABLE lead_activity (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type       TEXT NOT NULL CHECK (activity_type IN (
    'created', 'status_change', 'note_added', 'email_sent',
    'call_logged', 'consultation_scheduled', 'document_shared',
    'assigned', 'score_updated', 'archived', 'restored'
  )),
  description         TEXT,
  old_value           TEXT,
  new_value           TEXT,
  performed_by        UUID REFERENCES team_members(id),
  performed_by_system BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash             TEXT
);

CREATE INDEX idx_activity_lead ON lead_activity(lead_id, created_at DESC);
CREATE INDEX idx_activity_type ON lead_activity(activity_type);

CREATE TABLE consultations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  pathway           TEXT NOT NULL CHECK (pathway IN ('buyer', 'seller', 'investor', 'rental', 'general')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER DEFAULT 30,
  status            TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'
  )),
  notes_encrypted   BYTEA,
  meeting_type      TEXT DEFAULT 'video' CHECK (meeting_type IN ('video', 'phone', 'in_person')),
  meeting_link      TEXT,
  assigned_to       UUID REFERENCES team_members(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_consultations_lead ON consultations(lead_id);
CREATE INDEX idx_consultations_scheduled ON consultations(scheduled_at) WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX idx_consultations_assigned ON consultations(assigned_to);

CREATE TABLE properties (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  property_type     TEXT NOT NULL CHECK (property_type IN (
    'residential_lot', 'single_family', 'multi_family',
    'investment', 'partnership', 'rental'
  )),
  address_line1     TEXT,
  address_line2     TEXT,
  city              TEXT NOT NULL,
  state             TEXT NOT NULL,
  zip               TEXT,
  latitude          DECIMAL(10, 8),
  longitude         DECIMAL(11, 8),
  bedrooms          INTEGER,
  bathrooms         DECIMAL(3, 1),
  sqft              INTEGER,
  lot_sqft          INTEGER,
  year_built        INTEGER,
  structure_score   INTEGER CHECK (structure_score >= 1 AND structure_score <= 10),
  experience_score  INTEGER CHECK (experience_score >= 1 AND experience_score <= 10),
  community_score   INTEGER CHECK (community_score >= 1 AND community_score <= 10),
  price             DECIMAL(12, 2),
  price_display     TEXT,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'coming_soon', 'active', 'under_contract', 'sold', 'off_market'
  )),
  headline          TEXT,
  narrative         TEXT,
  features          JSONB DEFAULT '[]'::JSONB,
  images            JSONB DEFAULT '[]'::JSONB,
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  pathway_tags      TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_status ON properties(status) WHERE is_public = TRUE;
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_featured ON properties(featured) WHERE is_public = TRUE AND featured = TRUE;
CREATE INDEX idx_properties_pathway ON properties USING GIN(pathway_tags);
CREATE INDEX idx_properties_slug ON properties(slug);

CREATE TABLE lead_property_interest (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  interest_level  TEXT DEFAULT 'viewed' CHECK (interest_level IN (
    'viewed', 'saved', 'inquired', 'toured', 'offered'
  )),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, property_id)
);

CREATE INDEX idx_interest_lead ON lead_property_interest(lead_id);
CREATE INDEX idx_interest_property ON lead_property_interest(property_id);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_property_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to leads" ON leads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to team_members" ON team_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_activity" ON lead_activity FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to consultations" ON consultations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to properties" ON properties FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_property_interest" ON lead_property_interest FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public can view active properties" ON properties FOR SELECT USING (is_public = TRUE AND status IN ('active', 'coming_soon'));
CREATE POLICY "Anonymous can submit leads" ON leads FOR INSERT WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_activity (lead_id, activity_type, old_value, new_value, performed_by_system)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, TRUE);
  END IF;
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_status_change_log BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

CREATE OR REPLACE FUNCTION log_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_activity (lead_id, activity_type, new_value, performed_by_system)
  VALUES (NEW.id, 'created', NEW.pathway, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_creation_log AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION log_lead_creation();
