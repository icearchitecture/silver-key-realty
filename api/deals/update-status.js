import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.skr_roles.permission_level < 40) {
    return res.status(403).json({ error: "Agent role or higher required" });
  }

  const { dealId, newStatus, newStage, notes } = req.body;
  if (!dealId || !newStatus) return res.status(400).json({ error: "dealId and newStatus required" });

  try {
    const { data: current } = await supabase
      .from("skr_deals")
      .select("status, pipeline_stage")
      .eq("id", dealId)
      .eq("tenant_id", member.tenant_id)
      .single();

    if (!current) return res.status(404).json({ error: "Deal not found" });

    const { data: deal, error } = await supabase
      .from("skr_deals")
      .update({
        status: newStatus,
        pipeline_stage: newStage || current.pipeline_stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .eq("tenant_id", member.tenant_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Failed to update deal", detail: error.message });

    await supabase.from("skr_audit_log").insert({
      tenant_id: member.tenant_id,
      user_id: member.id,
      action: "deal_status_changed",
      resource_type: "deal",
      resource_id: dealId,
      details: {
        from_status: current.status,
        to_status: newStatus,
        notes: notes || null,
      },
    });

    return res.status(200).json({ success: true, deal });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
