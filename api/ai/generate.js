import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: member } = await supabase
    .from("skr_team_members")
    .select("id, tenant_id, first_name, last_name, email, skr_roles!inner(role_name, permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member) return res.status(403).json({ error: "Not a team member" });

  const { prompt, type, context } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const systemMessage = `You are the AI assistant for Silver Key Realty, a luxury real estate firm. 
You help team members draft documents, emails, deal memos, CMA reports, and client communications.
Always use a professional, warm tone that reflects the Silver Key brand.
Current user: ${member.first_name} ${member.last_name} (${member.skr_roles.role_name})
Document type requested: ${type || 'document'}
${context ? 'Additional context: ' + JSON.stringify(context) : ''}

Format your response as clean, professional content. Use markdown for structure.`;

  try {
    const endpoint = process.env.Silver_key_realty_AZURE_OPENAI_ENDPOINT
      || process.env.SKR_AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.SKR_AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
    const apiVersion = process.env.SKR_AZURE_API_VERSION || "2024-08-01-preview";
    const apiKey = process.env.SKR_AZURE_OPENAI_KEY
      || process.env.Silver_key_realty_AZURE_OPENAI_KEY
      || process.env.AZURE_OPENAI_API_KEY;

    if (!endpoint) {
      return res.status(500).json({ error: "Azure OpenAI endpoint not configured" });
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Azure OpenAI error:", errText);
      return res.status(502).json({ error: "AI service error", details: errText });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response generated.";

    try {
      await supabase.from("skr_workspace_notes").insert({
        tenant_id: member.tenant_id,
        created_by: member.id,
        title: prompt.substring(0, 100),
        content: content,
        note_type: type || "document",
      });
    } catch (e) {
      // Table may not exist yet
    }

    return res.status(200).json({
      success: true,
      content: content,
      model: deployment,
      type: type || "document",
    });
  } catch (error) {
    console.error("AI generate error:", error);
    return res.status(500).json({ error: "Failed to generate content", details: error.message });
  }
}
