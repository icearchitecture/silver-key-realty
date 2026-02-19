import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id).eq("is_active", true).single();
  if (!member) return res.status(403).json({ error: "Not a team member" });

  if (req.method === "GET") {
    let notifications = [];

    try {
      const { data } = await supabase
        .from("skr_notifications")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("recipient_id", member.id)
        .order("created_at", { ascending: false })
        .limit(20);
      notifications = data || [];
    } catch (e) {
      const { data: auditData } = await supabase
        .from("skr_audit_log")
        .select("id, action, resource_type, resource_id, details, created_at")
        .eq("tenant_id", member.tenant_id)
        .order("created_at", { ascending: false })
        .limit(20);

      notifications = (auditData || []).map(a => ({
        id: a.id,
        type: a.action,
        title: formatAction(a.action),
        body: a.details ? JSON.stringify(a.details).substring(0, 100) : null,
        is_read: true,
        created_at: a.created_at,
      }));
    }

    const unread = notifications.filter(n => !n.is_read).length;

    return res.status(200).json({
      notifications,
      unreadCount: unread,
    });
  }

  if (req.method === "PATCH") {
    const { id, markAllRead } = req.body;

    if (markAllRead) {
      await supabase.from("skr_notifications")
        .update({ is_read: true })
        .eq("tenant_id", member.tenant_id)
        .eq("recipient_id", member.id)
        .eq("is_read", false)
        .catch(() => {});
    } else if (id) {
      await supabase.from("skr_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .catch(() => {});
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function formatAction(a) {
  const map = {
    lead_created: "New lead received",
    deal_created: "New deal started",
    team_member_added: "Team member joined",
    login_success: "New login detected",
    permission_changed: "Permission updated",
    mailbox_provisioned: "Email mailbox created",
    file_uploaded: "File uploaded to Quam Drive",
  };
  return map[a] || a.replace(/_/g, " ");
}
