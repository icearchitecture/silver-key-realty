// ============================================================================
// /api/ai/score-lead — AI-Powered Lead Scoring
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, callGPT, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const { lead_id } = await req.json();
    const tenantId = await getTenantId();

    if (!lead_id) return fail('lead_id required', 400);

    const { data: lead, error } = await supabaseAdmin
      .from('skr_leads')
      .select('id, pathway, sub_category, intake_data, secondary_pathways, source, utm_source')
      .eq('id', lead_id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !lead) return fail('Lead not found', 404);

    const result = await callGPT(
      'You are Silver Key Realty\'s lead intelligence system. Analyze this lead and return a score with reasoning. Return valid JSON only.',
      `Score this real estate lead 0-100:
Pathway: ${lead.pathway}
Sub-category: ${lead.sub_category || 'none'}
Secondary pathways: ${JSON.stringify(lead.secondary_pathways)}
Source: ${lead.source}
Intake data: ${JSON.stringify(lead.intake_data)}

Return: { "score": <0-100>, "factors": { "urgency": "<low/medium/high>", "readiness": "<low/medium/high>", "engagement": "<low/medium/high>", "investment_potential": "<low/medium/high>" }, "summary": "<2 sentences>", "recommended_action": "<what the agent should do first>" }`,
      { maxTokens: 400, temperature: 0.3, jsonMode: true }
    );

    const parsed = JSON.parse(result);

    // Update lead with score
    await supabaseAdmin
      .from('skr_leads')
      .update({ lead_score: parsed.score, score_factors: parsed })
      .eq('id', lead_id)
      .eq('tenant_id', tenantId);

    return ok({ success: true, scoring: parsed });
  } catch (err: any) {
    console.error('[SKR] AI scoring error:', err);
    return fail('Scoring failed', 500);
  }
}
