import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const dealId = req.query.id;
  if (!dealId) return res.status(400).json({ error: "Deal ID required" });

  try {
    const { data: deal, error } = await supabase
      .from("skr_deals")
      .select(`
        *,
        listing_agent:skr_team_members!skr_deals_listing_agent_id_fkey(id, first_name, last_name, email),
        buying_agent:skr_team_members!skr_deals_buying_agent_id_fkey(id, first_name, last_name, email),
        property:skr_properties!skr_deals_property_id_fkey(id, address_line1, address_line2, city, state, zip_code, property_type, list_price)
      `)
      .eq("id", dealId)
      .eq("tenant_id", member.tenant_id)
      .single();

    if (error || !deal) return res.status(404).json({ error: "Deal not found" });

    const { data: milestones } = await supabase
      .from("skr_deal_milestones")
      .select("*")
      .eq("deal_id", dealId)
      .order("milestone_order", { ascending: true });

    const { data: activity } = await supabase
      .from("skr_audit_log")
      .select("id, action, details, created_at")
      .eq("resource_type", "deal")
      .eq("resource_id", dealId)
      .order("created_at", { ascending: false })
      .limit(25);

    const { data: commissions } = await supabase
      .from("skr_commission_splits")
      .select("*")
      .eq("deal_id", dealId);

    return res.status(200).json({
      deal,
      milestones: milestones || [],
      activity: activity || [],
      commissions: commissions || [],
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
