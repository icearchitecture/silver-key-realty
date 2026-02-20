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
    .select("id, tenant_id, skr_roles!inner(role_name, permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.skr_roles.permission_level < 50) {
    return res.status(403).json({ error: "Broker role or higher required" });
  }

  const { teamMemberId, prefix, displayName, mailboxType } = req.body;

  if (!teamMemberId || !prefix || !displayName) {
    return res.status(400).json({ error: "teamMemberId, prefix, and displayName are required" });
  }

  const prefixRegex = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;
  if (!prefixRegex.test(prefix.toLowerCase())) {
    return res.status(400).json({ error: "Invalid email prefix. Use lowercase letters, numbers, dots, hyphens." });
  }

  const emailAddress = prefix.toLowerCase() + "@silverkeyrealty.llc";

  try {
    const { data: existing } = await supabase
      .from("skr_email_mailboxes")
      .select("id")
      .eq("email_address", emailAddress)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: "Email address already provisioned" });
    }

    const { data: targetMember } = await supabase
      .from("skr_team_members")
      .select("id, first_name, last_name, email")
      .eq("id", teamMemberId)
      .eq("tenant_id", member.tenant_id)
      .eq("is_active", true)
      .single();

    if (!targetMember) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const { data: mailbox, error: insertError } = await supabase
      .from("skr_email_mailboxes")
      .insert({
        tenant_id: member.tenant_id,
        team_member_id: teamMemberId,
        email_address: emailAddress,
        display_name: displayName,
        mailbox_type: mailboxType || "agent",
        status: "provisioned",
        provisioned_by: member.id,
        provisioned_at: new Date().toISOString(),
      })
      .select("id, email_address, display_name, status")
      .single();

    if (insertError) {
      console.error("Provision error:", insertError);
      return res.status(500).json({ error: "Failed to provision mailbox" });
    }

    await supabase.from("skr_audit_log").insert({
      tenant_id: member.tenant_id,
      action: "mailbox_provisioned",
      resource_type: "email_mailbox",
      resource_id: mailbox.id,
      performed_by: member.id,
      details: { email_address: emailAddress, for_member: teamMemberId },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      mailbox: mailbox,
      message: `Mailbox ${emailAddress} provisioned for ${displayName}`,
    });
  } catch (error) {
    console.error("Provision mailbox error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
