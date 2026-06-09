// Shared helpers for all API routes

export const STORAGE_KEY = 'all_players_v2'; // bumped to v2 for new schema

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Club-Code, X-Pin, X-Admin-Pass',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

export function sanitizeList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(x => String(x).trim())
    .filter(x => x.length > 0 && x.length <= 20)
    .slice(0, 500);
}

export function sanitizeName(name) {
  return String(name || '').trim().slice(0, 30);
}

export function sanitizePhone(phone) {
  const s = String(phone || '').trim().slice(0, 25);
  // Allow digits, +, spaces, dashes, parens
  if (!/^[\d+\s()\-]+$/.test(s)) return '';
  // Require at least 7 digits
  if ((s.match(/\d/g) || []).length < 7) return '';
  return s;
}

export function sanitizePin(pin) {
  const s = String(pin || '').trim();
  if (!/^\d{4}$/.test(s)) return '';
  return s;
}

export async function hashPin(name, pin) {
  const data = new TextEncoder().encode(
    String(name).toLowerCase() + ':' + String(pin) + ':slicice-salt-2026'
  );
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function checkClubCode(request, env) {
  const provided = request.headers.get('X-Club-Code') || '';
  const expected = env.CLUB_CODE || '';
  return provided && expected && provided === expected;
}

export function checkAdminPass(request, env) {
  const provided = request.headers.get('X-Admin-Pass') || '';
  const expected = env.ADMIN_PASS || '';
  return provided && expected && provided === expected;
}

// Strip private fields from player object for public API
export function publicPlayer(p) {
  if (!p) return null;
  return {
    name: p.name,
    have: p.have || [],
    need: p.need || [],
    rare: p.rare || [],
    updated: p.updated,
  };
}

export function publicAll(all) {
  const out = {};
  for (const key of Object.keys(all)) {
    out[key] = publicPlayer(all[key]);
  }
  return out;
}
