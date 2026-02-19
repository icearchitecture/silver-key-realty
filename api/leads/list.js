import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, role_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 25, 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("skr_leads")
    .select("id, first_name, last_name, email, phone, pathway, status, lead_score, source, notes, created_at, updated_at", { count: "exact" })
    .eq("tenant_id", member.tenant_id);

  if (req.query.status) query = query.eq("status", req.query.status);
  if (req.query.pathway) query = query.eq("pathway", req.query.pathway);
  if (req.query.search) query = query.or(`first_name.ilike.%${req.query.search}%,last_name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%`);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ error: "Failed to fetch leads" });

  return res.status(200).json({ leads: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) });
}
