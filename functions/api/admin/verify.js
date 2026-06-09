// Verify admin password — used by admin.html to confirm before showing data
import { corsHeaders, json, checkAdminPass } from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!checkAdminPass(request, env)) return json({ error: 'Pogrešna lozinka' }, 401);
  return json({ ok: true });
}
