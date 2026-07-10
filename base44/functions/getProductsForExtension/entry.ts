import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = req.headers.get('authorization') || '';
    const apiKey = auth.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) return Response.json({ error: 'Missing API key' }, { status: 401 });

    const keys = await base44.asServiceRole.entities.ApiKey.filter({ api_key: apiKey });
    if (!keys.length) return Response.json({ error: 'Invalid API key' }, { status: 401 });
    const owner = await base44.asServiceRole.entities.User.get(keys[0].created_by_id);
    if (!owner) return Response.json({ error: 'Invalid API key' }, { status: 401 });

    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '3000'), 5000);

    let categoryFilter: string[] | null = null;
    let feedFilter: string | null = null;
    if (domain) {
      const domains = await base44.asServiceRole.entities.SupplierDomain.filter({ created_by_id: owner.id, domain });
      if (domains.length) {
        if (domains[0].feed_id) feedFilter = domains[0].feed_id;
        if (domains[0].category_filter?.length) categoryFilter = domains[0].category_filter;
      }
    }
    const query: any = { created_by_id: owner.id };
    if (feedFilter) query.feed_id = feedFilter;
    if (categoryFilter) query.category = { $in: categoryFilter };

    const products = await base44.asServiceRole.entities.Product.filter(query, '-updated_date', limit);
    const data = products.map((p) => ({
      id: p.id, name: p.name, ean: p.ean, supplier_code: p.supplier_code,
      purchase_price: p.purchase_price, sale_price: p.sale_price,
      stock_qty: p.stock_qty, stock_unit: p.stock_unit, category: p.category,
      alternative_names: p.alternative_names, name_normalized: p.name_normalized, tokens: p.tokens, alt_tokens: p.alt_tokens
    }));
    return Response.json({ products: data, count: data.length, cached_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});