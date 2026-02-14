// ============================================================================
// /api/ai/property-narrative — AI Property Description Generator
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, callGPT, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const { property_id } = await req.json();
    const tenantId = await getTenantId();

    if (!property_id) return fail('property_id required', 400);

    const { data: property, error } = await supabaseAdmin
      .from('skr_properties')
      .select('*')
      .eq('id', property_id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !property) return fail('Property not found', 404);

    const result = await callGPT(
      `You are the voice of Silver Key Realty. Dana's philosophy is relationship-first — she doesn't sell houses, she connects people with homes that match their lives. Write property descriptions that feel personal, warm, and specific. Never use generic real estate clichés like "charming" or "move-in ready." Instead, describe what LIVING in this home feels like. Reference the dimension scores: Structure (the bones), Experience (how it feels), Community (the neighborhood).`,
      `Write a headline (under 10 words) and narrative (150-200 words) for this property:

Address: ${property.address}, ${property.city}, ${property.state} ${property.zip_code}
Type: ${property.property_type}
Beds: ${property.bedrooms} | Baths: ${property.bathrooms} | SqFt: ${property.square_feet}
Year Built: ${property.year_built}
Price: $${property.list_price?.toLocaleString()}
Lot: ${property.lot_acres} acres
Structure Score: ${property.structure_score}/10
Experience Score: ${property.experience_score}/10
Community Score: ${property.community_score}/10
Features: ${JSON.stringify(property.features)}
Agent Notes: ${property.agent_notes || 'none'}

Return JSON:
{
  "headline": "<compelling headline under 10 words>",
  "narrative": "<150-200 word description in Silver Key voice>"
}`,
      { maxTokens: 500, temperature: 0.8, jsonMode: true }
    );

    const parsed = JSON.parse(result);

    // Update property with generated narrative
    await supabaseAdmin
      .from('skr_properties')
      .update({
        headline: parsed.headline,
        narrative: parsed.narrative,
      })
      .eq('id', property_id)
      .eq('tenant_id', tenantId);

    return ok({ success: true, ...parsed });
  } catch (err: any) {
    console.error('[SKR] Narrative error:', err);
    return fail('Narrative generation failed', 500);
  }
}
