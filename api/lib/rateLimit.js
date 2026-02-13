const store = new Map();

const LIMITS = {
  submit: { max: 5, windowMs: 15 * 60 * 1000 },
  read:   { max: 30, windowMs: 60 * 1000 },
  notify: { max: 10, windowMs: 60 * 1000 }
};

function cleanup() {
  const now = Date.now();
  for (const [key, data] of store) {
    if (now - data.windowStart > data.windowMs * 2) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(ip, action = 'submit') {
  const limit = LIMITS[action] || LIMITS.submit;
  const key = `${ip}:${action}`;
  const now = Date.now();
  if (Math.random() < 0.01) cleanup();
  let record = store.get(key);
  if (!record || now - record.windowStart > limit.windowMs) {
    record = { count: 0, windowStart: now, windowMs: limit.windowMs };
    store.set(key, record);
  }
  record.count++;
  const remaining = Math.max(0, limit.max - record.count);
  const resetAt = new Date(record.windowStart + limit.windowMs);
  return { allowed: record.count <= limit.max, remaining, resetAt, limit: limit.max };
}

export function getClientIP(req) {
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}
