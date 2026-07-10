import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const key = 'fsk_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const existing = await base44.entities.ApiKey.filter({ created_by_id: user.id });
    if (existing.length) await base44.entities.ApiKey.deleteMany({ created_by_id: user.id });
    await base44.entities.ApiKey.create({ api_key: key });
    return Response.json({ api_key: key });
  } catch (error) {
    console.error('regenerateApiKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});