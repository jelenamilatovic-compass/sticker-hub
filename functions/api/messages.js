// Public chat — single channel, all authed users
// GET: requires club code
// POST: requires club code + name + valid PIN; max 280 chars; 3s cooldown per user
import {
  STORAGE_KEY, MSG_KEY, MAX_MSGS,
  corsHeaders, json,
  sanitizeName, sanitizePin, hashPin, checkClubCode,
} from './_helpers.js';

const COOLDOWN_MS = 3000;
const lastMsgByUser = new Map(); // in-memory, resets on cold start (fine for kids hub)

function sanitizeText(s) {
  return String(s || '').trim().slice(0, 280);
}

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!KV) return json({ error: 'KV not bound' }, 500);
  if (!checkClubCode(request, env)) return json({ error: 'Pogrešan klub kod' }, 403);

  try {
    if (request.method === 'GET') {
      const msgs = (await KV.get(MSG_KEY, 'json')) || [];
      return json({ messages: msgs });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const name = sanitizeName(body.name);
      const pin = sanitizePin(body.pin) || sanitizePin(request.headers.get('X-Pin'));
      const text = sanitizeText(body.text);

      if (!name || !pin) return json({ error: 'Nadimak i PIN su obavezni' }, 400);
      if (!text) return json({ error: 'Poruka je prazna' }, 400);

      // Verify PIN against stored player
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      const player = all[name.toLowerCase()];
      if (!player) return json({ error: 'Igrač ne postoji' }, 404);

      const wantHash = await hashPin(name, pin);
      if (wantHash !== player.pinHash) return json({ error: 'Pogrešan PIN' }, 401);

      // Cooldown check
      const userKey = name.toLowerCase();
      const last = lastMsgByUser.get(userKey) || 0;
      const now = Date.now();
      if (now - last < COOLDOWN_MS) {
        return json({ error: 'Sačekaj par sekundi prije sljedeće poruke' }, 429);
      }
      lastMsgByUser.set(userKey, now);

      const msgs = (await KV.get(MSG_KEY, 'json')) || [];
      const newMsg = {
        id: now + '-' + Math.random().toString(36).slice(2, 8),
        from: player.name,
        text,
        ts: now,
      };
      msgs.push(newMsg);
      if (msgs.length > MAX_MSGS) msgs.splice(0, msgs.length - MAX_MSGS);

      await KV.put(MSG_KEY, JSON.stringify(msgs));
      return json({ ok: true, message: newMsg });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}
