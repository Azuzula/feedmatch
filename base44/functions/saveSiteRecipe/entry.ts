import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * POST /functions/saveSiteRecipe
 * { domain, recipe, base_version, source, stats: { items, matched, url } }
 * Doplněk sem pošle recept, který na stránce opravdu dal shodu s feedem.
 * Recept se sloučí s tím, co už server zná, a dostanou ho všichni uživatelé.
 * → { ok, version, recipe }
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
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const { owner, error } = await ownerFromApiKey(base44, req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const domain = normDomain(body.domain);
    if (!domain) return Response.json({ error: 'domain required' }, { status: 400 });
    if (!(await tracksDomain(base44, owner.id, domain))) {
      return Response.json({ error: 'Domain is not tracked by this account' }, { status: 403 });
    }

    const incoming = cleanRecipe(body.recipe);
    if (!incoming.lists.length && !incoming.details.length) {
      return Response.json({ error: 'Recipe is empty or invalid' }, { status: 400 });
    }
    const stats = {
      items: Number(body.stats?.items) || 0,
      matched: Number(body.stats?.matched) || 0,
      url: String(body.stats?.url || '').slice(0, 300),
    };
    if (stats.matched < 1) return Response.json({ error: 'Recipe has no confirmed match' }, { status: 400 });
    const source = body.source === 'manual' ? 'manual' : 'ai';

    const sr = base44.asServiceRole;
    const recs = await sr.entities.SiteRecipe.filter({ domain }, '-updated_date', 1);
    const current = recs[0] || null;

    // nové specifikace dopředu, známé (s jiným item/name) zůstávají za nimi
    const recipe = mergeRecipes(incoming, current?.recipe);
    const version = (current?.version || 0) + 1;
    const data = { domain, recipe, version, source, stats, updated_by_user_id: owner.id };
    if (current) await sr.entities.SiteRecipe.update(current.id, data);
    else await sr.entities.SiteRecipe.create(data);

    // historie verzí — kdyby někdo nasdílel špatný recept, jde se vrátit
    await sr.entities.SiteRecipeEvent.create({
      domain, kind: 'save', user_id: owner.id, day: today(), url: stats.url, ok: true, version, recipe, stats,
    });
    return Response.json({ ok: true, version, recipe });
  } catch (error) {
    console.error('saveSiteRecipe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
