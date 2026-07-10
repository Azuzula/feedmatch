import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { XMLParser } from 'npm:fast-xml-parser@4.4.1';

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
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
      } else { cur += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === delimiter) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') { cur += c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(x => x.trim()));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { url, format, delimiter = ',' } = body;
    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    const res = await fetch(url, { headers: { 'User-Agent': 'FeedSpy/1.0' } });
    if (!res.ok) return Response.json({ error: 'Feed download failed: ' + res.status }, { status: 502 });
    const raw = await res.text();
    const sample = raw.slice(0, 200000);

    if (format === 'csv' || format === 'tsv') {
      const clean = stripBom(sample);
      const delim = format === 'tsv' ? '\t' : detectDelimiter(clean, delimiter);
      const rows = parseCsv(clean, delim);
      if (!rows.length) return Response.json({ fields: [], sampleRows: [] });
      const fields = rows[0].map((h) => h.trim());
      const sampleRows = rows.slice(1, 6).map((r) => {
        const o: Record<string, string> = {};
        fields.forEach((f, i) => { o[f] = (r[i] || '').trim(); });
        return o;
      });
      return Response.json({ fields, sampleRows });
    }

    // XML
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(sample);
    const findItems = (obj: any, path = ''): { items: any[]; path: string } | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
          return { items: v, path: path ? path + '.' + k : k };
        }
      }
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object') {
          const r = findItems(obj[k], path ? path + '.' + k : k);
          if (r) return r;
        }
      }
      return null;
    };
    const found = findItems(doc);
    if (!found) return Response.json({ fields: [], sampleRows: [], itemPath: '' });
    const collectFields = (o: any, prefix = ''): string[] => {
      const out: string[] = [];
      if (!o || typeof o !== 'object') return out;
      for (const k of Object.keys(o)) {
        const p = prefix ? prefix + '.' + k : k;
        if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) {
          out.push(...collectFields(o[k], p));
        } else {
          out.push(p);
        }
      }
      return out;
    };
    const fields = collectFields(found.items[0]);
    const sampleRows = found.items.slice(0, 6).map((it) => {
      const o: Record<string, any> = {};
      const flatten = (obj: any, prefix = '') => {
        for (const k of Object.keys(obj || {})) {
          const p = prefix ? prefix + '.' + k : k;
          if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) flatten(obj[k], p);
          else o[p] = obj[k];
        }
      };
      flatten(it);
      return o;
    });
    return Response.json({ fields, sampleRows, itemPath: found.path });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});