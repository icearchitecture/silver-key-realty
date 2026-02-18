-- ============================================================================
-- SEED: Branded Email Templates for Silver Key Realty
-- Run ONCE in Supabase SQL Editor
-- ============================================================================

-- Get the tenant_id for Silver Key Realty
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM skr_tenants LIMIT 1;

  -- 1. Lead Confirmation
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'Lead Confirmation — Branded',
    'lead_response',
    'Thank you for reaching out — Silver Key Realty',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#111;font-family:Arial,Helvetica,sans-serif"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111"><tr><td align="center" style="padding:40px 16px"><table role="presentation" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%"><tr><td align="center" style="padding:0 0 32px"><img src="{{LOGO_URL}}" alt="Silver Key Realty" width="120" style="display:block;width:120px;height:auto"/></td></tr><tr><td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.06);padding:40px 36px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-family:Georgia,serif;font-size:26px;color:#F0EBE3;padding-bottom:8px">Thank you, {{FIRST_NAME}}.</td></tr><tr><td style="font-size:14px;color:#8A8178;padding-bottom:28px;line-height:1.6">We received your inquiry and a member of our team will be in touch shortly.</td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);height:1px;font-size:1px;line-height:1px">&nbsp;</td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:24px"><tr><td style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#3A9464;padding-bottom:16px">YOUR INQUIRY DETAILS</td></tr><tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td width="120" style="font-size:12px;color:#8A8178;padding-bottom:8px">Pathway</td><td style="font-size:14px;color:#F0EBE3;padding-bottom:8px">{{PATHWAY}}</td></tr><tr><td width="120" style="font-size:12px;color:#8A8178;padding-bottom:8px">Name</td><td style="font-size:14px;color:#F0EBE3;padding-bottom:8px">{{FULL_NAME}}</td></tr><tr><td width="120" style="font-size:12px;color:#8A8178;padding-bottom:8px">Email</td><td style="font-size:14px;color:#F0EBE3;padding-bottom:8px">{{EMAIL}}</td></tr><tr><td width="120" style="font-size:12px;color:#8A8178">Submitted</td><td style="font-size:14px;color:#F0EBE3">{{DATE}}</td></tr></table></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);padding:20px 0 0;height:1px;font-size:1px;line-height:1px">&nbsp;</td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:24px"><tr><td style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#C9B99A;padding-bottom:12px">WHAT HAPPENS NEXT</td></tr><tr><td style="font-size:14px;color:#B8B0A8;line-height:1.7;padding-bottom:24px">A licensed agent from our team will review your inquiry and reach out within 24 hours. We will start by understanding your goals — no pressure, no rush.</td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 0"><table role="presentation"><tr><td style="background:#3A9464;padding:14px 36px"><a href="{{PORTAL_URL}}" style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;display:block">Schedule a Consultation</a></td></tr></table></td></tr></table></td></tr><tr><td style="padding:28px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="font-family:Georgia,serif;font-size:16px;color:#C9B99A;padding-bottom:8px">Silver Key Realty</td></tr><tr><td align="center" style="font-size:11px;color:#8A8178;padding-bottom:6px">Michigan''s Relationship-First Brokerage</td></tr><tr><td align="center" style="font-size:10px;color:#5A5550">silverkeyrealty.llc · Pontiac, Michigan</td></tr></table></td></tr></table></td></tr></table></body></html>',
    'Thank you, {{FIRST_NAME}}. We received your inquiry about {{PATHWAY}} and a member of our team will be in touch within 24 hours.',
    '[{"key":"{{FIRST_NAME}}","source":"lead.first_name"},{"key":"{{FULL_NAME}}","source":"lead.full_name"},{"key":"{{PATHWAY}}","source":"lead.pathway"},{"key":"{{EMAIL}}","source":"lead.email"},{"key":"{{DATE}}","source":"system.now_formatted"},{"key":"{{PORTAL_URL}}","source":"system.portal_url"},{"key":"{{LOGO_URL}}","source":"system.logo_url"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  -- 2. Agent Welcome
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'Agent Welcome — Branded',
    'onboarding',
    'Welcome to Silver Key Realty — Your account is ready',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#111;font-family:Arial,Helvetica,sans-serif"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111"><tr><td align="center" style="padding:40px 16px"><table role="presentation" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%"><tr><td align="center" style="padding:0 0 32px"><img src="{{LOGO_URL}}" alt="Silver Key Realty" width="120" style="display:block;width:120px;height:auto"/></td></tr><tr><td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.06);padding:40px 36px"><table role="presentation" width="100%"><tr><td style="font-family:Georgia,serif;font-size:26px;color:#F0EBE3;padding-bottom:8px">Welcome to the team, {{FIRST_NAME}}.</td></tr><tr><td style="font-size:14px;color:#8A8178;padding-bottom:28px;line-height:1.6">You have been invited to join Silver Key Realty as <strong style="color:#C9B99A">{{ROLE_TITLE}}</strong>. Accept your invitation to set up your account.</td></tr></table><table role="presentation" width="100%"><tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);height:1px">&nbsp;</td></tr></table><table role="presentation" width="100%" style="padding-top:24px"><tr><td style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#3A9464;padding-bottom:16px">YOUR ACCOUNT</td></tr><tr><td><table role="presentation" width="100%"><tr><td width="120" style="font-size:12px;color:#8A8178;padding-bottom:8px">Role</td><td style="font-size:14px;color:#F0EBE3;padding-bottom:8px">{{ROLE_NAME}}</td></tr><tr><td width="120" style="font-size:12px;color:#8A8178;padding-bottom:8px">Email</td><td style="font-size:14px;color:#F0EBE3;padding-bottom:8px">{{EMAIL}}</td></tr><tr><td width="120" style="font-size:12px;color:#8A8178">Platform Email</td><td style="font-size:14px;color:#3A9464">{{PLATFORM_EMAIL}}</td></tr></table></td></tr></table><table role="presentation" width="100%" style="padding-top:28px"><tr><td align="center"><table role="presentation"><tr><td style="background:#3A9464;padding:14px 36px"><a href="{{ACCEPT_URL}}" style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;display:block">Accept Invitation</a></td></tr></table></td></tr></table><table role="presentation" width="100%" style="padding-top:20px"><tr><td align="center" style="font-size:11px;color:#5A5550">This invitation expires in 7 days.</td></tr></table></td></tr><tr><td style="padding:28px 36px 0"><table role="presentation" width="100%"><tr><td align="center" style="font-family:Georgia,serif;font-size:16px;color:#C9B99A;padding-bottom:8px">Silver Key Realty</td></tr><tr><td align="center" style="font-size:10px;color:#5A5550">silverkeyrealty.llc · Pontiac, Michigan</td></tr></table></td></tr></table></td></tr></table></body></html>',
    'Welcome, {{FIRST_NAME}}! You have been invited to join Silver Key Realty as {{ROLE_TITLE}}. Accept your invitation at: {{ACCEPT_URL}}',
    '[{"key":"{{FIRST_NAME}}","source":"member.first_name"},{"key":"{{ROLE_TITLE}}","source":"member.role_title"},{"key":"{{ROLE_NAME}}","source":"member.role_name"},{"key":"{{EMAIL}}","source":"member.email"},{"key":"{{PLATFORM_EMAIL}}","source":"member.platform_email"},{"key":"{{ACCEPT_URL}}","source":"system.accept_url"},{"key":"{{LOGO_URL}}","source":"system.logo_url"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  -- 3. Password Reset
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'Password Reset — Branded',
    'system',
    'Reset your password — Silver Key Realty',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#111;font-family:Arial,Helvetica,sans-serif"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111"><tr><td align="center" style="padding:40px 16px"><table role="presentation" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%"><tr><td align="center" style="padding:0 0 32px"><img src="{{LOGO_URL}}" alt="Silver Key Realty" width="120" style="display:block;width:120px;height:auto"/></td></tr><tr><td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.06);padding:40px 36px"><table role="presentation" width="100%"><tr><td style="font-family:Georgia,serif;font-size:26px;color:#F0EBE3;padding-bottom:8px">Reset your password.</td></tr><tr><td style="font-size:14px;color:#8A8178;padding-bottom:28px;line-height:1.6">We received a request to reset the password for your Silver Key Realty account.</td></tr></table><table role="presentation" width="100%"><tr><td align="center" style="padding:8px 0 28px"><table role="presentation"><tr><td style="background:#3A9464;padding:14px 36px"><a href="{{RESET_URL}}" style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;display:block">Set New Password</a></td></tr></table></td></tr></table><table role="presentation" width="100%"><tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);height:1px">&nbsp;</td></tr></table><table role="presentation" width="100%" style="padding-top:20px"><tr><td style="font-size:12px;color:#5A5550;line-height:1.6">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</td></tr></table></td></tr><tr><td style="padding:28px 36px 0"><table role="presentation" width="100%"><tr><td align="center" style="font-family:Georgia,serif;font-size:16px;color:#C9B99A;padding-bottom:8px">Silver Key Realty</td></tr><tr><td align="center" style="font-size:10px;color:#5A5550">silverkeyrealty.llc · Pontiac, Michigan</td></tr></table></td></tr></table></td></tr></table></body></html>',
    'Reset your Silver Key Realty password: {{RESET_URL}} — This link expires in 1 hour.',
    '[{"key":"{{RESET_URL}}","source":"system.reset_url"},{"key":"{{LOGO_URL}}","source":"system.logo_url"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  -- 4. Showing Confirmation
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'Showing Confirmation — Branded',
    'showing_confirm',
    'Showing confirmed — {{ADDRESS}} at {{TIME}}',
    '<!-- Showing confirmation template - uses same dark branded layout -->',
    'Your showing at {{ADDRESS}} is confirmed for {{SHOWING_DATE}} at {{SHOWING_TIME}} with {{AGENT_NAME}}.',
    '[{"key":"{{ADDRESS}}","source":"showing.address"},{"key":"{{SHOWING_DATE}}","source":"showing.date"},{"key":"{{SHOWING_TIME}}","source":"showing.time"},{"key":"{{AGENT_NAME}}","source":"showing.agent_name"},{"key":"{{AGENT_EMAIL}}","source":"showing.agent_email"},{"key":"{{TIME}}","source":"showing.time"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  -- 5. Deal Status Update
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'Deal Status Update — Branded',
    'offer_accepted',
    'Your deal has moved to {{NEW_STATUS}} — Silver Key Realty',
    '<!-- Deal update template - uses same dark branded layout -->',
    'Great news! Your deal at {{PROPERTY_ADDRESS}} has moved from {{OLD_STATUS}} to {{NEW_STATUS}}.',
    '[{"key":"{{PROPERTY_ADDRESS}}","source":"deal.address"},{"key":"{{NEW_STATUS}}","source":"deal.new_status"},{"key":"{{OLD_STATUS}}","source":"deal.old_status"},{"key":"{{DATE}}","source":"system.now_formatted"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  -- 6. General Notification
  INSERT INTO skr_email_templates_v2 (tenant_id, name, category, subject_template, body_html_template, body_text_template, variables, is_system, is_active)
  VALUES (
    v_tenant_id,
    'General Notification — Branded',
    'system',
    '{{TITLE}} — Silver Key Realty',
    '<!-- General notification template - uses same dark branded layout -->',
    '{{TITLE}}: {{MESSAGE}}',
    '[{"key":"{{TITLE}}","source":"notification.title"},{"key":"{{MESSAGE}}","source":"notification.message"},{"key":"{{CTA_TEXT}}","source":"notification.cta_text"},{"key":"{{CTA_URL}}","source":"notification.cta_url"}]'::jsonb,
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded 6 branded email templates for tenant %', v_tenant_id;
END $$;
