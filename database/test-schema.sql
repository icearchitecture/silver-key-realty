-- ============================================================
-- SILVER KEY REALTY — DATABASE SCHEMA TEST
-- Run this to verify tables, data, relationships, and policies
-- ============================================================

-- 1) TABLE STRUCTURE CHECK
-- Shows all Silver Key tables and their column counts
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
ORDER BY table_name;

-- 2) ROW COUNTS
-- Shows how many records are in each table
SELECT 'team_members' as table_name, COUNT(*) as row_count FROM team_members
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'lead_activity', COUNT(*) FROM lead_activity
UNION ALL
SELECT 'consultations', COUNT(*) FROM consultations
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'lead_property_interest', COUNT(*) FROM lead_property_interest;

-- 3) TEAM MEMBERS SUMMARY
-- Shows all team members and their roles
SELECT 
  id,
  name,
  email,
  role,
  is_active,
  created_at
FROM team_members
ORDER BY created_at DESC;

-- 4) LEADS SUMMARY
-- Shows lead counts by pathway and status
SELECT 
  pathway,
  status,
  COUNT(*) as count,
  AVG(lead_score) as avg_score,
  MIN(created_at) as first_lead,
  MAX(created_at) as last_lead
FROM leads
WHERE archived = FALSE
GROUP BY pathway, status
ORDER BY pathway, status;

-- 5) RECENT LEADS (ENCRYPTED DATA CHECK)
-- Shows recent leads (PII is encrypted, so you'll see bytea)
SELECT 
  id,
  pathway,
  status,
  email_hash,
  lead_score,
  assigned_to,
  created_at,
  CASE 
    WHEN name_encrypted IS NOT NULL THEN 'ENCRYPTED' 
    ELSE 'NULL' 
  END as name_status,
  CASE 
    WHEN email_encrypted IS NOT NULL THEN 'ENCRYPTED' 
    ELSE 'NULL' 
  END as email_status,
  CASE 
    WHEN message_encrypted IS NOT NULL THEN 'ENCRYPTED' 
    ELSE 'NULL' 
  END as message_status
FROM leads
ORDER BY created_at DESC
LIMIT 10;

-- 6) LEAD ACTIVITY TIMELINE
-- Shows most recent activity across all leads
SELECT 
  la.id,
  la.lead_id,
  l.pathway,
  l.status,
  la.activity_type,
  la.description,
  la.performed_by_system,
  la.created_at
FROM lead_activity la
JOIN leads l ON la.lead_id = l.id
ORDER BY la.created_at DESC
LIMIT 20;

-- 7) CONSULTATIONS SUMMARY
-- Shows consultation counts by status and pathway
SELECT 
  pathway,
  status,
  meeting_type,
  COUNT(*) as count,
  MIN(scheduled_at) as earliest,
  MAX(scheduled_at) as latest
FROM consultations
GROUP BY pathway, status, meeting_type
ORDER BY pathway, status;

-- 8) PROPERTIES SUMMARY
-- Shows property counts by type, status, and visibility
SELECT 
  property_type,
  status,
  is_public,
  featured,
  COUNT(*) as count,
  AVG(structure_score) as avg_structure,
  AVG(experience_score) as avg_experience,
  AVG(community_score) as avg_community
FROM properties
GROUP BY property_type, status, is_public, featured
ORDER BY property_type, status;

-- 9) PROPERTY INTEREST SUMMARY
-- Shows lead interest levels across properties
SELECT 
  interest_level,
  COUNT(*) as count,
  COUNT(DISTINCT lead_id) as unique_leads,
  COUNT(DISTINCT property_id) as unique_properties
FROM lead_property_interest
GROUP BY interest_level
ORDER BY interest_level;

-- 10) RELATIONSHIP INTEGRITY CHECK
-- Verifies foreign key relationships
SELECT 
  'leads → team_members' as relationship,
  COUNT(*) as records_with_fk,
  COUNT(DISTINCT assigned_to) as unique_fk_values
FROM leads
WHERE assigned_to IS NOT NULL
UNION ALL
SELECT 
  'lead_activity → leads',
  COUNT(*),
  COUNT(DISTINCT lead_id)
FROM lead_activity
UNION ALL
SELECT 
  'consultations → leads',
  COUNT(*),
  COUNT(DISTINCT lead_id)
FROM consultations
UNION ALL
SELECT 
  'lead_property_interest → leads',
  COUNT(*),
  COUNT(DISTINCT lead_id)
FROM lead_property_interest
UNION ALL
SELECT 
  'lead_property_interest → properties',
  COUNT(*),
  COUNT(DISTINCT property_id)
FROM lead_property_interest;

-- 11) INDEX VERIFICATION
-- Shows all indexes on Silver Key tables
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
ORDER BY tablename, indexname;

-- 12) ROW LEVEL SECURITY CHECK
-- Verifies RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
ORDER BY tablename;

-- 13) POLICIES CHECK
-- Shows all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
ORDER BY tablename, policyname;

-- 14) TRIGGER CHECK
-- Shows all triggers on Silver Key tables
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
ORDER BY event_object_table, trigger_name;

-- 15) TIMESTAMP FRESHNESS CHECK
-- Shows when tables were last updated
SELECT 
  'leads' as table_name,
  MAX(updated_at) as last_update,
  MAX(created_at) as last_insert
FROM leads
UNION ALL
SELECT 
  'consultations',
  MAX(updated_at),
  MAX(created_at)
FROM consultations
UNION ALL
SELECT 
  'properties',
  MAX(updated_at),
  MAX(created_at)
FROM properties
UNION ALL
SELECT 
  'lead_activity',
  NULL as last_update,
  MAX(created_at)
FROM lead_activity;

-- 16) DATA QUALITY CHECK
-- Identifies potential data issues
SELECT 
  'Leads without email hash' as issue,
  COUNT(*) as count
FROM leads
WHERE email_hash IS NULL OR email_hash = ''
UNION ALL
SELECT 
  'Leads with invalid status',
  COUNT(*)
FROM leads
WHERE status NOT IN ('new', 'contacted', 'qualified', 'consultation_scheduled', 'active_client', 'closed_won', 'closed_lost', 'nurture', 'unresponsive', 'disqualified')
UNION ALL
SELECT 
  'Leads with invalid pathway',
  COUNT(*)
FROM leads
WHERE pathway NOT IN ('buyer', 'seller', 'investor', 'rental', 'general')
UNION ALL
SELECT 
  'Consultations in past with scheduled status',
  COUNT(*)
FROM consultations
WHERE status = 'scheduled' AND scheduled_at < NOW()
UNION ALL
SELECT 
  'Properties with invalid scores',
  COUNT(*)
FROM properties
WHERE structure_score IS NOT NULL AND (structure_score < 1 OR structure_score > 10)
   OR experience_score IS NOT NULL AND (experience_score < 1 OR experience_score > 10)
   OR community_score IS NOT NULL AND (community_score < 1 OR community_score > 10);
