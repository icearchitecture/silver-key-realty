import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);
  const offset = (page - 1) * limit;
  const { deal_id, property_id, lead_id, source, search } = req.query;

  let query = supabase
    .from("qd_files")
    .select(
      "id, file_name, file_extension, mime_type, file_size_bytes, storage_path, source_platform, deal_id, property_id, lead_id, contact_id, is_confidential, hash, status, created_at, uploaded_by_member:skr_team_members!qd_files_uploaded_by_fkey(first_name, last_name), qd_file_classifications(document_type, confidence)",
      { count: "exact" }
    )
    .eq("tenant_id", member.tenant_id)
    .neq("status", "deleted");

  if (deal_id) query = query.eq("deal_id", deal_id);
  if (property_id) query = query.eq("property_id", property_id);
  if (lead_id) query = query.eq("lead_id", lead_id);
  if (source) query = query.eq("source_platform", source);
  if (search) query = query.ilike("file_name", `%${search}%`);

  const { data: files, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("qd_files list error:", error);
    return res.status(500).json({ error: "Failed to fetch files" });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({ files: files ?? [], total, page, totalPages });
}
