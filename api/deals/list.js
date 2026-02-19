import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, role_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;
  const status = req.query.status || null;
  const search = req.query.search || null;

  try {
    let query = supabase
      .from("skr_deals")
      .select(`
        id, deal_name, deal_type, status, pipeline_stage, deal_value,
        expected_close_date, created_at, updated_at,
        listing_agent:skr_team_members!skr_deals_listing_agent_id_fkey(id, first_name, last_name),
        buying_agent:skr_team_members!skr_deals_buying_agent_id_fkey(id, first_name, last_name),
        property:skr_properties!skr_deals_property_id_fkey(id, address_line1, city)
      `, { count: "exact" })
      .eq("tenant_id", member.tenant_id);

    if (member.skr_roles.permission_level < 50) {
      query = query.or(`listing_agent_id.eq.${member.id},buying_agent_id.eq.${member.id}`);
    }

    if (status) query = query.eq("status", status);
    if (search) query = query.or(`deal_name.ilike.%${search}%`);

    query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: deals, count, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to fetch deals" });

    return res.status(200).json({
      deals: deals || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
