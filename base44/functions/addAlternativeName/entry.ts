import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const UNIT_MAP: Record<string, string> = {
  kilogram: 'kg', kilogramy: 'kg', kilo: 'kg', kg: 'kg', gram: 'g', gramy: 'g', g: 'g',
  litr: 'l', litry: 'l', l: 'l', mililitr: 'ml', mililitry: 'ml', ml: 'ml',
  metr: 'm', metry: 'm', m: 'm', centimetr: 'cm', centimetry: 'cm', cm: 'cm',
  milimetr: 'mm', milimetry: 'mm', mm: 'mm', kus: 'ks', kusy: 'ks', kusu: 'ks', ks: 'ks'
};
const COLOR_MAP: Record<string, string> = {
  violet: 'fialova', fialova: 'fialova', purple: 'fialova', red: 'cervena', cervena: 'cervena',
  blue: 'modra', modra: 'modra', black: 'cerna', cerna: 'cerna', white: 'bila', bila: 'bila',
  green: 'zelena', zelena: 'zelena', yellow: 'zluta', zluta: 'zluta', orange: 'oranzova', oranzova: 'oranzova'
};
function stripDiacritics(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeTokens(input: string) {
  if (!input) return [] as string[];
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/(\d)[\s,]*([a-zA-Z]{2,})/g, (_m, d, u) => d + ' ' + (UNIT_MAP[u] || COLOR_MAP[u] || u));
  Object.keys(COLOR_MAP).forEach((c) => { s = s.replace(new RegExp('\\b' + c + '\\b', 'g'), COLOR_MAP[c]); });
  s = s.replace(/\bprof\b\.?/g, 'professional');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s.split(' ').filter((t) => t.length > 1);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { product_id, name, action } = body;
    if (!product_id || !name) return Response.json({ error: 'product_id and name required' }, { status: 400 });
    const product = await base44.entities.Product.get(product_id);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    const alts = product.alternative_names || [];
    let next = alts;
    if (action === 'delete') {
      next = alts.filter((a) => a !== name);
    } else {
      if (!alts.includes(name)) next = [...alts, name];
    }
    const altTokens = next.flatMap((a) => normalizeTokens(a));
    await base44.entities.Product.update(product_id, { alternative_names: next, alt_tokens: altTokens });
    return Response.json({ success: true, alternative_names: next, alt_tokens: altTokens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});