// ============================================================================
// /api/consultations — Silver Key Realty Consultation Management
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_consultations')
      .insert({ tenant_id: tenantId, status: 'scheduled', ...body })
      .select('id, consultation_type, scheduled_at, status, created_at')
      .single();

    if (error) return fail('Failed to create consultation', 500);

    await audit({
      eventType: 'data_modify',
      entityType: 'consultation',
      entityId: data.id,
      actorType: 'system',
      action: 'consultation_scheduled',
      details: { type: body.consultation_type, scheduled_at: body.scheduled_at },
    });

    return ok({ success: true, consultation: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const agentId = url.searchParams.get('agent_id');

    let query = supabaseAdmin
      .from('skr_consultations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true });

    if (status) query = query.eq('status', status);
    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) return fail('Failed to fetch consultations', 500);

    return ok({ consultations: data || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
