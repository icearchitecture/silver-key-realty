// ============================================================================
// SKR CONFIG — Silver Key Realty API Configuration
// ============================================================================
// Single source of truth for all service connections.
// Reads from env vars (Vercel) with Key Vault fallback pattern.
// Every var prefixed SKR_ to prevent collision with Law Pocket.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// =========================
// SUPABASE (auto-populated by Vercel integration)
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// =========================
// AZURE OPENAI (GPT-5.2 in silver-key-realty-foundry)
// =========================
const AZURE_ENDPOINT = process.env.SKR_AZURE_OPENAI_ENDPOINT || '';
const AZURE_KEY = process.env.silver_key_realty_gpt_five_point_two_chat || process.env.SKR_AZURE_OPENAI_KEY || '';
const AZURE_DEPLOYMENT = process.env.SKR_AZURE_OPENAI_DEPLOYMENT || 'skr-gpt52';
const AZURE_API_VERSION = process.env.SKR_AZURE_API_VERSION || '2024-10-21';

// =========================
// ENCRYPTION
// =========================
const ENCRYPTION_KEY = process.env.SKR_ENCRYPTION_KEY || '';

// =========================
// SUPABASE CLIENTS
// =========================
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
export const supabasePublic: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================
// AZURE OPENAI CALLER
// =========================
export async function callGPT(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const endpoint = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

  const body: any = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_completion_tokens: options?.maxTokens || 800,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SKR] Azure OpenAI error:', response.status, errorText);
    throw new Error(`Azure OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// =========================
// TENANT HELPER
// =========================
let _tenantId: string | null = null;

export async function getTenantId(): Promise<string> {
  if (_tenantId) return _tenantId;
  const { data, error } = await supabaseAdmin
    .from('skr_tenants')
    .select('id')
    .eq('slug', 'silver-key-realty')
    .single();
  if (error || !data) throw new Error('Tenant not found: ' + error?.message);
  _tenantId = data.id;
  return data.id;
}

// =========================
// PII ENCRYPTION (AES-256-GCM)
// =========================
export function encrypt(value: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedValue: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
  const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function hmac(value: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
  return crypto.createHmac('sha256', key).update(value.toLowerCase().trim()).digest('hex');
}

// =========================
// API HELPERS
// =========================
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
};

export function ok(data: any, status = 200) {
  return Response.json(data, { status, headers: cors });
}

export function fail(message: string, status = 500) {
  return Response.json({ error: message }, { status, headers: cors });
}

export function options() {
  return new Response(null, { status: 204, headers: cors });
}

// =========================
// AUDIT LOGGER
// =========================
export async function audit(params: {
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  action: string;
  details?: any;
  ip?: string;
  userAgent?: string;
}) {
  const tenantId = await getTenantId();
  await supabaseAdmin.from('skr_audit_log').insert({
    tenant_id: tenantId,
    event_type: params.eventType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    actor_type: params.actorType,
    actor_id: params.actorId || 'system',
    action: params.action,
    details: params.details || {},
    ip_address: params.ip,
    user_agent: params.userAgent,
  });
}
