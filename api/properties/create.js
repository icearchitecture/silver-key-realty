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
    .select("id, tenant_id, skr_roles!inner(permission_level)")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!member || member.skr_roles.permission_level < 40) {
    return res.status(403).json({ error: "Agent role or higher required" });
  }

  const {
    addressLine1, addressLine2, city, state, zipCode,
    propertyType, listPrice, bedrooms, bathrooms,
    squareFeet, lotSizeAcres, yearBuilt, description,
  } = req.body;

  if (!addressLine1 || !city || !state || !zipCode) {
    return res.status(400).json({ error: "Address, city, state, and zip are required" });
  }

  try {
    const { data: property, error } = await supabase
      .from("skr_properties")
      .insert({
        tenant_id: member.tenant_id,
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        city,
        state,
        zip_code: zipCode,
        property_type: propertyType || "single_family",
        status: "draft",
        list_price: listPrice || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        square_feet: squareFeet || null,
        lot_size_acres: lotSizeAcres || null,
        year_built: yearBuilt || null,
        description: description || null,
        listing_agent_id: member.id,
        created_by: member.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Failed to create property", detail: error.message });

    await supabase.from("skr_audit_log").insert({
      tenant_id: member.tenant_id,
      user_id: member.id,
      action: "property_created",
      resource_type: "property",
      resource_id: property.id,
      details: { address: addressLine1, city },
    });

    return res.status(200).json({ success: true, property });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
