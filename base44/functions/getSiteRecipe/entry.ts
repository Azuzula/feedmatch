import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * GET /functions/getSiteRecipe?domain=dodavatel.cz
 * Sdílený recept (CSS selektory) pro web dodavatele. Volá doplněk 1× denně.
 * → { recipe: { lists, details } | null, version: number | null }
 */
/* ---- společné pomocné funkce (každá funkce je samostatný soubor, proto se opakují) ---- */

const MAX_LISTS = 6;
const MAX_DETAILS = 4;
const SEL_KEYS = ['item', 'name', 'link', 'code', 'ean', 'badge'];
const ATTR_KEYS = ['nameAttr', 'codeAttr', 'eanAttr'];

function normDomain(d: unknown) {
  return String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

/** Uživatel podle API klíče doplňku (stejně jako getDomainsForExtension). */
async function ownerFromApiKey(base44: any, req: Request) {
  const auth = req.headers.get('authorization') || '';
  const apiKey = auth.replace(/^Bearer\s+/i, '').trim();
  if (!apiKey) return { error: Response.json({ error: 'Missing API key' }, { status: 401 }) };
  const keys = await base44.asServiceRole.entities.ApiKey.filter({ api_key: apiKey });
  if (!keys.length) return { error: Response.json({ error: 'Invalid API key' }, { status: 401 }) };
  const owner = await base44.asServiceRole.entities.User.get(keys[0].created_by_id);
  if (!owner) return { error: Response.json({ error: 'Invalid API key' }, { status: 401 }) };
  return { owner };
}

/** Má uživatel tuhle doménu mezi svými sledovanými dodavateli? */
async function tracksDomain(base44: any, ownerId: string, domain: string) {
  const list = await base44.asServiceRole.entities.SupplierDomain.filter({ created_by_id: ownerId }, '-updated_date', 500);
  return list.some((d: any) => normDomain(d.domain) === domain);
}

function cleanSelector(v: unknown) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > 300 || /[<{}]/.test(s)) return null;
  return s;
}

function cleanSpec(spec: any, kind: 'list' | 'detail') {
  if (!spec || typeof spec !== 'object') return null;
  const out: Record<string, string> = {};
  for (const k of SEL_KEYS) {
    if (kind === 'detail' && (k === 'item' || k === 'link')) continue;
    const s = cleanSelector(spec[k]);
    if (s) out[k] = s;
  }
  for (const k of ATTR_KEYS) {
    const v = spec[k];
    if (typeof v === 'string' && /^[a-zA-Z_][\w:.-]{0,60}$/.test(v) && !/^on/i.test(v)) out[k] = v;
  }
  if (['append', 'prepend', 'after', 'before'].includes(spec.badgePos)) out.badgePos = spec.badgePos;
  if (kind === 'list' && !out.item) return null;
  if (kind === 'detail' && !out.name) return null;
  return out;
}

/** Vyčistí recept; cokoli podezřelého zahodí. */
function cleanRecipe(r: any) {
  const src = r && typeof r === 'object' ? r : {};
  const arr = (many: any, one: any) => (Array.isArray(many) ? many : one ? [one] : []);
  return {
    lists: arr(src.lists, src.list).map((s: any) => cleanSpec(s, 'list')).filter(Boolean).slice(0, MAX_LISTS),
    details: arr(src.details, src.detail).map((s: any) => cleanSpec(s, 'detail')).filter(Boolean).slice(0, MAX_DETAILS),
  };
}

/** Sloučí recepty; při stejném `item` / `name` vyhrává ten dřívější v pořadí. */
function mergeRecipes(...recipes: any[]) {
  const out = { lists: [] as any[], details: [] as any[] };
  const seenL = new Set<string>();
  const seenD = new Set<string>();
  for (const r of recipes) {
    const c = cleanRecipe(r);
    for (const s of c.lists) { if (!seenL.has(s.item)) { seenL.add(s.item); out.lists.push(s); } }
    for (const s of c.details) { if (!seenD.has(s.name)) { seenD.add(s.name); out.details.push(s); } }
  }
  out.lists = out.lists.slice(0, MAX_LISTS);
  out.details = out.details.slice(0, MAX_DETAILS);
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { owner, error } = await ownerFromApiKey(base44, req);
    if (error) return error;

    const domain = normDomain(new URL(req.url).searchParams.get('domain'));
    if (!domain) return Response.json({ error: 'domain required' }, { status: 400 });
    if (!(await tracksDomain(base44, owner.id, domain))) {
      return Response.json({ error: 'Domain is not tracked by this account' }, { status: 403 });
    }

    const recs = await base44.asServiceRole.entities.SiteRecipe.filter({ domain }, '-updated_date', 1);
    if (!recs.length) return Response.json({ recipe: null, version: null });
    const recipe = cleanRecipe(recs[0].recipe);
    const empty = !recipe.lists.length && !recipe.details.length;
    return Response.json({ recipe: empty ? null : recipe, version: empty ? null : recs[0].version || 1 });
  } catch (error) {
    console.error('getSiteRecipe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
