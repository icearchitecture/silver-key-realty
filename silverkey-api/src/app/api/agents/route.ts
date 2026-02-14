// ============================================================================
// /api/agents — Silver Key Realty Agent Management
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, encrypt, hmac, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

// LIST AGENTS (public-facing — only active, non-sensitive fields)
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();

    // Check if agents_coming_soon_mode is on
    const { data: tenant } = await supabaseAdmin
      .from('skr_tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (tenant?.settings?.agents_coming_soon_mode) {
      return ok({
        coming_soon: true,
        message: 'Our agent team is growing. Check back soon!',
        recruitment_open: tenant?.settings?.recruitment_open ?? true,
        agents: [],
      });
    }

    const { data: agents, error } = await supabaseAdmin
      .from('skr_team_members')
      .select('id, display_name, bio, photo_url, specialties, service_areas, pathway_focus, is_featured, active_client_count, avg_satisfaction')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false });

    if (error) return fail('Failed to fetch agents', 500);

    return ok({
      coming_soon: false,
      recruitment_open: tenant?.settings?.recruitment_open ?? true,
      agents: agents || [],
    });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

// APPLY TO JOIN (public — "Join Silver Key Realty" form)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();
    const { name, email, phone, assessment_responses } = body;

    if (!email || !name) return fail('Name and email required', 400);

    // Encrypt applicant PII
    const { data, error } = await supabaseAdmin
      .from('skr_agent_applications')
      .insert({
        tenant_id: tenantId,
        encrypted_name: encrypt(name),
        encrypted_email: encrypt(email),
        encrypted_phone: phone ? encrypt(phone) : null,
        email_hash: hmac(email),
        assessment_responses: assessment_responses || {},
        status: 'submitted',
      })
      .select('id, status, created_at')
      .single();

    if (error) {
      console.error('[SKR] Application error:', error);
      return fail('Failed to submit application', 500);
    }

    // Audit
    await audit({
      eventType: 'data_modify',
      entityType: 'agent_application',
      entityId: data.id,
      actorType: 'applicant',
      action: 'application_submitted',
    });

    // Fire rules
    const { data: rules } = await supabaseAdmin
      .from('skr_business_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('trigger_event', 'application_submitted')
      .eq('is_active', true);

    if (rules) {
      for (const rule of rules) {
        for (const action of (rule.actions || [])) {
          if (action.type === 'notify') {
            await supabaseAdmin.from('skr_notifications').insert({
              tenant_id: tenantId,
              recipient_type: action.recipient_type || 'team_member',
              recipient_id: action.recipient_id,
              notification_type: 'application_received',
              title: 'New Agent Application',
              message: `New application received for Silver Key Realty`,
              channel: action.channel || 'in_app',
              metadata: { application_id: data.id },
            });
          }
        }
      }
    }

    return ok({ success: true, message: 'Application received. We will be in touch!' });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
