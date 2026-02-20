import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("qd_urgency_flags")
      .select("*, file:qd_files(file_name, deal_id)")
      .eq("tenant_id", member.tenant_id)
      .in("status", ["open", "acknowledged", "in_progress"])
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: "Failed to fetch urgency flags" });
    return res.status(200).json({ flags: data || [] });
  }

  if (req.method === "PATCH") {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "id and status required" });

    const { error } = await supabase
      .from("qd_urgency_flags")
      .update({ status, resolved_by: member.id, resolved_at: status === "resolved" ? new Date().toISOString() : null })
      .eq("id", id).eq("tenant_id", member.tenant_id);

    if (error) return res.status(500).json({ error: "Update failed" });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
