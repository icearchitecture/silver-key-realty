// ============================================================
// scripts/inject-admin-config.js
// ============================================================
// Runs during Vercel build. Reads NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY from environment variables and
// writes them into a JS config file that admin pages load.
//
// No keys in source code. No keys in chat. No keys in git.
// Vercel injects them at build time from its env var store.
// ============================================================

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[SKR Build] WARNING: Supabase env vars not found. Admin portal will not function.');
  console.warn('[SKR Build] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.');
}

const configContent = `// Auto-generated at build time — DO NOT EDIT, DO NOT COMMIT
// Source: Vercel environment variables
window.SKR_CONFIG = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}',
};
`;

const outputPath = path.join(__dirname, '..', 'assets', 'js', 'admin-config.js');

// Ensure directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, configContent, 'utf8');

console.log('[SKR Build] admin-config.js generated successfully.');
console.log('[SKR Build] SUPABASE_URL: ' + (SUPABASE_URL ? SUPABASE_URL.substring(0, 20) + '...' : 'MISSING'));
console.log('[SKR Build] SUPABASE_ANON_KEY: ' + (SUPABASE_ANON_KEY ? 'SET (' + SUPABASE_ANON_KEY.length + ' chars)' : 'MISSING'));
