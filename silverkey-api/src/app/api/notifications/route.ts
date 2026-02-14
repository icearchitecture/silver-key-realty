// ============================================================================
// /api/notifications — Silver Key Realty Notifications
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const recipientId = url.searchParams.get('recipient_id');

    let query = supabaseAdmin
      .from('skr_notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq('is_read', false);
    if (recipientId) query = query.eq('recipient_id', recipientId);

    const { data, error } = await query;
    if (error) return fail('Failed to fetch notifications', 500);

    return ok({ notifications: data || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

// Mark notification(s) as read
export async function PUT(req: NextRequest) {
  try {
    const { ids } = await req.json();
    const tenantId = await getTenantId();

    if (!ids || !Array.isArray(ids)) return fail('ids array required', 400);

    await supabaseAdmin
      .from('skr_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('tenant_id', tenantId);

    return ok({ success: true });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
