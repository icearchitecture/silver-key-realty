// ============================================================================
// /api/pathways — Silver Key Realty Pathway Configuration
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options } from '@/lib/skr';

export async function OPTIONS() { return options(); }

// LIST PATHWAYS (public — renders the homepage pathway selector)
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_pathways')
      .select('id, pathway_code, pathway_label, pathway_description, pathway_icon, sub_categories, intake_fields, education_content, display_style, allows_hybrid, sort_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) return fail('Failed to fetch pathways', 500);

    return ok({ pathways: data || [] });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
