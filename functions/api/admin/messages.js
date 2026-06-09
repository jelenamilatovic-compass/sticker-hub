// Admin chat moderation — view + delete messages
import { MSG_KEY, corsHeaders, json, checkAdminPass } from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.STICKERS;

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!KV) return json({ error: 'KV not bound' }, 500);
  if (!checkAdminPass(request, env)) return json({ error: 'Nije autorizovano' }, 401);

  try {
    if (request.method === 'GET') {
      const msgs = (await KV.get(MSG_KEY, 'json')) || [];
      return json({ messages: msgs });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      const clearAll = url.searchParams.get('all') === 'true';

      if (clearAll) {
        await KV.put(MSG_KEY, JSON.stringify([]));
        return json({ ok: true, cleared: true });
      }

      if (!id) return json({ error: 'Id je obavezan' }, 400);
      const msgs = (await KV.get(MSG_KEY, 'json')) || [];
      const filtered = msgs.filter(m => m.id !== id);
      await KV.put(MSG_KEY, JSON.stringify(filtered));
      return json({ ok: true, removed: msgs.length - filtered.length });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}
