// ============================================================================
// /api/ai/concierge — Silver Key AI Concierge (Public-Facing)
// ============================================================================
// Conversational AI on the buyer/seller/investor/renter pathway pages.
// Answers questions about buying process, Silver Key's approach, etc.
// Does NOT access PII. Reads from pathways and properties only.
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, callGPT, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const { message, pathway, conversation_history } = await req.json();
    const tenantId = await getTenantId();

    if (!message) return fail('message required', 400);

    // Load pathway context
    let pathwayContext = '';
    if (pathway) {
      const { data } = await supabaseAdmin
        .from('skr_pathways')
        .select('pathway_label, pathway_description, education_content, sub_categories')
        .eq('tenant_id', tenantId)
        .eq('pathway_code', pathway)
        .single();

      if (data) {
        pathwayContext = `
Current pathway: ${data.pathway_label}
Description: ${data.pathway_description}
Education content: ${JSON.stringify(data.education_content)}
Sub-categories: ${JSON.stringify(data.sub_categories)}`;
      }
    }

    // Load active property count for context
    const { count } = await supabaseAdmin
      .from('skr_properties')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_public', true)
      .in('status', ['active', 'coming_soon']);

    // Build conversation
    const history = (conversation_history || [])
      .slice(-6) // Keep last 6 messages for context
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await callGPT(
      `You are the Silver Key Realty concierge — a warm, knowledgeable guide who helps people understand their real estate journey. You embody Dana's philosophy: information before transaction, relationship before contract.

Key principles:
- Never pressure. Educate and empower.
- If someone seems stressed or rushed, slow them down with reassurance.
- Reference Silver Key's unique approach: lifestyle matching, dimension scoring (Structure, Experience, Community), personalized pathways.
- You can mention that Silver Key currently has ${count || 0} active listings.
- If asked about specific pricing or legal advice, recommend scheduling a consultation.
- Keep responses conversational and under 150 words.
- You are NOT a chatbot. You are a concierge.

${pathwayContext}`,
      `${history ? 'Previous conversation:\n' + history + '\n\n' : ''}User: ${message}`,
      { maxTokens: 300, temperature: 0.8 }
    );

    // Log event for analytics
    await supabaseAdmin.from('skr_events').insert({
      tenant_id: tenantId,
      event_type: 'concierge_message',
      page_path: `/pathway/${pathway || 'general'}`,
      pathway: pathway || null,
      metadata: { message_length: message.length },
    });

    return ok({ response, pathway: pathway || 'general' });
  } catch (err: any) {
    console.error('[SKR] Concierge error:', err);
    return fail('Concierge unavailable', 500);
  }
}
