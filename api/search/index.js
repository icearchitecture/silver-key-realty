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
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const q = req.query.q;
  if (!q || q.length < 2) return res.status(400).json({ error: "Query must be at least 2 characters" });

  const searchTerm = `%${q}%`;
  const tenantId = member.tenant_id;
  const limit = 8;

  try {
    const { data: leads } = await supabase
      .from("skr_leads")
      .select("id, first_name, last_name, email, pathway, status, lead_score, created_at")
      .eq("tenant_id", tenantId)
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: deals } = await supabase
      .from("skr_deals")
      .select("id, deal_name, status, deal_value, deal_type, updated_at")
      .eq("tenant_id", tenantId)
      .ilike("deal_name", searchTerm)
      .order("updated_at", { ascending: false })
      .limit(limit);

    const { data: properties } = await supabase
      .from("skr_properties")
      .select("id, address_line1, city, state, property_type, status, list_price")
      .eq("tenant_id", tenantId)
      .or(`address_line1.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .order("updated_at", { ascending: false })
      .limit(limit);

    const { data: contacts } = await supabase
      .from("skr_contacts")
      .select("id, first_name, last_name, email, phone, contact_type")
      .eq("tenant_id", tenantId)
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: notes } = await supabase
      .from("skr_workspace_notes")
      .select("id, title, content, entity_type, created_at")
      .eq("tenant_id", tenantId)
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: files } = await supabase
      .from("skr_workspace_files")
      .select("id, file_name, file_extension, entity_type, created_at")
      .eq("tenant_id", tenantId)
      .ilike("file_name", searchTerm)
      .order("created_at", { ascending: false })
      .limit(limit);

    const totalResults = (leads?.length || 0) + (deals?.length || 0) +
      (properties?.length || 0) + (contacts?.length || 0) +
      (notes?.length || 0) + (files?.length || 0);

    return res.status(200).json({
      query: q,
      totalResults,
      results: {
        leads: (leads || []).map(l => ({ ...l, _type: "lead", _label: `${l.first_name} ${l.last_name}`, _url: `/admin/leads/detail.html?id=${l.id}` })),
        deals: (deals || []).map(d => ({ ...d, _type: "deal", _label: d.deal_name, _url: `/admin/deals/detail.html?id=${d.id}` })),
        properties: (properties || []).map(p => ({ ...p, _type: "property", _label: `${p.address_line1}, ${p.city}`, _url: `/admin/properties/detail.html?id=${p.id}` })),
        contacts: (contacts || []).map(c => ({ ...c, _type: "contact", _label: `${c.first_name} ${c.last_name}` })),
        notes: (notes || []).map(n => ({ ...n, _type: "note", _label: n.title || "Untitled Note" })),
        files: (files || []).map(f => ({ ...f, _type: "file", _label: f.file_name })),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
