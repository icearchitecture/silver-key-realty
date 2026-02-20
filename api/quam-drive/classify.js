import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

  const { file_id, document_type } = req.body || {};
  if (!file_id || !document_type) {
    return res.status(400).json({ error: "file_id and document_type are required" });
  }

  const { data: file } = await supabase
    .from("qd_files")
    .select("id, tenant_id, deal_id")
    .eq("id", file_id)
    .eq("tenant_id", member.tenant_id)
    .neq("status", "deleted")
    .single();

  if (!file) return res.status(404).json({ error: "File not found" });

  const classificationPayload = {
    file_id,
    document_type: String(document_type),
    confidence: 1.0,
    classified_by: "human",
    human_corrected: true,
  };

  const { data: classification, error: classifyError } = await supabase
    .from("qd_file_classifications")
    .upsert(classificationPayload, { onConflict: "file_id" })
    .select()
    .single();

  if (classifyError) {
    console.error("qd_file_classifications upsert error:", classifyError);
    return res.status(500).json({ error: "Failed to classify file" });
  }

  await supabase.from("qd_file_custody_chain").insert({
    file_id,
    event_type: "classified",
    performed_by: member.id,
    details: { document_type: String(document_type) },
  });

  return res.status(200).json({
    success: true,
    classification,
  });
}
