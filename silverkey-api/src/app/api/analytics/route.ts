// ============================================================================
// /api/analytics — Silver Key Realty Event Tracking
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

// LOG EVENT (public — frontend sends pings)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();

    const { event_type, page_path, pathway, event_target, metadata, session_id, visitor_id, duration_seconds } = body;

    if (!event_type) return fail('event_type required', 400);

    await supabaseAdmin.from('skr_events').insert({
      tenant_id: tenantId,
      session_id: session_id || null,
      visitor_id: visitor_id || null,
      event_type,
      page_path: page_path || null,
      pathway: pathway || null,
      event_target: event_target || null,
      metadata: metadata || {},
      duration_seconds: duration_seconds || null,
      referrer: body.referrer || null,
    });

    return ok({ success: true });
  } catch (err: any) {
    return fail('Event logging failed', 500);
  }
}

// GET EVENTS (admin — for dashboard)
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const eventType = url.searchParams.get('type');
    const since = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .from('skr_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) query = query.eq('event_type', eventType);
    if (since) query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) return fail('Failed to fetch events', 500);

    return ok({ events: data || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
