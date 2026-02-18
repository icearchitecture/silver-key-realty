-- ============================================================================
-- SEED: Dana's Broker Account
-- Run in Supabase SQL Editor
-- ============================================================================
-- STEP 1: Create auth user for Dana first
--   Supabase → Authentication → Users → Add User
--   Email: dana@silverkeyrealty.llc  (or her personal email until mailbox is live)
--   Password: (her choice)
--   Check "Auto Confirm User"
--
-- STEP 2: Then run this SQL

DO $$
DECLARE
  v_tenant_id UUID;
  v_auth_user_id UUID;
  v_broker_role_id UUID;
BEGIN
  -- Get tenant
  SELECT id INTO v_tenant_id FROM skr_tenants LIMIT 1;

  -- Get Dana's auth user — UPDATE THIS EMAIL to match what you created
  SELECT id INTO v_auth_user_id FROM auth.users
    WHERE email = 'dana@silverkeyrealty.llc' LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user for Dana not found. Create her user in Supabase Authentication first, then update the email in this script.';
  END IF;

  -- Get broker role
  SELECT id INTO v_broker_role_id FROM skr_roles WHERE role_name = 'broker' LIMIT 1;

  IF v_broker_role_id IS NULL THEN
    RAISE EXCEPTION 'Broker role not found. Run the auth schema SQL first.';
  END IF;

  -- Create team member
  INSERT INTO skr_team_members (
    tenant_id, auth_user_id, role_id, first_name, last_name,
    display_name, email, is_active
  ) VALUES (
    v_tenant_id, v_auth_user_id, v_broker_role_id,
    'Dana', '',
    'Dana',
    'dana@silverkeyrealty.llc',
    TRUE
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    display_name = EXCLUDED.display_name,
    is_active = TRUE;

  RAISE NOTICE 'Dana broker account ready — tenant: %, user: %', v_tenant_id, v_auth_user_id;
END $$;
