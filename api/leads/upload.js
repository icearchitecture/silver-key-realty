import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
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

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);

    const leadId = fields.lead_id?.[0];
    const pathway = fields.pathway?.[0] || "general";
    const file = files.file?.[0];

    if (!file || !leadId) {
      return res.status(400).json({ error: "File and lead_id required" });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "File type not allowed" });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const sanitizedName = file.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `leads/${leadId}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents-incoming")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return res.status(500).json({ error: "Upload failed: " + uploadError.message });
    }

    return res.status(200).json({ success: true, path: fileName });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
