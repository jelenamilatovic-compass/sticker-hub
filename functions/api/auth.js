// Verify login: name + PIN — used by frontend to confirm credentials before storing
import {
  STORAGE_KEY, corsHeaders, json,
  sanitizeName, sanitizePin, hashPin, checkClubCode,
} from './_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!checkClubCode(request, env)) return json({ error: 'Pogrešan klub kod' }, 403);

  try {
    const body = await request.json();
    const name = sanitizeName(body.name);
    const pin = sanitizePin(body.pin);
    if (!name || !pin) return json({ error: 'Nadimak i PIN su obavezni' }, 400);

    const all = (await KV.get(STORAGE_KEY, 'json')) || {};
    const player = all[name.toLowerCase()];
    if (!player) return json({ error: 'Ne postojiš još — registruj se' }, 404);

    const wantHash = await hashPin(name, pin);
    if (wantHash !== player.pinHash) return json({ error: 'Pogrešan PIN' }, 401);

    return json({
      ok: true,
      player: {
        name: player.name,
        have: player.have || [],
        need: player.need || [],
        rare: player.rare || [],
      },
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}
