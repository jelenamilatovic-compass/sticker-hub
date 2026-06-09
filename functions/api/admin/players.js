// Admin endpoint — view all players incl. phone, force delete
import {
  STORAGE_KEY, corsHeaders, json,
  sanitizeName, checkAdminPass,
} from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (!KV) return json({ error: 'KV not bound' }, 500);
  if (!checkAdminPass(request, env)) return json({ error: 'Nije autorizovano' }, 401);

  try {
    if (request.method === 'GET') {
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      // Admin sees full data — phone included, pinHash excluded
      const out = {};
      for (const key of Object.keys(all)) {
        const p = all[key];
        out[key] = {
          name: p.name,
          phone: p.phone || '',
          have: p.have || [],
          need: p.need || [],
          rare: p.rare || [],
          createdAt: p.createdAt,
          updated: p.updated,
        };
      }
      return json({ players: out });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const name = sanitizeName(url.searchParams.get('name'));
      if (!name) return json({ error: 'Ime je obavezno' }, 400);

      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      const key = name.toLowerCase();
      if (!all[key]) return json({ error: 'Igrač ne postoji' }, 404);
      delete all[key];
      await KV.put(STORAGE_KEY, JSON.stringify(all));
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}
