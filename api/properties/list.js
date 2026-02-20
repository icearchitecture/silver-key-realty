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

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;
  const status = req.query.status || null;
  const search = req.query.search || null;
  const propertyType = req.query.type || null;

  try {
    let query = supabase
      .from("skr_properties")
      .select(`
        id, address_line1, address_line2, city, state, zip_code,
        property_type, status, list_price, bedrooms, bathrooms,
        square_feet, lot_size_acres, year_built,
        readiness_score, created_at, updated_at,
        listing_agent:skr_team_members!skr_properties_listing_agent_id_fkey(id, first_name, last_name)
      `, { count: "exact" })
      .eq("tenant_id", member.tenant_id);

    if (status) query = query.eq("status", status);
    if (propertyType) query = query.eq("property_type", propertyType);
    if (search) query = query.or(`address_line1.ilike.%${search}%,city.ilike.%${search}%`);

    query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: properties, count, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to fetch properties" });

    return res.status(200).json({
      properties: properties || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
