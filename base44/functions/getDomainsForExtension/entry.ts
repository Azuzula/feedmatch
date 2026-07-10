import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = req.headers.get('authorization') || '';
    const apiKey = auth.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) return Response.json({ error: 'Missing API key' }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.filter({ api_key: apiKey });
    if (!users.length) return Response.json({ error: 'Invalid API key' }, { status: 401 });
    const owner = users[0];
    if (owner.subscription_status === 'expired') {
      return Response.json({ error: 'Subscription expired' }, { status: 403 });
    }

    const domains = await base44.asServiceRole.entities.SupplierDomain.filter(
      { created_by_id: owner.id },
      '-updated_date',
      200
    );
    const data = domains.map((d) => ({
      domain: d.domain,
      label: d.label,
      feed_id: d.feed_id || null,
      has_category_filter: !!(d.category_filter && d.category_filter.length)
    }));
    return Response.json({ domains: data, count: data.length });
  } catch (error) {
    console.error('getDomainsForExtension error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});