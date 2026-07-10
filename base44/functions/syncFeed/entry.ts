import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { XMLParser } from 'npm:fast-xml-parser@4.4.1';

const UNIT_MAP: Record<string, string> = {
  kilogram: 'kg', kilogramy: 'kg', kilo: 'kg', kg: 'kg', gram: 'g', gramy: 'g', g: 'g',
  litr: 'l', litry: 'l', l: 'l', litr: 'l', mililitr: 'ml', mililitry: 'ml', ml: 'ml',
  metr: 'm', metry: 'm', m: 'm', centimetr: 'cm', centimetry: 'cm', cm: 'cm',
  milimetr: 'mm', milimetry: 'mm', mm: 'mm', kus: 'ks', kusy: 'ks', kusu: 'ks', ks: 'ks'
};
const COLOR_MAP: Record<string, string> = {
  violet: 'fialova', fialova: 'fialova', fialovou: 'fialova', purple: 'fialova',
  red: 'cervena', cervena: 'cervena', czerwona: 'cervena',
  blue: 'modra', modra: 'modra', modrou: 'modra',
  black: 'cerna', cerna: 'cerna', czerna: 'cerna',
  white: 'bila', bila: 'bila', bily: 'bila',
  green: 'zelena', zelena: 'zelena', zielony: 'zelena',
  yellow: 'zluta', zluta: 'zluta', zluty: 'zluta',
  orange: 'oranzova', oranzova: 'oranzova'
};

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeTokens(input: string): { normalized: string; tokens: string[] } {
  if (!input) return { normalized: '', tokens: [] };
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/(\d)[\s,]*([a-zA-Z]{2,})/g, (_m, d, u) => {
    const unit = UNIT_MAP[u] || COLOR_MAP[u] || u;
    return d + ' ' + unit;
  });
  Object.keys(COLOR_MAP).forEach((c) => {
    s = s.replace(new RegExp('\\b' + c + '\\b', 'g'), COLOR_MAP[c]);
  });
  s = s.replace(/\bprof\b\.?/g, 'professional');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  const tokens = s.split(' ').filter((t) => t.length > 1);
  return { normalized: tokens.join(' '), tokens };
}

function stripBom(s: string) {
  return s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
function detectDelimiter(text: string, preferred: string) {
  const firstLine = (text.split('\n')[0] || '');
  const candidates = [preferred, ';', '\t', ',', '|'];
  let best = preferred || ','; let bestCount = 0;
  for (const d of candidates) {
    if (!d) continue;
    let count = 0; let inQ = false;
    for (const c of firstLine) {
      if (c === '"') inQ = !inQ;
      else if (!inQ && c === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best || ',';
}
function parseCsv(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delimiter) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function getNested(obj: any, path: string) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function parseStock(qtyRaw: any, unitRaw: any) {
  let qty: number | null = null;
  let unit = '';
  const qStr = String(qtyRaw || '').trim();
  const uStr = String(unitRaw || '').trim();
  const m = qStr.match(/^(\d+[.,]?\d*)\s*([a-zA-Z]*)$/);
  if (m) {
    qty = parseFloat(m[1].replace(',', '.'));
    unit = m[2] ? (UNIT_MAP[m[2].toLowerCase()] || m[2].toLowerCase()) : uStr;
  } else {
    const n = qStr.match(/(\d+[.,]?\d*)/);
    if (n) qty = parseFloat(n[1].replace(',', '.'));
    unit = uStr;
  }
  if (unitRaw && !unit) unit = UNIT_MAP[uStr.toLowerCase()] || uStr.toLowerCase();
  return { qty, unit };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { feed_id } = body;
    if (!feed_id) return Response.json({ error: 'feed_id required' }, { status: 400 });

    const feed = await base44.entities.Feed.get(feed_id);
    if (!feed) return Response.json({ error: 'Feed not found' }, { status: 404 });

    await base44.entities.Feed.update(feed_id, { last_sync_status: 'pending' });

    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'FeedSpy/1.0' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.text();
      const m = feed.mapping || {};
      let records: any[] = [];

      if (feed.format === 'csv' || feed.format === 'tsv') {
        const clean = stripBom(raw);
        const delim = feed.format === 'tsv' ? '\t' : detectDelimiter(clean, feed.delimiter || ',');
        const rows = parseCsv(clean, delim);
        if (!rows.length) throw new Error('Empty CSV');
        const header = rows[0].map((h) => h.trim());
        const idx = (name: string) => header.indexOf(name);
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const get = (name: string) => name ? (r[idx(name)] || '').trim() : '';
          records.push({ name: get(m.name), ean: get(m.ean), supplier_code: get(m.supplier_code), purchase_price: get(m.purchase_price), sale_price: get(m.sale_price), stock_qty_raw: get(m.stock_qty), stock_unit_raw: get(m.stock_unit), category: get(m.category) });
        }
      } else {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const doc = parser.parse(raw);
        let items: any[] = [];
        if (m.item_path) {
          items = getNested(doc, m.item_path) || [];
        } else {
          const find = (o: any): any[] => {
            for (const k of Object.keys(o || {})) {
              if (Array.isArray(o[k]) && o[k].length && typeof o[k][0] === 'object') return o[k];
            }
            for (const k of Object.keys(o || {})) {
              if (typeof o[k] === 'object') { const r = find(o[k]); if (r) return r; }
            }
            return [];
          };
          items = find(doc);
        }
        records = items.map((it) => ({
          name: String(getNested(it, m.name) || '').trim(),
          ean: String(getNested(it, m.ean) || '').trim(),
          supplier_code: String(getNested(it, m.supplier_code) || '').trim(),
          purchase_price: String(getNested(it, m.purchase_price) || '').trim(),
          sale_price: String(getNested(it, m.sale_price) || '').trim(),
          stock_qty_raw: String(getNested(it, m.stock_qty) || '').trim(),
          stock_unit_raw: String(getNested(it, m.stock_unit) || '').trim(),
          category: String(getNested(it, m.category) || '').trim()
        }));
      }

      await base44.entities.Product.deleteMany({ feed_id });

      const toCreate = records
        .filter((r) => r.name)
        .map((r) => {
          const { normalized, tokens } = normalizeTokens(r.name);
          const altTokens = (r.alternative_names || []).flatMap((a: string) => normalizeTokens(a).tokens);
          const stock = parseStock(r.stock_qty_raw, r.stock_unit_raw);
          return {
            feed_id,
            name: r.name,
            ean: r.ean,
            supplier_code: r.supplier_code,
            purchase_price: r.purchase_price ? parseFloat(r.purchase_price.replace(',', '.')) : null,
            sale_price: r.sale_price ? parseFloat(r.sale_price.replace(',', '.')) : null,
            stock_qty: stock.qty,
            stock_unit: stock.unit,
            category: r.category,
            name_normalized: normalized,
            tokens,
            alternative_names: [],
            alt_tokens: altTokens
          };
        });

      let created = 0;
      const batch = 200;
      for (let i = 0; i < toCreate.length; i += batch) {
        const slice = toCreate.slice(i, i + batch);
        await base44.entities.Product.bulkCreate(slice);
        created += slice.length;
      }

      await base44.entities.Feed.update(feed_id, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: '',
        product_count: created
      });

      return Response.json({ success: true, count: created });
    } catch (e) {
      await base44.entities.Feed.update(feed_id, {
        last_sync_status: 'error',
        last_sync_error: e.message
      });
      return Response.json({ error: e.message }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});