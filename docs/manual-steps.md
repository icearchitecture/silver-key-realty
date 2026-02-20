# Silver Key Realty — Manual Steps (Copy-Paste Ready)

---

## STEP 1: Run this SQL in Supabase SQL Editor

```sql
CREATE TABLE IF NOT EXISTS skr_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES skr_tenants(id),
  recipient_id  UUID NOT NULL REFERENCES skr_team_members(id),
  type          TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info','success','warning','error','lead','deal','security','system')),
  title         TEXT NOT NULL,
  body          TEXT,
  link          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON skr_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON skr_notifications(tenant_id);

ALTER TABLE skr_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skr_notifications' AND policyname = 'skr_notifications_own')
  THEN CREATE POLICY skr_notifications_own ON skr_notifications FOR ALL USING (
    recipient_id IN (SELECT id FROM skr_team_members WHERE auth_user_id = auth.uid() AND is_active = TRUE)
  );
  END IF;
END $$;

SELECT 'NOTIFICATIONS TABLE CREATED' AS status;
```

---

## STEP 2: Email Templates

Go to **Supabase Dashboard > Authentication > Email Templates**

Click into each template below, replace the Subject and Body.

---

### TEMPLATE 1: Magic Link

**Subject:** `Your secure login link — Silver Key Realty`

**Body:** (paste everything below)

```html
<div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111111;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:Georgia,serif;font-size:22px;color:#F0EBE3;font-weight:normal;">Silver Key <em style="color:#C9B99A;">Realty</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.04);padding:44px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top:2px solid #3A9464;width:40px;height:1px;font-size:1px;">&nbsp;</td><td>&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Georgia,serif;font-size:24px;color:#F0EBE3;font-weight:normal;line-height:1.3;">Your secure login link</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:16px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9A8E80;line-height:1.7;">Click the button below to sign in to your Silver Key Realty account. This link expires in 10 minutes and can only be used once.</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:28px;padding-bottom:28px;">
                <tr><td><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:#3A9464;color:#F0EBE3;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Sign In Securely</a></td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7A6E60;line-height:1.6;">If you didn't request this link, you can safely ignore this email. Your account security is our priority.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="font-family:Georgia,serif;font-size:14px;color:#C9B99A;padding-bottom:6px;">Silver Key Realty</td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#7A6E60;">silverkeyrealty.llc · Pontiac, Michigan</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

### TEMPLATE 2: Confirm Sign Up

**Subject:** `Welcome to Silver Key Realty — Confirm your account`

**Body:** (paste everything below)

```html
<div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111111;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:Georgia,serif;font-size:22px;color:#F0EBE3;font-weight:normal;">Silver Key <em style="color:#C9B99A;">Realty</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.04);padding:44px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top:2px solid #3A9464;width:40px;height:1px;font-size:1px;">&nbsp;</td><td>&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Georgia,serif;font-size:24px;color:#F0EBE3;font-weight:normal;line-height:1.3;">Confirm your account</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:16px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9A8E80;line-height:1.7;">Welcome to Silver Key Realty. Click below to activate your account and get started.</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:28px;padding-bottom:28px;">
                <tr><td><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:#3A9464;color:#F0EBE3;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Activate Account</a></td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7A6E60;line-height:1.6;">If you didn't create this account, you can safely ignore this email.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="font-family:Georgia,serif;font-size:14px;color:#C9B99A;padding-bottom:6px;">Silver Key Realty</td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#7A6E60;">silverkeyrealty.llc · Pontiac, Michigan</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

### TEMPLATE 3: Reset Password

**Subject:** `Reset your password — Silver Key Realty`

**Body:** (paste everything below)

```html
<div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111111;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:Georgia,serif;font-size:22px;color:#F0EBE3;font-weight:normal;">Silver Key <em style="color:#C9B99A;">Realty</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.04);padding:44px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top:2px solid #3A9464;width:40px;height:1px;font-size:1px;">&nbsp;</td><td>&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Georgia,serif;font-size:24px;color:#F0EBE3;font-weight:normal;line-height:1.3;">Reset your password</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:16px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9A8E80;line-height:1.7;">We received a request to reset your password. Click below to set a new one. This link expires in 1 hour.</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:28px;padding-bottom:28px;">
                <tr><td><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:#3A9464;color:#F0EBE3;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Set New Password</a></td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7A6E60;line-height:1.6;">If you didn't request a password reset, you can safely ignore this email. Your current password will remain unchanged.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="font-family:Georgia,serif;font-size:14px;color:#C9B99A;padding-bottom:6px;">Silver Key Realty</td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#7A6E60;">silverkeyrealty.llc · Pontiac, Michigan</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

### TEMPLATE 4: Change Email Address

**Subject:** `Confirm your new email — Silver Key Realty`

**Body:** (paste everything below)

```html
<div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111111;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:Georgia,serif;font-size:22px;color:#F0EBE3;font-weight:normal;">Silver Key <em style="color:#C9B99A;">Realty</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.04);padding:44px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top:2px solid #3A9464;width:40px;height:1px;font-size:1px;">&nbsp;</td><td>&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Georgia,serif;font-size:24px;color:#F0EBE3;font-weight:normal;line-height:1.3;">Confirm your new email</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:16px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9A8E80;line-height:1.7;">Click below to confirm your email address change for your Silver Key Realty account.</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:28px;padding-bottom:28px;">
                <tr><td><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:#3A9464;color:#F0EBE3;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Confirm Email</a></td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:20px;">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7A6E60;line-height:1.6;">If you didn't request this change, please contact your administrator immediately.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="font-family:Georgia,serif;font-size:14px;color:#C9B99A;padding-bottom:6px;">Silver Key Realty</td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#7A6E60;">silverkeyrealty.llc · Pontiac, Michigan</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

## STEP 3: Add Pathway Columns to skr_leads (if not already present)

Run this SQL to add the new pathway intake columns:

```sql
ALTER TABLE skr_leads ADD COLUMN IF NOT EXISTS pathway TEXT DEFAULT 'general';
ALTER TABLE skr_leads ADD COLUMN IF NOT EXISTS intake_data JSONB DEFAULT '{}';

COMMENT ON COLUMN skr_leads.pathway IS 'Pathway type: buyer, seller, investor, renter, agent, general';
COMMENT ON COLUMN skr_leads.intake_data IS 'Pathway-specific intake form data as JSON';

SELECT 'PATHWAY COLUMNS ADDED' AS status;
```

---

## STEP 4: Create documents-incoming Storage Bucket

In Supabase Dashboard > Storage:

1. Click "New bucket"
2. Name: `documents-incoming`
3. Public: **No** (private bucket)
4. File size limit: 10MB
5. Allowed MIME types: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/png`

---

## STEP 5: Team Page RLS Policies + Invitations Table

Run in Supabase SQL Editor to fix the Team page "Loading..." issue and enable the invitation system:

```sql
-- ════════════════════════════════════════════════════════════
-- FIX: Team page RLS policies
-- Allow authenticated users to read team members + roles
-- ════════════════════════════════════════════════════════════

ALTER TABLE skr_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skr_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_own_tenant" ON skr_team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON skr_team_members;
DROP POLICY IF EXISTS "team_members_update_admin" ON skr_team_members;
DROP POLICY IF EXISTS "roles_select_authenticated" ON skr_roles;

CREATE POLICY "team_members_select_own_tenant" ON skr_team_members
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "team_members_insert_admin" ON skr_team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id FROM skr_team_members tm
      JOIN skr_roles r ON tm.role_id = r.id
      WHERE tm.auth_user_id = auth.uid()
      AND r.permission_level >= 50
    )
  );

CREATE POLICY "team_members_update_admin" ON skr_team_members
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM skr_team_members tm
      JOIN skr_roles r ON tm.role_id = r.id
      WHERE tm.auth_user_id = auth.uid()
      AND r.permission_level >= 50
    )
  );

CREATE POLICY "roles_select_authenticated" ON skr_roles
  FOR SELECT TO authenticated
  USING (true);

-- ════════════════════════════════════════════════════════════
-- Invitations table (team invitation flow)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES skr_tenants(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role_id UUID REFERENCES skr_roles(id),
  title TEXT,
  invited_by UUID REFERENCES skr_team_members(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skr_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select_own_tenant" ON skr_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON skr_invitations;
DROP POLICY IF EXISTS "invitations_update_admin" ON skr_invitations;

CREATE POLICY "invitations_select_own_tenant" ON skr_invitations
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "invitations_insert_admin" ON skr_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id FROM skr_team_members tm
      JOIN skr_roles r ON tm.role_id = r.id
      WHERE tm.auth_user_id = auth.uid()
      AND r.permission_level >= 50
    )
  );

CREATE POLICY "invitations_update_admin" ON skr_invitations
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM skr_team_members tm
      JOIN skr_roles r ON tm.role_id = r.id
      WHERE tm.auth_user_id = auth.uid()
      AND r.permission_level >= 50
    )
  );

SELECT 'RLS POLICIES + INVITATIONS TABLE CREATED' AS status;
```

---

## STEP 6: Workspace Notes Table

Run in Supabase SQL Editor to enable workspace document saving:

```sql
-- ════════════════════════════════════════════════════════════
-- Workspace notes table for saved documents
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skr_workspace_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES skr_tenants(id),
  created_by UUID REFERENCES skr_team_members(id),
  title TEXT,
  content TEXT,
  note_type TEXT DEFAULT 'document' CHECK (note_type IN ('document', 'note', 'template', 'email_draft')),
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skr_workspace_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_notes_select_own_tenant" ON skr_workspace_notes;
DROP POLICY IF EXISTS "workspace_notes_insert_authenticated" ON skr_workspace_notes;
DROP POLICY IF EXISTS "workspace_notes_update_own" ON skr_workspace_notes;
DROP POLICY IF EXISTS "workspace_notes_delete_own" ON skr_workspace_notes;

CREATE POLICY "workspace_notes_select_own_tenant" ON skr_workspace_notes
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_notes_insert_authenticated" ON skr_workspace_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_notes_update_own" ON skr_workspace_notes
  FOR UPDATE TO authenticated
  USING (
    created_by IN (
      SELECT id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_notes_delete_own" ON skr_workspace_notes
  FOR DELETE TO authenticated
  USING (
    created_by IN (
      SELECT id FROM skr_team_members
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_workspace_notes_tenant ON skr_workspace_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_created_by ON skr_workspace_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_type ON skr_workspace_notes(note_type);

SELECT 'WORKSPACE NOTES TABLE CREATED' AS status;
```

---

## DONE CHECKLIST

- [ ] Run notifications SQL in Supabase SQL Editor (Step 1)
- [ ] Run pathway columns SQL in Supabase SQL Editor (Step 3)
- [ ] Create documents-incoming storage bucket (Step 4)
- [ ] Run Team RLS + Invitations SQL in Supabase SQL Editor (Step 5)
- [ ] Run Workspace Notes SQL in Supabase SQL Editor (Step 6)
- [ ] Paste Magic Link template (Step 2)
- [ ] Paste Confirm Sign Up template (Step 2)
- [ ] Paste Reset Password template (Step 2)
- [ ] Paste Change Email template (Step 2)
- [ ] Set up SMTP (so emails come from Silver Key, not Supabase)
- [ ] Verify Azure OpenAI env vars in Vercel (see below)

### Azure OpenAI Environment Variables (Vercel)

Verify these are set in Vercel Production environment:
- `Silver_key_realty_AZURE_OPENAI_ENDPOINT` — full URL like `https://silver-key-realty.openai.azure.com`
- `SKR_AZURE_OPENAI_DEPLOYMENT` — deployment name (e.g., `gpt-4o`)
- `SKR_AZURE_API_VERSION` — e.g., `2024-08-01-preview`
- One of: `SKR_AZURE_OPENAI_KEY`, `Silver_key_realty_AZURE_OPENAI_KEY`, or `AZURE_OPENAI_API_KEY`
