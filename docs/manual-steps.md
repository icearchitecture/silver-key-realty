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

## DONE CHECKLIST

- [ ] Run notifications SQL in Supabase SQL Editor
- [ ] Paste Magic Link template
- [ ] Paste Confirm Sign Up template
- [ ] Paste Reset Password template
- [ ] Paste Change Email template
- [ ] Set up SMTP (so emails come from Silver Key, not Supabase)
