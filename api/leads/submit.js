// api/leads/submit.js
import { EmailClient } from "@azure/communication-email";
import { createClient } from "@supabase/supabase-js";

const emailClient = new EmailClient(process.env.AZURE_COMM_CONNECTION_STRING);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // CORS headers for form submission from main site
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, lastName, email, phone, pathway, message, source } = req.body;

  // Validation
  if (!firstName || !email) {
    return res.status(400).json({ error: "First name and email are required" });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    // Get tenant
    const { data: tenant } = await supabase
      .from("skr_tenants")
      .select("id")
      .limit(1)
      .single();

    if (!tenant) return res.status(500).json({ error: "Configuration error" });

    // Check for duplicate lead (same email in last 24 hours)
    const { data: existing } = await supabase
      .from("skr_leads")
      .select("id")
      .eq("email", email.toLowerCase())
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "We already have your inquiry. Our team will be in touch soon.",
        duplicate: true,
      });
    }

    // Map pathway to lead type
    const pathwayMap = {
      buying: "buyer",
      selling: "seller",
      investing: "investor",
      renting: "rental",
      general: "general",
    };

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("skr_leads")
      .insert({
        tenant_id: tenant.id,
        first_name: firstName.trim(),
        last_name: (lastName || "").trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        lead_type: pathwayMap[pathway] || "general",
        source: source || "website_form",
        status: "new",
        notes: message || null,
        metadata: {
          pathway: pathway,
          submitted_at: new Date().toISOString(),
          user_agent: req.headers["user-agent"] || null,
        },
      })
      .select()
      .single();

    if (leadError) {
      console.error("Lead creation error:", leadError);
      return res.status(500).json({ error: "Failed to create inquiry" });
    }

    // Fetch the lead confirmation template
    const { data: template } = await supabase
      .from("skr_email_templates_v2")
      .select("*")
      .eq("category", "lead_response")
      .eq("is_system", true)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (template) {
      // Substitute variables
      const now = new Date();
      const dateFormatted = now.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit",
      });

      const vars = {
        "{{FIRST_NAME}}": firstName.trim(),
        "{{FULL_NAME}}": `${firstName.trim()} ${(lastName || "").trim()}`.trim(),
        "{{EMAIL}}": email.toLowerCase(),
        "{{PATHWAY}}": pathway ? pathway.charAt(0).toUpperCase() + pathway.slice(1) + " a Home" : "General Inquiry",
        "{{DATE}}": dateFormatted,
        "{{PORTAL_URL}}": "https://silverkeyrealty.llc/consultation",
        "{{LOGO_URL}}": "https://silverkeyrealty.llc/assets/images/logo.png",
      };

      let html = template.body_html_template;
      let text = template.body_text_template;
      let subject = template.subject_template;

      Object.entries(vars).forEach(([key, value]) => {
        const pattern = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
        html = html.replace(pattern, value);
        text = text.replace(pattern, value);
        subject = subject.replace(pattern, value);
      });

      // Send confirmation email
      try {
        const poller = await emailClient.beginSend({
          senderAddress: process.env.AZURE_EMAIL_SENDER,
          content: { subject, html, plainText: text },
          recipients: {
            to: [{ address: email.toLowerCase(), displayName: firstName.trim() }],
          },
        });
        await poller.pollUntilDone();
      } catch (emailErr) {
        console.error("Confirmation email error:", emailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Thank you! We'll be in touch within 24 hours.",
      leadId: lead.id,
    });
  } catch (error) {
    console.error("Lead submit error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
