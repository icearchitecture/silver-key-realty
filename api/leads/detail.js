import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  const leadId = req.query.id;
  if (!leadId) return res.status(400).json({ error: "Lead ID required" });

  const { data: lead, error } = await supabase
    .from("skr_leads")
    .select("*")
    .eq("id", leadId)
    .eq("tenant_id", member.tenant_id)
    .single();

  if (error || !lead) return res.status(404).json({ error: "Lead not found" });

  const { data: deals } = await supabase
    .from("skr_deals")
    .select("id, deal_name, status, deal_value, created_at")
    .eq("lead_id", leadId)
    .eq("tenant_id", member.tenant_id);

  const { data: showings } = await supabase
    .from("skr_showings")
    .select("id, status, scheduled_at, skr_properties!inner(address_line1, city)")
    .eq("lead_id", leadId)
    .eq("tenant_id", member.tenant_id);

  const { data: activity } = await supabase
    .from("skr_audit_log")
    .select("id, action, details, created_at")
    .eq("resource_type", "lead")
    .eq("resource_id", leadId)
    .order("created_at", { ascending: false })
    .limit(20);

  return res.status(200).json({ lead, deals: deals || [], showings: showings || [], activity: activity || [] });
}
