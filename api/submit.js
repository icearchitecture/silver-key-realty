import { createClient } from '@supabase/supabase-js';
import { encrypt, hash } from './lib/crypto.js';
import { checkRateLimit, getClientIP } from './lib/rateLimit.js';
import { sanitizeLead } from './lib/sanitize.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ALLOWED_ORIGINS = [
  process.env.SITE_URL,
  'https://silver-key-realty.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

function setCORS(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export default async function handler(req, res) {
  setCORS(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, 'submit');

  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  res.setHeader('X-RateLimit-Reset', rateCheck.resetAt.toISOString());

  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
    });
  }

  try {
    const { valid, data, errors } = sanitizeLead(req.body);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const emailH = hash(data.email);
    const { data: existing } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('email_hash', emailH)
      .eq('pathway', data.pathway)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).json({ success: true, message: 'Inquiry received. We will be in touch.' });
    }

    const lead = {
      name_encrypted: encrypt(data.name),
      email_encrypted: encrypt(data.email),
      phone_encrypted: data.phone ? encrypt(data.phone) : null,
      email_hash: emailH,
      phone_hash: data.phone ? hash(data.phone) : null,
      pathway: data.pathway,
      message_encrypted: data.message ? encrypt(data.message) : null,
      source_page: data.source,
      status: 'new'
    };

    const { data: inserted, error: dbError } = await supabase
      .from('leads')
      .insert(lead)
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    const notifyUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/notify`;
    fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        pathway: data.pathway,
        message: data.message,
        leadId: inserted.id
      })
    }).catch(err => console.error('Notification trigger failed:', err.message));

    return res.status(200).json({ success: true, message: 'Inquiry received. We will be in touch.' });

  } catch (error) {
    console.error('Lead submission error:', error.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
