import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const UNIT_MAP: Record<string, string> = {
  kilogram: 'kg', kilogramy: 'kg', kilo: 'kg', kg: 'kg', gram: 'g', gramy: 'g', g: 'g',
  litr: 'l', litry: 'l', l: 'l', mililitr: 'ml', mililitry: 'ml', ml: 'ml',
  metr: 'm', metry: 'm', m: 'm', centimetr: 'cm', centimetry: 'cm', cm: 'cm',
  milimetr: 'mm', milimetry: 'mm', mm: 'mm', kus: 'ks', kusy: 'ks', kusu: 'ks', ks: 'ks'
};
const COLOR_MAP: Record<string, string> = {
  violet: 'fialova', fialova: 'fialova', purple: 'fialova',
  red: 'cervena', cervena: 'cervena', blue: 'modra', modra: 'modra',
  black: 'cerna', cerna: 'cerna', white: 'bila', bila: 'bila',
  green: 'zelena', zelena: 'zelena', yellow: 'zluta', zluta: 'zluta', orange: 'oranzova', oranzova: 'oranzova'
};

function stripDiacritics(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeTokens(input: string) {
  if (!input) return { normalized: '', tokens: [] as string[] };
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/(\d)[\s,]*([a-zA-Z]{2,})/g, (_m, d, u) => d + ' ' + (UNIT_MAP[u] || COLOR_MAP[u] || u));
  Object.keys(COLOR_MAP).forEach((c) => { s = s.replace(new RegExp('\\b' + c + '\\b', 'g'), COLOR_MAP[c]); });
  s = s.replace(/\bprof\b\.?/g, 'professional');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  const tokens = s.split(' ').filter((t) => t.length > 1);
  return { normalized: tokens.join(' '), tokens };
}
function levenshtein(a: string, b: string) {
  if (!a) return b.length; if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}
function scoreMatch(qTokens: string[], qNorm: string, pTokens: string[], pNorm: string) {
  const qSet = new Set(qTokens), pSet = new Set(pTokens);
  let overlap = 0;
  qSet.forEach((t) => { if (pSet.has(t)) overlap++; });
  const jaccard = (qTokens.length + pTokens.length) === 0 ? 0 : overlap / (qSet.size + pSet.size - overlap || 1);
  const maxLen = Math.max(qNorm.length, pNorm.length) || 1;
  const lev = 1 - levenshtein(qNorm, pNorm) / maxLen;
  return Math.round((jaccard * 0.6 + lev * 0.4) * 100);
}

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

    const body = await req.json().catch(() => ({}));
    const { text, ean, supplier_code, domain } = body;

    // category filter by domain
    let categoryFilter: string[] | null = null;
    if (domain) {
      const domains = await base44.asServiceRole.entities.SupplierDomain.filter({ created_by_id: owner.id, domain });
      if (domains.length && domains[0].category_filter?.length) {
        categoryFilter = domains[0].category_filter;
      }
    }

    const query: any = { created_by_id: owner.id };
    if (categoryFilter) query.category = { $in: categoryFilter };

    // exact matches first
    if (ean || supplier_code) {
      const exactQ: any = { created_by_id: owner.id, $or: [] };
      if (ean) exactQ.$or.push({ ean });
      if (supplier_code) exactQ.$or.push({ supplier_code });
      const exact = await base44.asServiceRole.entities.Product.filter(exactQ, '-updated_date', 5);
      if (exact.length) {
        const p = exact[0];
        const method = p.ean && p.ean === ean ? 'ean' : 'supplier_code';
        await base44.asServiceRole.entities.Product.update(p.id, { match_count: (p.match_count || 0) + 1, last_match_score: 100 });
        await base44.asServiceRole.entities.MatchLog.create({ query_text: text || '', query_ean: ean || '', domain: domain || '', score: 100, matched_product_id: p.id, matched_name: p.name, method });
        return Response.json({ match: { id: p.id, name: p.name, ean: p.ean, supplier_code: p.supplier_code, purchase_price: p.purchase_price, sale_price: p.sale_price, stock_qty: p.stock_qty, stock_unit: p.stock_unit, score: 100, method } });
      }
    }

    // fuzzy
    if (!text) {
      await base44.asServiceRole.entities.MatchLog.create({ query_text: '', query_ean: ean || '', domain: domain || '', score: 0, method: 'none' });
      return Response.json({ match: null });
    }
    const { normalized: qNorm, tokens: qTokens } = normalizeTokens(text);

    const products = await base44.asServiceRole.entities.Product.filter(query);
    let best: any = null;
    let bestScore = 0;
    for (const p of products) {
      const pNorm = p.name_normalized || '';
      const pTokens = p.tokens || [];
      const allTokens = [...pTokens, ...(p.alt_tokens || [])];
      const s = scoreMatch(qTokens, qNorm, allTokens, pNorm);
      if (s > bestScore) { bestScore = s; best = p; }
    }

    if (best && bestScore >= 50) {
      await base44.asServiceRole.entities.Product.update(best.id, { match_count: (best.match_count || 0) + 1, last_match_score: bestScore });
      await base44.asServiceRole.entities.MatchLog.create({ query_text: text, query_ean: ean || '', domain: domain || '', score: bestScore, matched_product_id: best.id, matched_name: best.name, method: 'fuzzy' });
      return Response.json({ match: { id: best.id, name: best.name, ean: best.ean, supplier_code: best.supplier_code, purchase_price: best.purchase_price, sale_price: best.sale_price, stock_qty: best.stock_qty, stock_unit: best.stock_unit, score: bestScore, method: 'fuzzy' } });
    }
    await base44.asServiceRole.entities.MatchLog.create({ query_text: text, query_ean: ean || '', domain: domain || '', score: bestScore, method: 'none' });
    return Response.json({ match: null, best_score: bestScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});