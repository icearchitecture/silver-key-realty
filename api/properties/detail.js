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

  const propertyId = req.query.id;
  if (!propertyId) return res.status(400).json({ error: "Property ID required" });

  try {
    const { data: property, error } = await supabase
      .from("skr_properties")
      .select(`
        *,
        listing_agent:skr_team_members!skr_properties_listing_agent_id_fkey(id, first_name, last_name, email)
      `)
      .eq("id", propertyId)
      .eq("tenant_id", member.tenant_id)
      .single();

    if (error || !property) return res.status(404).json({ error: "Property not found" });

    const { data: deals } = await supabase
      .from("skr_deals")
      .select("id, deal_name, status, deal_value, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    const { data: showings } = await supabase
      .from("skr_showings")
      .select("id, showing_date, status, buyer_name, feedback_interest_level")
      .eq("property_id", propertyId)
      .order("showing_date", { ascending: false })
      .limit(20);

    return res.status(200).json({
      property,
      deals: deals || [],
      showings: showings || [],
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
