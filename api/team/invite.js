import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, first_name, last_name, skr_roles!inner(role_name, permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.skr_roles.permission_level < 50) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const { email, first_name, last_name, role_id, title } = req.body;
  if (!email || !role_id) return res.status(400).json({ error: "email and role_id are required" });

  try {
    const { data: existing } = await supabase
      .from("skr_invitations")
      .select("id")
      .eq("email", email)
      .eq("tenant_id", member.tenant_id)
      .eq("status", "pending")
      .single();

    if (existing) {
      return res.status(409).json({ error: "Pending invitation already exists for this email" });
    }

    const { data: existingMember } = await supabase
      .from("skr_team_members")
      .select("id")
      .eq("email", email)
      .eq("tenant_id", member.tenant_id)
      .single();

    if (existingMember) {
      return res.status(409).json({ error: "This person is already a team member" });
    }

    const { data: role } = await supabase
      .from("skr_roles")
      .select("role_name")
      .eq("id", role_id)
      .single();

    const { data: invitation, error: invError } = await supabase
      .from("skr_invitations")
      .insert({
        tenant_id: member.tenant_id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        role_id,
        title: title || null,
        invited_by: member.id,
      })
      .select()
      .single();

    if (invError) throw invError;

    if (process.env.AZURE_COMM_CONNECTION_STRING) {
      try {
        const { EmailClient } = await import("@azure/communication-email");
        const emailClient = new EmailClient(process.env.AZURE_COMM_CONNECTION_STRING);

        const inviteUrl = `https://silverkeyrealty.llc/admin/?invite=${invitation.token}`;
        const inviterName = `${member.first_name} ${member.last_name}`;

        const htmlContent = buildInvitationEmail({
          recipientName: first_name || email.split("@")[0],
          inviterName,
          roleName: role?.role_name || "Team Member",
          titleName: title || "",
          inviteUrl,
        });

        await emailClient.beginSend({
          senderAddress: process.env.AZURE_EMAIL_SENDER || "noreply@silverkeyrealty.llc",
          content: {
            subject: `${inviterName} invited you to join Silver Key Realty`,
            html: htmlContent,
            plainText: `${inviterName} has invited you to join Silver Key Realty as a ${role?.role_name || "team member"}. Accept your invitation: ${inviteUrl}`,
          },
          recipients: {
            to: [{ address: email, displayName: first_name ? `${first_name} ${last_name || ""}`.trim() : "" }],
          },
        });
      } catch (emailErr) {
        console.error("Invitation email failed:", emailErr);
      }
    }

    return res.status(200).json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Invite error:", error);
    return res.status(500).json({ error: "Failed to create invitation", details: error.message });
  }
}

function buildInvitationEmail({ recipientName, inviterName, roleName, titleName, inviteUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111111;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.04);">
        <tr><td style="padding:40px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="font-family:Georgia,serif;font-size:20px;color:#F0EBE3;">
            Silver Key <span style="color:#C9B99A;font-style:italic;">Realty</span>
          </div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#F0EBE3;margin:0 0 24px;">
            You've been <span style="color:#C9B99A;font-style:italic;">invited</span>
          </h1>
          <p style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:15px;color:#9A8E80;line-height:1.7;margin:0 0 16px;">
            ${recipientName},
          </p>
          <p style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:15px;color:#9A8E80;line-height:1.7;margin:0 0 24px;">
            ${inviterName} has invited you to join the Silver Key Realty platform
            as <strong style="color:#C9B99A;">${roleName}</strong>${titleName ? ' — ' + titleName : ''}.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td style="background:#3A9464;padding:14px 32px;">
              <a href="${inviteUrl}" style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:12px;color:#ffffff;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:12px;color:#7A6E60;line-height:1.6;margin:0;">
            This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:11px;color:#7A6E60;margin:0;letter-spacing:1px;">
            SILVER KEY REALTY &nbsp;&middot;&nbsp; silverkeyrealty.llc
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
