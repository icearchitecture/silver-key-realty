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
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.skr_roles.permission_level < 40) {
    return res.status(403).json({ error: "Agent role or higher required" });
  }

  const { dealName, dealType, propertyId, leadId, dealValue, expectedCloseDate, notes } = req.body;

  if (!dealName || !dealType) {
    return res.status(400).json({ error: "dealName and dealType are required" });
  }

  try {
    const { data: deal, error } = await supabase
      .from("skr_deals")
      .insert({
        tenant_id: member.tenant_id,
        deal_name: dealName,
        deal_type: dealType,
        status: "new",
        pipeline_stage: "inquiry",
        deal_value: dealValue || null,
        property_id: propertyId || null,
        lead_id: leadId || null,
        listing_agent_id: dealType === "listing" ? member.id : null,
        buying_agent_id: dealType === "purchase" ? member.id : null,
        expected_close_date: expectedCloseDate || null,
        notes: notes || null,
        created_by: member.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Failed to create deal", detail: error.message });

    await supabase.from("skr_audit_log").insert({
      tenant_id: member.tenant_id,
      user_id: member.id,
      action: "deal_created",
      resource_type: "deal",
      resource_id: deal.id,
      details: { deal_name: dealName, deal_type: dealType },
    });

    return res.status(200).json({ success: true, deal });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
