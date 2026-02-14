// ============================================================================
// /api/properties — Silver Key Realty Property Management
// ============================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, getTenantId, ok, fail, options, audit } from '@/lib/skr';

export async function OPTIONS() { return options(); }

// LIST PROPERTIES (public-facing + admin)
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get('public') !== 'false';
    const status = url.searchParams.get('status');
    const pathway = url.searchParams.get('pathway');
    const featured = url.searchParams.get('featured');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = supabaseAdmin
      .from('skr_properties')
      .select('id, headline, narrative, address, city, state, zip_code, county, latitude, longitude, property_type, bedrooms, bathrooms, square_feet, lot_acres, year_built, list_price, hoa_monthly, estimated_taxes, price_per_sqft, structure_score, experience_score, community_score, status, images, virtual_tour_url, floor_plan_url, features, pathway_tags, is_featured, days_on_market, listed_by, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (publicOnly) {
      query = query.eq('is_public', true).in('status', ['active', 'coming_soon']);
    }
    if (status) query = query.eq('status', status);
    if (pathway) query = query.contains('pathway_tags', [pathway]);
    if (featured === 'true') query = query.eq('is_featured', true);

    const { data, error } = await query;
    if (error) return fail('Failed to fetch properties', 500);

    return ok({ properties: data || [], count: (data || []).length });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

// CREATE PROPERTY
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();

    const { data, error } = await supabaseAdmin
      .from('skr_properties')
      .insert({
        tenant_id: tenantId,
        ...body,
        status: body.status || 'draft',
      })
      .select('id, headline, status, created_at')
      .single();

    if (error) {
      // Readiness trigger will reject incomplete properties going active
      if (error.message?.includes('cannot be activated')) {
        return fail(error.message, 400);
      }
      console.error('[SKR] Property insert error:', error);
      return fail('Failed to create property', 500);
    }

    await audit({
      eventType: 'data_modify',
      entityType: 'property',
      entityId: data.id,
      actorType: 'agent',
      action: 'property_created',
      details: { status: data.status },
    });

    return ok({ success: true, property: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}

// UPDATE PROPERTY
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await getTenantId();
    const { id, ...updates } = body;

    if (!id) return fail('Property ID required', 400);

    const { data, error } = await supabaseAdmin
      .from('skr_properties')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, headline, status')
      .single();

    if (error) {
      if (error.message?.includes('cannot be activated')) {
        return fail(error.message, 400);
      }
      return fail('Failed to update property', 500);
    }

    return ok({ success: true, property: data });
  } catch (err: any) {
    return fail('Internal server error', 500);
  }
}
