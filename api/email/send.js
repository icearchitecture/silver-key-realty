// api/email/send.js
import { EmailClient } from "@azure/communication-email";
import { createClient } from "@supabase/supabase-js";

const emailClient = new EmailClient(process.env.AZURE_COMM_CONNECTION_STRING);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify auth
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  // Verify team member
  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const { to, cc, bcc, subject, bodyHtml, bodyText, templateId, templateVars, mailboxId } = req.body;

  if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });

  try {
    let htmlContent = bodyHtml;
    let textContent = bodyText;

    // If using a template, fetch and substitute variables
    if (templateId) {
      const { data: template } = await supabase
        .from("skr_email_templates_v2")
        .select("*")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();

      if (template) {
        htmlContent = template.body_html_template;
        textContent = template.body_text_template;
        let subjectLine = template.subject_template;

        // Substitute variables
        if (templateVars && typeof templateVars === "object") {
          Object.entries(templateVars).forEach(([key, value]) => {
            const pattern = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
            if (htmlContent) htmlContent = htmlContent.replace(pattern, value);
            if (textContent) textContent = textContent.replace(pattern, value);
            subjectLine = subjectLine.replace(pattern, value);
          });
        }
      }
    }

    // Get sender from mailbox or default
    let senderAddress = process.env.AZURE_EMAIL_SENDER;
    let senderDisplayName = "Silver Key Realty";

    if (mailboxId) {
      const { data: mailbox } = await supabase
        .from("skr_email_mailboxes")
        .select("email_address, display_name")
        .eq("id", mailboxId)
        .eq("status", "active")
        .single();

      if (mailbox) {
        senderAddress = mailbox.email_address;
        senderDisplayName = mailbox.display_name;
      }
    }

    // Build recipients
    const toRecipients = Array.isArray(to)
      ? to.map(addr => ({ address: addr.email || addr, displayName: addr.name || "" }))
      : [{ address: to }];

    const message = {
      senderAddress,
      content: {
        subject,
        html: htmlContent || "",
        plainText: textContent || "",
      },
      recipients: {
        to: toRecipients,
        ...(cc ? { cc: cc.map(addr => ({ address: addr })) } : {}),
        ...(bcc ? { bcc: bcc.map(addr => ({ address: addr })) } : {}),
      },
    };

    // Send via Azure
    const poller = await emailClient.beginSend(message);
    const result = await poller.pollUntilDone();

    // Log to database
    await supabase.from("skr_email_messages_v2").insert({
      tenant_id: member.tenant_id,
      mailbox_id: mailboxId || null,
      conversation_id: null,
      direction: "outbound",
      status: result.status === "Succeeded" ? "sent" : "failed",
      from_address: senderAddress,
      from_display_name: senderDisplayName,
      to_addresses: JSON.stringify(toRecipients),
      cc_addresses: cc ? JSON.stringify(cc) : "[]",
      bcc_addresses: bcc ? JSON.stringify(bcc) : "[]",
      subject,
      body_html: htmlContent,
      body_text: textContent,
      azure_message_id: result.id,
      azure_status: result.status,
      actually_sent_at: new Date().toISOString(),
    });

    // Update template usage count
    if (templateId) {
      await supabase.rpc("increment_template_usage", { template_id: templateId });
    }

    return res.status(200).json({
      success: true,
      messageId: result.id,
      status: result.status,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return res.status(500).json({ error: "Failed to send email", details: error.message });
  }
}
