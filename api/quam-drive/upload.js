import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDealCompleteness(supabaseClient, dealId, tenantId) {
  const { data: requirements } = await supabaseClient
    .from("qd_deal_file_requirements")
    .select("document_type")
    .eq("deal_id", dealId);

  if (!requirements || requirements.length === 0) return;

  const requiredTypes = [...new Set(requirements.map((r) => r.document_type).filter(Boolean))];
  const required = requiredTypes.length;
  if (required === 0) return;

  const { data: dealFiles } = await supabaseClient
    .from("qd_files")
    .select("id")
    .eq("deal_id", dealId)
    .eq("tenant_id", tenantId)
    .neq("status", "deleted");

  const fileIds = (dealFiles || []).map((f) => f.id);
  if (fileIds.length === 0) {
    await supabaseClient.from("qd_deal_completeness").upsert(
      { deal_id: dealId, score: 0, updated_at: new Date().toISOString() },
      { onConflict: "deal_id" }
    );
    return;
  }

  const { data: classifications } = await supabaseClient
    .from("qd_file_classifications")
    .select("document_type")
    .in("file_id", fileIds);

  const fulfilledTypes = [...new Set((classifications || []).map((c) => c.document_type).filter(Boolean))];
  const fulfilled = fulfilledTypes.filter((t) => requiredTypes.includes(t)).length;
  const score = Math.round((fulfilled / required) * 100);

  await supabaseClient.from("qd_deal_completeness").upsert(
    { deal_id: dealId, score, updated_at: new Date().toISOString() },
    { onConflict: "deal_id" }
  );
}

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

  const body = req.body || {};
  const {
    file_name,
    file_extension,
    mime_type,
    file_size_bytes,
    storage_path,
    source_platform,
    deal_id,
    property_id,
    lead_id,
    contact_id,
    is_confidential,
    document_type,
    base64_content,
  } = body;

  if (!file_name || !storage_path || base64_content == null) {
    return res.status(400).json({ error: "file_name, storage_path, and base64_content are required" });
  }

  let hash = "";
  try {
    const buffer = Buffer.from(base64_content, "base64");
    hash = crypto.createHash("sha256").update(buffer).digest("hex");
  } catch (e) {
    return res.status(400).json({ error: "Invalid base64_content" });
  }

  const fileRecord = {
    tenant_id: member.tenant_id,
    file_name: String(file_name),
    file_extension: file_extension ? String(file_extension) : null,
    mime_type: mime_type ? String(mime_type) : null,
    file_size_bytes: typeof file_size_bytes === "number" ? file_size_bytes : null,
    storage_path: String(storage_path),
    source_platform: source_platform ? String(source_platform) : null,
    deal_id: deal_id || null,
    property_id: property_id || null,
    lead_id: lead_id || null,
    contact_id: contact_id || null,
    is_confidential: Boolean(is_confidential),
    hash,
    status: "active",
    uploaded_by: member.id,
  };

  const { data: file, error: fileError } = await supabase
    .from("qd_files")
    .insert(fileRecord)
    .select("id")
    .single();

  if (fileError) {
    console.error("qd_files insert error:", fileError);
    return res.status(500).json({ error: "Failed to create file record" });
  }

  await supabase.from("qd_file_custody_chain").insert({
    file_id: file.id,
    event_type: "created",
    performed_by: member.id,
    details: {},
  });

  if (document_type) {
    await supabase.from("qd_file_classifications").insert({
      file_id: file.id,
      document_type: String(document_type),
      confidence: 1.0,
      classified_by: "human",
      human_corrected: true,
    });
  }

  await supabase.from("qd_version_chains").insert({
    file_id: file.id,
    version: 1,
    storage_path: fileRecord.storage_path,
    hash,
  });

  if (deal_id && document_type) {
    await updateDealCompleteness(supabase, deal_id, member.tenant_id);
  }

  return res.status(201).json({ fileId: file.id, hash });
}
