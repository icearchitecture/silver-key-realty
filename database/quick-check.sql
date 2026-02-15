-- ============================================================
-- SILVER KEY REALTY — QUICK DATABASE CHECK
-- Fast verification of schema health
-- ============================================================

-- OVERALL STATUS
SELECT 
  'TABLES' as check_type,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')) as expected_6,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')) = 6 
    THEN '✓ ALL PRESENT' 
    ELSE '✗ MISSING TABLES' 
  END as status
UNION ALL
SELECT 
  'RLS ENABLED',
  (SELECT COUNT(*) FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
   AND rowsecurity = true),
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')
          AND rowsecurity = true) = 6 
    THEN '✓ ALL SECURED' 
    ELSE '✗ MISSING RLS' 
  END
UNION ALL
SELECT 
  'INDEXES',
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN ('team_members', 'leads', 'lead_activity', 'consultations', 'properties', 'lead_property_interest')),
  '✓ PRESENT'
UNION ALL
SELECT 
  'TRIGGERS',
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE event_object_schema = 'public' 
   AND event_object_table IN ('leads', 'consultations', 'properties')),
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.triggers 
          WHERE event_object_schema = 'public' 
          AND event_object_table IN ('leads', 'consultations', 'properties')) >= 5 
    THEN '✓ ALL PRESENT' 
    ELSE '✗ MISSING TRIGGERS' 
  END;

-- DATA COUNTS
SELECT 
  'team_members' as table_name,
  COUNT(*) as records,
  CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END as status
FROM team_members
UNION ALL
SELECT 'leads', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END FROM leads
UNION ALL
SELECT 'lead_activity', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END FROM lead_activity
UNION ALL
SELECT 'consultations', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END FROM consultations
UNION ALL
SELECT 'properties', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END FROM properties
UNION ALL
SELECT 'lead_property_interest', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ HAS DATA' ELSE '○ EMPTY' END FROM lead_property_interest;

-- ENCRYPTION CHECK (verify PII is actually encrypted)
SELECT 
  id,
  pathway,
  status,
  CASE 
    WHEN name_encrypted IS NOT NULL THEN '✓ ENCRYPTED' 
    ELSE '✗ NOT ENCRYPTED' 
  END as name_check,
  CASE 
    WHEN email_encrypted IS NOT NULL THEN '✓ ENCRYPTED' 
    ELSE '✗ NOT ENCRYPTED' 
  END as email_check,
  CASE 
    WHEN email_hash IS NOT NULL THEN '✓ HASHED' 
    ELSE '✗ NO HASH' 
  END as hash_check,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 5;
