import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function authMember(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!member) {
    res.status(403).json({ error: "Not a team member" });
    return null;
  }
  return member;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const member = await authMember(req, res);
  if (!member) return;

  const dealId = req.query.deal_id;

  if (dealId) {
    const [requirementsRes, filesRes] = await Promise.all([
      supabase
        .from("qd_deal_file_requirements")
        .select("*")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id),
      supabase
        .from("qd_files")
        .select("*, qd_file_classifications(*)")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id),
    ]);

    if (requirementsRes.error) return res.status(500).json({ error: requirementsRes.error.message });
    if (filesRes.error) return res.status(500).json({ error: filesRes.error.message });

    const requirements = requirementsRes.data || [];
    const files = filesRes.data || [];
    const fulfilledTypes = new Set();
    for (const file of files) {
      const classifications = Array.isArray(file.qd_file_classifications) ? file.qd_file_classifications : [];
      for (const c of classifications) {
        const t = c.type || c.classification_type || c.document_type;
        if (t) fulfilledTypes.add(t);
      }
    }
    const reqTypeKey = (r) => r.type || r.document_type || r.requirement_type;
    const totalRequired = requirements.length;
    const totalFulfilled = requirements.filter((r) => fulfilledTypes.has(reqTypeKey(r))).length;
    const totalFiles = files.length;
    const score = totalRequired > 0 ? Math.round((totalFulfilled / totalRequired) * 100) : 0;

    return res.status(200).json({
      deal_id: dealId,
      score,
      requirements,
      totalRequired,
      totalFulfilled,
      totalFiles,
    });
  }

  const { data: deals, error } = await supabase
    .from("qd_deal_completeness")
    .select("*, skr_deals(id, deal_name, status, deal_value)")
    .eq("tenant_id", member.tenant_id);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ deals: deals || [] });
}
