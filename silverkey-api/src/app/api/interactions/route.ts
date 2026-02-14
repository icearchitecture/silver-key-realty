// ============================================================================
// /api/interactions — Silver Key Realty CRM Interactions
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_interactions')
      .insert({ tenant_id: tenantId, ...body })
      .select('id, interaction_type, sentiment, created_at')
      .single();

    if (error) return fail('Failed to log interaction', 500);

    await audit({
      eventType: 'data_modify',
      entityType: 'interaction',
      entityId: data.id,
      actorType: body.actor_type || 'agent',
      action: 'interaction_logged',
      details: { type: body.interaction_type },
    });

    return ok({ success: true, interaction: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const leadId = url.searchParams.get('lead_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('skr_interactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (leadId) query = query.eq('lead_id', leadId);

    const { data, error } = await query;
    if (error) return fail('Failed to fetch interactions', 500);

    return ok({ interactions: data || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
