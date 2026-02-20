import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const member = await authMember(req, res);
  if (!member) return;

  const { client_email, client_name, deal_id, documents_needed, message, expires_in_days } = req.body;

  if (!client_email || !client_name || !deal_id || !Array.isArray(documents_needed)) {
    return res.status(400).json({
      error: "client_email, client_name, deal_id, and documents_needed (array) are required",
    });
  }

  const { data: deal } = await supabase
    .from("skr_deals")
    .select("id")
    .eq("id", deal_id)
    .eq("tenant_id", member.tenant_id)
    .single();
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  const portalToken = crypto.randomBytes(32).toString("hex");
  const expiresInDays = typeof expires_in_days === "number" ? expires_in_days : 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data: request, error: requestError } = await supabase
    .from("qd_upload_requests")
    .insert({
      tenant_id: member.tenant_id,
      deal_id,
      client_email,
      client_name,
      portal_token: portalToken,
      message: message || null,
      expires_at: expiresAt.toISOString(),
      created_by: member.id,
    })
    .select("id")
    .single();

  if (requestError) return res.status(500).json({ error: requestError.message });

  const slots = documents_needed.map((d) => ({
    upload_request_id: request.id,
    tenant_id: member.tenant_id,
    document_type: d.type || null,
    label: d.label || d.type || "Document",
    required: d.required !== false,
  }));

  if (slots.length > 0) {
    const { error: slotsError } = await supabase.from("qd_upload_slots").insert(slots);
    if (slotsError) return res.status(500).json({ error: slotsError.message });
  }

  const baseUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const portalUrl = baseUrl ? `${baseUrl}/portal/${portalToken}` : null;

  return res.status(201).json({
    requestId: request.id,
    portalUrl: portalUrl || `/portal/${portalToken}`,
    expiresAt: expiresAt.toISOString(),
    slotsCreated: slots.length,
  });
}
