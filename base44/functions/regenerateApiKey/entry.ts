import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const key = 'fsk_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await base44.auth.updateMe({ api_key: key });
    return Response.json({ api_key: key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});