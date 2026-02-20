import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  const fileId = req.query.id;
  if (!fileId) return res.status(400).json({ error: "File ID required" });

  const [
    { data: file, error: fileError },
    { data: custodyChain },
    { data: versions },
    { count: viewCount },
  ] = await Promise.all([
    supabase
      .from("qd_files")
      .select("*, qd_file_classifications(document_type, confidence, classified_by)")
      .eq("id", fileId)
      .eq("tenant_id", member.tenant_id)
      .single(),
    supabase
      .from("qd_file_custody_chain")
      .select("id, event_type, performed_by, details, created_at, performer:skr_team_members!qd_file_custody_chain_performed_by_fkey(first_name, last_name)")
      .eq("file_id", fileId)
      .order("created_at", { ascending: true }),
    supabase
      .from("qd_version_chains")
      .select("id, version, storage_path, hash, created_at")
      .eq("file_id", fileId)
      .order("version", { ascending: false }),
    supabase
      .from("qd_document_views")
      .select("id", { count: "exact", head: true })
      .eq("file_id", fileId),
  ]);

  if (fileError || !file) {
    return res.status(404).json({ error: "File not found" });
  }

  await supabase.from("qd_document_views").insert({
    file_id: fileId,
    viewer_id: member.id,
  });

  await supabase.from("qd_file_custody_chain").insert({
    file_id: fileId,
    event_type: "viewed",
    performed_by: member.id,
    details: { viewer_id: member.id },
  });

  const totalViews = viewCount ?? 0;

  return res.status(200).json({
    file,
    custodyChain: custodyChain ?? [],
    versions: versions ?? [],
    totalViews: totalViews + 1,
  });
}
