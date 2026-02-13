export function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(cleaned)) return null;
  if (cleaned.length > 254) return null;
  return cleaned;
}

export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 10 || cleaned.length > 16) return null;
  return cleaned;
}

export function sanitizeText(text, maxLength = 500) {
  if (!text || typeof text !== 'string') return null;
  return stripHtml(text).substring(0, maxLength);
}

export function validatePathway(pathway) {
  const valid = ['buyer', 'seller', 'investor', 'rental', 'general'];
  return valid.includes(pathway) ? pathway : null;
}

export function sanitizeLead(body) {
  const errors = [];
  const name = sanitizeText(body.name, 100);
  if (!name) errors.push('Name is required');
  const email = sanitizeEmail(body.email);
  if (!email) errors.push('Valid email is required');
  const phone = body.phone ? sanitizePhone(body.phone) : null;
  const pathway = validatePathway(body.pathway);
  if (!pathway) errors.push('Valid pathway is required');
  const message = body.message ? sanitizeText(body.message, 2000) : null;
  const source = body.source ? sanitizeText(body.source, 200) : null;
  return { valid: errors.length === 0, data: { name, email, phone, pathway, message, source }, errors };
}
