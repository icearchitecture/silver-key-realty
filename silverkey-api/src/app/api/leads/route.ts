// ============================================================================
// /api/leads — Silver Key Realty Lead Management
// ============================================================================
// POST: Create new lead (encrypts PII, scores with AI, fires rules)
// GET:  List leads (decrypts PII for authorized users)
// PUT:  Update lead status (state machine enforced by database)
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, encrypt, decrypt, hmac, callGPT, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

// ============================================================================
// CREATE LEAD
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();
    const { name, email, phone, pathway, sub_category, secondary_pathways, intake_data, source, utm_source, utm_medium, utm_campaign, utm_content } = body;

    if (!email || !pathway) {
      return fail('Email and pathway are required', 400);
    }

    // Check for duplicate via HMAC hash
    const emailHash = hmac(email);
    const { data: existing } = await supabaseAdmin
      .from('skr_leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email_hash', emailHash)
      .maybeSingle();

    if (existing) {
      // Don't reveal that lead exists — return success silently
      return ok({ success: true, message: 'Thank you for your submission' });
    }

    // Encrypt PII
    const encryptedName = name ? encrypt(name) : null;
    const encryptedEmail = encrypt(email);
    const encryptedPhone = phone ? encrypt(phone) : null;
    const phoneHash = phone ? hmac(phone) : null;

    // Insert lead
    const { data: lead, error } = await supabaseAdmin
      .from('skr_leads')
      .insert({
        tenant_id: tenantId,
        encrypted_name: encryptedName,
        encrypted_email: encryptedEmail,
        encrypted_phone: encryptedPhone,
        email_hash: emailHash,
        phone_hash: phoneHash,
        pathway,
        sub_category: sub_category || null,
        secondary_pathways: secondary_pathways || [],
        intake_data: intake_data || {},
        source: source || 'website',
        utm_source, utm_medium, utm_campaign, utm_content,
        status: 'new',
        lead_score: 0,
      })
      .select('id, pathway, sub_category, status, lead_score, created_at')
      .single();

    if (error) {
      console.error('[SKR] Lead insert error:', error);
      return fail('Failed to create lead', 500);
    }

    // Audit log
    await audit({
      eventType: 'data_modify',
      entityType: 'lead',
      entityId: lead.id,
      actorType: 'system',
      action: 'lead_created',
      details: { pathway, sub_category, source },
      ip: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // AI Score (async — don't block response)
    scoreLeadAsync(lead.id, tenantId, pathway, sub_category, intake_data);

    // Fire business rules (async)
    fireRulesAsync(tenantId, 'lead_created', lead);

    // Log pathway selection
    await supabaseAdmin.from('skr_pathway_selections').insert({
      tenant_id: tenantId,
      lead_id: lead.id,
      pathway_code: pathway,
      sub_category: sub_category || null,
      selection_type: 'initial',
    });

    return ok({ success: true, message: 'Thank you for your submission', id: lead.id });

  } catch (err: any) {
    console.error('[SKR] Lead creation error:', err);
    return fail('Internal server error', 500);
  }
}

// ============================================================================
// LIST LEADS (authenticated — broker/agent only)
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const pathway = url.searchParams.get('pathway');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('skr_leads')
      .select('id, pathway, sub_category, secondary_pathways, status, lead_score, score_factors, intake_data, lifestyle_profile, source, utm_source, assigned_to, encrypted_name, encrypted_email, encrypted_phone, created_at, first_contacted_at, qualified_at, converted_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (pathway) query = query.eq('pathway', pathway);

    const { data: leads, error } = await query;

    if (error) {
      console.error('[SKR] Lead list error:', error);
      return fail('Failed to fetch leads', 500);
    }

    // Decrypt PII for display
    const decryptedLeads = (leads || []).map(lead => ({
      ...lead,
      name: lead.encrypted_name ? decrypt(lead.encrypted_name) : null,
      email: lead.encrypted_email ? decrypt(lead.encrypted_email) : null,
      phone: lead.encrypted_phone ? decrypt(lead.encrypted_phone) : null,
      encrypted_name: undefined,
      encrypted_email: undefined,
      encrypted_phone: undefined,
    }));

    return ok({ leads: decryptedLeads, count: decryptedLeads.length });

  } catch (err: any) {
    console.error('[SKR] Lead list error:', err);
    return fail('Internal server error', 500);
  }
}

// ============================================================================
// UPDATE LEAD (status change — state machine enforced by DB trigger)
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();
    const { id, status, assigned_to, lead_score, notes } = body;

    if (!id) return fail('Lead ID required', 400);

    const updates: any = {};
    if (status) updates.status = status;
    if (assigned_to) updates.assigned_to = assigned_to;
    if (lead_score !== undefined) updates.lead_score = lead_score;

    const { data, error } = await supabaseAdmin
      .from('skr_leads')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, status, lead_score, assigned_to')
      .single();

    if (error) {
      // State machine violation comes back as a raised exception
      if (error.message?.includes('Invalid status transition')) {
        return fail(error.message, 400);
      }
      console.error('[SKR] Lead update error:', error);
      return fail('Failed to update lead', 500);
    }

    // Log note if provided
    if (notes) {
      await supabaseAdmin.from('skr_lead_activity').insert({
        tenant_id: tenantId,
        lead_id: id,
        activity_type: 'note_added',
        details: { notes },
        actor_type: 'agent',
      });
    }

    // Fire rules on status change
    if (status) {
      fireRulesAsync(tenantId, 'lead_status_changed', { id, status, ...updates });
    }

    return ok({ success: true, lead: data });

  } catch (err: any) {
    console.error('[SKR] Lead update error:', err);
    return fail('Internal server error', 500);
  }
}

// ============================================================================
// ASYNC HELPERS (don't block API response)
// ============================================================================

async function scoreLeadAsync(leadId: string, tenantId: string, pathway: string, subCategory: string | null, intakeData: any) {
  try {
    const prompt = `You are Silver Key Realty's lead scoring system. Score this lead 0-100 based on urgency, readiness, and engagement signals. Return JSON only.

Lead data:
- Pathway: ${pathway}
- Sub-category: ${subCategory || 'none'}
- Intake responses: ${JSON.stringify(intakeData)}

Return format:
{
  "score": <number 0-100>,
  "factors": {
    "urgency": "<low/medium/high>",
    "readiness": "<low/medium/high>",
    "engagement": "<low/medium/high>"
  },
  "summary": "<one sentence explaining the score>"
}`;

    const result = await callGPT(
      'You are a real estate lead scoring AI. Return valid JSON only.',
      prompt,
      { maxTokens: 300, temperature: 0.3, jsonMode: true }
    );

    const parsed = JSON.parse(result);

    await supabaseAdmin
      .from('skr_leads')
      .update({
        lead_score: parsed.score,
        score_factors: parsed,
      })
      .eq('id', leadId)
      .eq('tenant_id', tenantId);

  } catch (err) {
    console.error('[SKR] Lead scoring error:', err);
    // Non-fatal — lead exists without score
  }
}

async function fireRulesAsync(tenantId: string, triggerEvent: string, eventData: any) {
  try {
    const { data: rules } = await supabaseAdmin
      .from('skr_business_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      const startTime = Date.now();
      let conditionsMet = true;

      // Evaluate conditions
      for (const condition of (rule.conditions || [])) {
        const fieldValue = eventData[condition.field];
        switch (condition.operator) {
          case 'equals': conditionsMet = fieldValue === condition.value; break;
          case 'contains': conditionsMet = String(fieldValue).includes(condition.value); break;
          case 'greater_than': conditionsMet = Number(fieldValue) > Number(condition.value); break;
          case 'less_than': conditionsMet = Number(fieldValue) < Number(condition.value); break;
          default: conditionsMet = false;
        }
        if (!conditionsMet) break;
      }

      // Execute actions if conditions met
      const actionsExecuted: any[] = [];
      if (conditionsMet) {
        for (const action of (rule.actions || [])) {
          switch (action.type) {
            case 'set_field':
              if (eventData.id) {
                await supabaseAdmin
                  .from('skr_leads')
                  .update({ [action.field]: action.value })
                  .eq('id', eventData.id)
                  .eq('tenant_id', tenantId);
              }
              actionsExecuted.push(action);
              break;
            case 'notify':
              await supabaseAdmin.from('skr_notifications').insert({
                tenant_id: tenantId,
                recipient_type: action.recipient_type || 'team_member',
                recipient_id: action.recipient_id,
                notification_type: 'rule_fired',
                title: rule.name,
                message: action.message || `Rule "${rule.name}" triggered`,
                channel: action.channel || 'in_app',
                metadata: { rule_id: rule.id, event_data: eventData },
              });
              actionsExecuted.push(action);
              break;
            case 'create_task':
              await supabaseAdmin.from('skr_tasks').insert({
                tenant_id: tenantId,
                title: action.title || rule.name,
                description: action.description || `Auto-created by rule: ${rule.name}`,
                priority: action.priority || 'normal',
                status: 'pending',
                source: 'rule',
                source_rule_id: rule.id,
                related_entity_type: 'lead',
                related_entity_id: eventData.id,
              });
              actionsExecuted.push(action);
              break;
          }
        }

        // Increment rule fire count
        await supabaseAdmin
          .from('skr_business_rules')
          .update({
            times_fired: (rule.times_fired || 0) + 1,
            last_fired_at: new Date().toISOString(),
          })
          .eq('id', rule.id);
      }

      // Log rule execution
      await supabaseAdmin.from('skr_rules_log').insert({
        tenant_id: tenantId,
        rule_id: rule.id,
        trigger_event: triggerEvent,
        conditions_evaluated: rule.conditions,
        conditions_met: conditionsMet,
        actions_executed: actionsExecuted,
        execution_time_ms: Date.now() - startTime,
      });
    }
  } catch (err) {
    console.error('[SKR] Rules engine error:', err);
  }
}
