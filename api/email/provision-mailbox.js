// api/email/provision-mailbox.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  // Verify broker+ role
  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, role:skr_roles!inner(slug, permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.role.permission_level < 40) {
    return res.status(403).json({ error: "Broker role or higher required" });
  }

  const { teamMemberId, prefix, displayName, mailboxType } = req.body;

  if (!teamMemberId || !prefix || !displayName) {
    return res.status(400).json({ error: "teamMemberId, prefix, and displayName are required" });
  }

  // Validate prefix (alphanumeric, dots, hyphens only)
  const prefixRegex = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;
  if (!prefixRegex.test(prefix.toLowerCase())) {
    return res.status(400).json({ error: "Invalid email prefix. Use lowercase letters, numbers, dots, hyphens." });
  }

  try {
    // Call the provision function
    const { data, error } = await supabase.rpc("skr_provision_mailbox", {
      p_tenant_id: member.tenant_id,
      p_team_member_id: teamMemberId,
      p_prefix: prefix.toLowerCase(),
      p_display_name: displayName,
      p_mailbox_type: mailboxType || "agent",
      p_provisioned_by: member.id,
    });

    if (error) {
      console.error("Provision error:", error);
      return res.status(500).json({ error: "Failed to provision mailbox" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Provision mailbox error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
