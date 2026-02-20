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
  if (req.method === "GET") {
    const member = await authMember(req, res);
    if (!member) return;

    const dealId = req.query.deal_id;
    if (!dealId) return res.status(400).json({ error: "deal_id query param required" });

    const [roomRes, filesRes, membersRes, completenessRes] = await Promise.all([
      supabase
        .from("qd_deal_rooms")
        .select("*")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id)
        .maybeSingle(),
      supabase
        .from("qd_files")
        .select("*, qd_file_classifications(*)")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id),
      supabase
        .from("qd_deal_room_members")
        .select("*, member:skr_team_members(id, first_name, last_name, email)")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id),
      supabase
        .from("qd_deal_completeness")
        .select("*")
        .eq("deal_id", dealId)
        .eq("tenant_id", member.tenant_id)
        .maybeSingle(),
    ]);

    if (roomRes.error) return res.status(500).json({ error: roomRes.error.message });
    if (filesRes.error) return res.status(500).json({ error: filesRes.error.message });
    if (membersRes.error) return res.status(500).json({ error: membersRes.error.message });
    if (completenessRes.error) return res.status(500).json({ error: completenessRes.error.message });

    return res.status(200).json({
      room: roomRes.data,
      files: filesRes.data || [],
      members: membersRes.data || [],
      completeness: completenessRes.data,
    });
  }

  if (req.method === "POST") {
    const member = await authMember(req, res);
    if (!member) return;
    if (member.skr_roles.permission_level < 40) {
      return res.status(403).json({ error: "Permission denied. Requires permission_level >= 40." });
    }

    const { deal_id } = req.body;
    if (!deal_id) return res.status(400).json({ error: "deal_id required" });

    const { data: deal } = await supabase
      .from("skr_deals")
      .select("id")
      .eq("id", deal_id)
      .eq("tenant_id", member.tenant_id)
      .single();
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const { data: existing } = await supabase
      .from("qd_deal_rooms")
      .select("id")
      .eq("deal_id", deal_id)
      .eq("tenant_id", member.tenant_id)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: "Deal room already exists for this deal" });

    const { data: room, error: roomError } = await supabase
      .from("qd_deal_rooms")
      .insert({
        deal_id,
        tenant_id: member.tenant_id,
        created_by: member.id,
      })
      .select()
      .single();
    if (roomError) return res.status(500).json({ error: roomError.message });

    await supabase.from("qd_deal_room_members").insert({
      deal_room_id: room.id,
      deal_id,
      tenant_id: member.tenant_id,
      team_member_id: member.id,
      can_upload: true,
      can_download: true,
      can_share: true,
    });

    return res.status(201).json({ room });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
