// ============================================================================
// /api/ai/sentiment — Interaction Sentiment Analysis
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, callGPT, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const { interaction_id, text } = await req.json();
    const tenantId = await getTenantId();

    if (!text) return fail('text required', 400);

    const result = await callGPT(
      'You are a client relationship analyst for Silver Key Realty. Analyze the interaction and return JSON.',
      `Analyze this client interaction:

"${text}"

Return JSON:
{
  "sentiment": "<positive/neutral/negative/urgent>",
  "relationship_temperature": "<warming/stable/cooling/critical>",
  "concerns": ["<list any client concerns>"],
  "action_items": ["<list recommended follow-ups>"],
  "suggested_next": "<specific next step for the agent>"
}`,
      { maxTokens: 400, temperature: 0.3, jsonMode: true }
    );

    const parsed = JSON.parse(result);

    // Update interaction if ID provided
    if (interaction_id) {
      await supabaseAdmin
        .from('skr_interactions')
        .update({
          sentiment: parsed.sentiment,
          ai_analysis: parsed,
        })
        .eq('id', interaction_id)
        .eq('tenant_id', tenantId);
    }

    return ok({ success: true, analysis: parsed });
  } catch (err: any) {
    console.error('[SKR] Sentiment error:', err);
    return fail('Analysis failed', 500);
  }
}
