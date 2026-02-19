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
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const tenantId = member.tenant_id;
  const isBrokerPlus = member.skr_roles.permission_level >= 50;

  try {
    let leadsQuery = supabase.from("skr_leads").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("status", "in", "(closed_won,closed_lost)");
    if (!isBrokerPlus) leadsQuery = leadsQuery.eq("assigned_to", member.id);
    const { count: activeLeads } = await leadsQuery;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: leadsThisWeek } = await supabase.from("skr_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", weekAgo);

    let dealsQuery = supabase.from("skr_deals").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("status", "in", "(closed_won,closed_lost,cancelled)");
    if (!isBrokerPlus) dealsQuery = dealsQuery.or(`listing_agent_id.eq.${member.id},buying_agent_id.eq.${member.id}`);
    const { count: openDeals } = await dealsQuery;

    const { count: underContract } = await supabase.from("skr_deals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "under_contract");

    const { count: activeProperties } = await supabase.from("skr_properties")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    const { count: teamCount } = await supabase.from("skr_team_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    const { count: showingsThisWeek } = await supabase.from("skr_showings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("showing_date", weekAgo);

    return res.status(200).json({
      activeLeads: activeLeads || 0,
      leadsThisWeek: leadsThisWeek || 0,
      openDeals: openDeals || 0,
      underContract: underContract || 0,
      activeProperties: activeProperties || 0,
      teamCount: teamCount || 0,
      showingsThisWeek: showingsThisWeek || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
