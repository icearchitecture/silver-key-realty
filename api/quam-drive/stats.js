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
    .select("id, tenant_id")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  const tid = member.tenant_id;

  const [files, classified, dealRooms, urgency, recentFiles] = await Promise.all([
    supabase.from("qd_files").select("id", { count: "exact", head: true }).eq("tenant_id", tid).neq("status", "deleted"),
    supabase.from("qd_file_classifications").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
    supabase.from("qd_deal_rooms").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
    supabase.from("qd_urgency_flags").select("id", { count: "exact", head: true }).eq("tenant_id", tid).in("status", ["open", "acknowledged"]),
    supabase.from("qd_files").select("id, file_name, file_extension, created_at, source_platform")
      .eq("tenant_id", tid).neq("status", "deleted").order("created_at", { ascending: false }).limit(10),
  ]);

  return res.status(200).json({
    counts: {
      totalFiles: files.count || 0,
      classified: classified.count || 0,
      dealRooms: dealRooms.count || 0,
      openUrgency: urgency.count || 0,
    },
    recentFiles: recentFiles.data || [],
  });
}
