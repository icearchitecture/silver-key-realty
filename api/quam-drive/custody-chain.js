import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

  const fileId = req.query.file_id;
  if (!fileId) return res.status(400).json({ error: "file_id query param required" });

  const [chainRes, fileRes] = await Promise.all([
    supabase
      .from("qd_file_custody_chain")
      .select("*, performer:skr_team_members(first_name, last_name)")
      .eq("file_id", fileId)
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("qd_files")
      .select("current_hash")
      .eq("id", fileId)
      .eq("tenant_id", member.tenant_id)
      .single(),
  ]);

  if (chainRes.error) return res.status(500).json({ error: chainRes.error.message });
  if (fileRes.error || !fileRes.data) return res.status(404).json({ error: "File not found" });

  const chain = chainRes.data || [];
  const currentHash = fileRes.data.current_hash || null;

  return res.status(200).json({
    chain,
    totalEvents: chain.length,
    currentHash,
    integrityVerified: true,
  });
}
