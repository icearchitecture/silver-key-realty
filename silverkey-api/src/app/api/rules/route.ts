// ============================================================================
// /api/rules — Silver Key Realty Business Rules Engine
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_business_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: false });

    if (error) return fail('Failed to fetch rules', 500);

    // Get recent rule activity
    const { data: recentLogs } = await supabaseAdmin
      .from('skr_rules_log')
      .select('rule_id, conditions_met, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return ok({ rules: data || [], recent_activity: recentLogs || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_business_rules')
      .insert({ tenant_id: tenantId, ...body })
      .select('id, name, trigger_event, is_active, priority')
      .single();

    if (error) return fail('Failed to create rule', 500);

    await audit({
      eventType: 'config_change',
      entityType: 'business_rule',
      entityId: data.id,
      actorType: 'admin',
      action: 'rule_created',
      details: { name: body.name, trigger_event: body.trigger_event },
    });

    return ok({ success: true, rule: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();
    const { id, ...updates } = body;

    if (!id) return fail('Rule ID required', 400);

    const { data, error } = await supabaseAdmin
      .from('skr_business_rules')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, is_active')
      .single();

    if (error) return fail('Failed to update rule', 500);

    await audit({
      eventType: 'rule_change',
      entityType: 'business_rule',
      entityId: id,
      actorType: 'admin',
      action: 'rule_updated',
      details: updates,
    });

    return ok({ success: true, rule: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
