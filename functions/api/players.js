// Cloudflare Pages Function — handles all player data
// Bound to KV namespace "STICKERS" (configured in dashboard or wrangler.toml)

const STORAGE_KEY = 'all_players_v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

function sanitizeList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(x => String(x).trim())
    .filter(x => x.length > 0 && x.length <= 20)
    .slice(0, 500); // cap per-player at 500 items
}

function sanitizeName(name) {
  return String(name || '').trim().slice(0, 30);
}

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!KV) {
    return json({ error: 'KV namespace "STICKERS" not bound' }, 500);
  }

  try {
    if (request.method === 'GET') {
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      return json({ players: all });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const name = sanitizeName(body.name);
      if (!name) return json({ error: 'Ime je obavezno' }, 400);

      const key = name.toLowerCase();
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      all[key] = {
        name,
        have: sanitizeList(body.have),
        need: sanitizeList(body.need),
        rare: sanitizeList(body.rare),
        updated: Date.now(),
      };
      await KV.put(STORAGE_KEY, JSON.stringify(all));
      return json({ ok: true, player: all[key] });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const name = sanitizeName(url.searchParams.get('name'));
      if (!name) return json({ error: 'Ime je obavezno' }, 400);

      const key = name.toLowerCase();
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
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
