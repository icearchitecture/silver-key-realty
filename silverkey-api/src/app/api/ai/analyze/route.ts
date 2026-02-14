// ============================================================================
// /api/ai/analyze — Dana's Analytics Brain
// ============================================================================
// Aggregates data from skr_leads, skr_events, skr_interactions
// Sends to GPT-5.2 for plain-English interpretation
// Stores result in skr_analytics_snapshots
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, callGPT, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();
    const period = body.period || 'week'; // day, week, month

    // Gather metrics
    const now = new Date();
    const periodStart = new Date();
    if (period === 'day') periodStart.setDate(now.getDate() - 1);
    else if (period === 'week') periodStart.setDate(now.getDate() - 7);
    else periodStart.setMonth(now.getMonth() - 1);
    const since = periodStart.toISOString();

    // Lead counts by status
    const { data: allLeads } = await supabaseAdmin
      .from('skr_leads')
      .select('status, pathway, lead_score, created_at')
      .eq('tenant_id', tenantId);

    const { data: newLeads } = await supabaseAdmin
      .from('skr_leads')
      .select('id, pathway, sub_category, lead_score, source')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    // Interaction sentiment
    const { data: interactions } = await supabaseAdmin
      .from('skr_interactions')
      .select('interaction_type, sentiment, ai_analysis')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    // Property stats
    const { data: properties } = await supabaseAdmin
      .from('skr_properties')
      .select('status, list_price, days_on_market')
      .eq('tenant_id', tenantId);

    // Page events
    const { data: events } = await supabaseAdmin
      .from('skr_events')
      .select('event_type, page_path, pathway')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    // Rules fired
    const { data: rulesFired } = await supabaseAdmin
      .from('skr_rules_log')
      .select('rule_id, conditions_met')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    // Build metrics summary
    const metrics = {
      period,
      total_leads: allLeads?.length || 0,
      new_leads_this_period: newLeads?.length || 0,
      leads_by_pathway: groupBy(newLeads || [], 'pathway'),
      leads_by_source: groupBy(newLeads || [], 'source'),
      avg_lead_score: avg(newLeads?.map(l => l.lead_score) || []),
      total_interactions: interactions?.length || 0,
      sentiment_breakdown: groupBy(interactions || [], 'sentiment'),
      active_properties: properties?.filter(p => p.status === 'active').length || 0,
      total_properties: properties?.length || 0,
      avg_days_on_market: avg(properties?.filter(p => p.days_on_market).map(p => p.days_on_market) || []),
      page_views: events?.filter(e => e.event_type === 'page_view').length || 0,
      form_submissions: events?.filter(e => e.event_type === 'form_submit').length || 0,
      form_abandons: events?.filter(e => e.event_type === 'form_abandon').length || 0,
      rules_fired: rulesFired?.filter(r => r.conditions_met).length || 0,
      top_pages: topN(events?.filter(e => e.event_type === 'page_view') || [], 'page_path', 5),
    };

    // Send to GPT for interpretation
    const analysis = await callGPT(
      `You are Dana's business analyst at Silver Key Realty. Dana is a relationship-driven broker in Indianapolis. She doesn't want charts — she wants you to tell her what's happening in plain English, what it means for her business, and what she should do about it. Be direct, warm, and specific. Use her name.`,
      `Here are Silver Key Realty's metrics for the past ${period}:

${JSON.stringify(metrics, null, 2)}

Give Dana a clear, actionable summary. Include:
1. The headline — what's the most important thing happening
2. What's working — specific wins she should know about
3. What needs attention — anything she should act on today
4. Recommended actions — 2-3 specific things to do this week`,
      { maxTokens: 800, temperature: 0.7 }
    );

    // Store snapshot
    await supabaseAdmin.from('skr_analytics_snapshots').insert({
      tenant_id: tenantId,
      snapshot_date: now.toISOString().split('T')[0],
      period,
      metrics,
      ai_summary: analysis,
    });

    return ok({ analysis, metrics, period });
  } catch (err: any) {
    console.error('[SKR] Analytics error:', err);
    return fail('Analysis failed', 500);
  }
}

// Helpers
function groupBy(arr: any[], key: string) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function topN(arr: any[], key: string, n: number) {
  const counts = groupBy(arr, key);
  return Object.entries(counts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}
