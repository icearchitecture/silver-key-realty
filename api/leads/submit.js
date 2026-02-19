// api/leads/submit.js
import { EmailClient } from "@azure/communication-email";
import { createClient } from "@supabase/supabase-js";

const emailClient = new EmailClient(process.env.AZURE_COMM_CONNECTION_STRING);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // CORS headers for form submission from main site
  const allowedOrigins = [
    "https://silverkeyrealty.llc",
    "https://www.silverkeyrealty.llc",
    "https://silver-key-realty.vercel.app",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    firstName, lastName,
    first_name, last_name,
    email, phone, pathway, message, source, details
  } = req.body;

  const resolvedFirstName = first_name || firstName;
  const resolvedLastName = last_name || lastName;

  if (!resolvedFirstName || !email) {
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
      buyer: "buyer",
      selling: "seller",
      seller: "seller",
      investing: "investor",
      investor: "investor",
      renting: "rental",
      renter: "rental",
      agent: "agent",
      general: "general",
    };

    // Build lead insert data
    const leadInsertData = {
      tenant_id: tenant.id,
      first_name: resolvedFirstName.trim(),
      last_name: (resolvedLastName || "").trim(),
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
    };

    // Add pathway and intake_data if provided (new pathway intake forms)
    if (pathway) {
      leadInsertData.pathway = pathway;
    }
    if (details && typeof details === "object") {
      leadInsertData.intake_data = details;
    }

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("skr_leads")
      .insert(leadInsertData)
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

      const pathwayLabels = {
        buyer: "Buying a Home",
        seller: "Selling a Property",
        investor: "Investing",
        renter: "Renting a Space",
        agent: "Joining Our Team",
      };
      const vars = {
        "{{FIRST_NAME}}": resolvedFirstName.trim(),
        "{{FULL_NAME}}": `${resolvedFirstName.trim()} ${(resolvedLastName || "").trim()}`.trim(),
        "{{EMAIL}}": email.toLowerCase(),
        "{{PATHWAY}}": pathwayLabels[pathway] || (pathway ? pathway.charAt(0).toUpperCase() + pathway.slice(1) : "General Inquiry"),
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
            to: [{ address: email.toLowerCase(), displayName: resolvedFirstName.trim() }],
          },
        });
        await poller.pollUntilDone();
      } catch (emailErr) {
        console.error("Confirmation email error:", emailErr);
      }
    }

    // Audit log (non-blocking)
    supabase.from("skr_audit_log").insert({
      tenant_id: tenant.id,
      action: "lead_created",
      resource_type: "lead",
      resource_id: lead.id,
      details: { pathway: pathway, source: source || "website_form" },
    }).then(() => {}).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Thank you! We'll be in touch within 24 hours.",
      id: lead.id,
      lead_id: lead.id,
    });
  } catch (error) {
    console.error("Lead submit error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
