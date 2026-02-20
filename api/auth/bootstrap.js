import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const cols = "id, tenant_id, first_name, last_name, email, is_active, role_id, skr_roles(role_name, permission_level)";

  // 1) First try: auth_user_id match
  const { data: byAuthId } = await supabase
    .from("skr_team_members")
    .select(cols)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthId) {
    if (byAuthId.is_active === false) return res.status(403).json({ error: "Deactivated" });
    return res.status(200).json({ member: byAuthId, linked: true });
  }

  // 2) Fallback: email match (case-insensitive), then link auth_user_id
  const email = (user.email || "").trim();
  if (!email) return res.status(403).json({ error: "Not authorized" });

  const { data: byEmail } = await supabase
    .from("skr_team_members")
    .select(cols)
    .ilike("email", email)
    .maybeSingle();

  if (!byEmail) return res.status(403).json({ error: "Not a team member" });
  if (byEmail.is_active === false) return res.status(403).json({ error: "Deactivated" });

  await supabase
    .from("skr_team_members")
    .update({ auth_user_id: user.id })
    .eq("id", byEmail.id);

  return res.status(200).json({ member: byEmail, linked: false });
}

