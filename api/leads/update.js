import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Lead ID required" });

  const allowed = ["status", "lead_score", "notes", "pathway", "assigned_to", "phone"];
  const clean = {};
  Object.keys(updates).forEach(k => { if (allowed.includes(k)) clean[k] = updates[k]; });

  const { data, error } = await supabase
    .from("skr_leads")
    .update(clean)
    .eq("id", id)
    .eq("tenant_id", member.tenant_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Update failed" });
  return res.status(200).json({ lead: data });
}
