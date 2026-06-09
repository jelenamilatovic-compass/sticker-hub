// Public API for players — protected by club code
// New player creation requires phone + PIN; updates require matching PIN.

import {
  STORAGE_KEY, corsHeaders, json,
  sanitizeList, sanitizeName, sanitizePhone, sanitizePin,
  hashPin, checkClubCode, publicAll,
} from './_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!KV) return json({ error: 'KV not bound' }, 500);
  if (!env.CLUB_CODE) return json({ error: 'CLUB_CODE not configured' }, 500);

  // Klub kod check — gate for everything
  if (!checkClubCode(request, env)) {
    return json({ error: 'Pogrešan klub kod' }, 403);
  }

  try {
    if (request.method === 'GET') {
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      return json({ players: publicAll(all) });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const name = sanitizeName(body.name);
      if (!name) return json({ error: 'Ime je obavezno' }, 400);

      const key = name.toLowerCase();
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      const existing = all[key];

      if (body.register === true) {
        // New registration
        if (existing) return json({ error: 'Nadimak je već zauzet — izaberi drugi' }, 409);

        const phone = sanitizePhone(body.phone);
        if (!phone) return json({ error: 'Telefon roditelja je obavezan (npr. +382 67 123 456)' }, 400);

        const pin = sanitizePin(body.pin);
        if (!pin) return json({ error: 'PIN mora biti 4 cifre' }, 400);

        all[key] = {
          name,
          have: sanitizeList(body.have),
          need: sanitizeList(body.need),
          rare: sanitizeList(body.rare),
          phone,
          pinHash: await hashPin(name, pin),
          createdAt: Date.now(),
          updated: Date.now(),
        };
        await KV.put(STORAGE_KEY, JSON.stringify(all));
        return json({ ok: true, registered: true });
      }

      // Update — must match PIN
      if (!existing) return json({ error: 'Igrač ne postoji. Prvo se registruj.' }, 404);

      const pin = sanitizePin(body.pin) || sanitizePin(request.headers.get('X-Pin'));
      if (!pin) return json({ error: 'PIN je obavezan' }, 400);

      const wantHash = await hashPin(name, pin);
      if (wantHash !== existing.pinHash) {
        return json({ error: 'Pogrešan PIN' }, 401);
      }

      // Update lists, keep phone + pinHash
      all[key] = {
        ...existing,
        have: sanitizeList(body.have),
        need: sanitizeList(body.need),
        rare: sanitizeList(body.rare),
        updated: Date.now(),
      };
      await KV.put(STORAGE_KEY, JSON.stringify(all));
      return json({ ok: true });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const name = sanitizeName(url.searchParams.get('name'));
      if (!name) return json({ error: 'Ime je obavezno' }, 400);

      const key = name.toLowerCase();
      const all = (await KV.get(STORAGE_KEY, 'json')) || {};
      const existing = all[key];
      if (!existing) return json({ error: 'Igrač ne postoji' }, 404);

      const pin = sanitizePin(request.headers.get('X-Pin'));
      if (!pin) return json({ error: 'PIN je obavezan' }, 400);

      const wantHash = await hashPin(name, pin);
      if (wantHash !== existing.pinHash) {
        return json({ error: 'Pogrešan PIN' }, 401);
      }

      delete all[key];
      await KV.put(STORAGE_KEY, JSON.stringify(all));
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}
