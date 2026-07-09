import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, X, ChevronDown } from 'lucide-react';

export default function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [altInput, setAltInput] = useState({});
  const [busy, setBusy] = useState(null);

  const buildQuery = useCallback(() => {
    const q = {};
    if (search) q.name = { $regex: search, $options: 'i' };
    if (cursor) q.created_date = { $lt: cursor };
    return q;
  }, [search, cursor]);

  const fetchPage = useCallback(async (reset) => {
    if (reset) { setLoading(true); setCursor(null); setHasMore(true); setItems([]); }
    const q = reset ? (search ? { name: { $regex: search, $options: 'i' } } : {}) : buildQuery();
    const r = await base44.entities.Product.filter(q, '-created_date', 50);
    if (reset) setItems(r); else setItems((prev) => [...prev, ...r]);
    setHasMore(r.length === 50);
    if (r.length) setCursor(r[r.length - 1].created_date);
    setLoading(false); setLoadingMore(false);
  }, [search, buildQuery]);

  useEffect(() => { const t = setTimeout(() => fetchPage(true), 250); return () => clearTimeout(t); }, [search]);

  const addAlt = async (p) => {
    const name = (altInput[p.id] || '').trim();
    if (!name) return;
    setBusy(p.id);
    try {
      const res = await base44.functions.invoke('addAlternativeName', { product_id: p.id, name });
      setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, alternative_names: res.data.alternative_names } : x));
      setAltInput({ ...altInput, [p.id]: '' });
    } catch (e) { alert(e.response?.data?.error || e.message); }
    setBusy(null);
  };
  const delAlt = async (p, name) => {
    setBusy(p.id);
    try {
      const res = await base44.functions.invoke('addAlternativeName', { product_id: p.id, name, action: 'delete' });
      setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, alternative_names: res.data.alternative_names } : x));
    } catch (e) { alert(e.response?.data?.error || e.message); }
    setBusy(null);
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-heading font-bold">Produkty</h1>
      <p className="mt-1 text-sm text-muted-foreground">Načítání postupně po 50 produktech. Přidávejte alternativní názvy pro přesnější párování.</p>

      <div className="mt-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat produkt…" className="pl-9" />
      </div>

      {loading ? <div className="mt-8 text-muted-foreground">Načítám…</div> : (
        <div className="mt-4 space-y-2">
          {items.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">Žádné produkty. Nejdřív synchronizujte feed.</div>}
          {items.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{p.ean || '—'} · {p.supplier_code || '—'} · {p.category || ''}</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Sklad: <span className="text-foreground">{p.stock_qty != null ? `${p.stock_qty} ${p.stock_unit || ''}` : '—'}</span></span>
                  <span className="text-muted-foreground">Nákup: <span className="text-foreground">{p.purchase_price || '—'}</span></span>
                  <span className="text-muted-foreground">Prodej: <span className="text-foreground">{p.sale_price || '—'}</span></span>
                  {p.last_match_score != null && <Badge variant={p.last_match_score >= 70 ? 'default' : 'secondary'}>{p.last_match_score}%</Badge>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(p.alternative_names || []).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {a}
                    <button onClick={() => delAlt(p, a)} disabled={busy === p.id} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <Input value={altInput[p.id] || ''} onChange={(e) => setAltInput({ ...altInput, [p.id]: e.target.value })} placeholder="přidat alias…" className="h-7 w-40 text-xs" onKeyDown={(e) => e.key === 'Enter' && addAlt(p)} />
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => addAlt(p)} disabled={busy === p.id}>{busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}</Button>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center py-4">
              <Button variant="outline" size="sm" onClick={() => { setLoadingMore(true); fetchPage(false); }} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />} Načíst další
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}