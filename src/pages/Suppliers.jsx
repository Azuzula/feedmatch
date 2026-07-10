import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY = { domain: '', label: '', feed_id: '', category_filter: [], notes: '' };

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.SupplierDomain.list('-updated_date'),
      base44.entities.Feed.list('-updated_date'),
    ]).then(([s, f]) => { setItems(s); setFeeds(f); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const selectedFeed = feeds.find((f) => f.id === form.feed_id);
  const feedCategories = selectedFeed?.categories || [];

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (d) => { setForm({ ...d, category_filter: d.category_filter || [], feed_id: d.feed_id || '' }); setEditId(d.id); setOpen(true); };

  const toggleCat = (cat) => {
    const set = new Set(form.category_filter);
    if (set.has(cat)) set.delete(cat); else set.add(cat);
    setForm({ ...form, category_filter: Array.from(set) });
  };

  const save = async () => {
    try {
      if (editId) await base44.entities.SupplierDomain.update(editId, form);
      else await base44.entities.SupplierDomain.create(form);
      setOpen(false); load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };
  const del = async (d) => { if (confirm('Smazat?')) { await base44.entities.SupplierDomain.delete(d.id); load(); } };

  const feedName = (id) => feeds.find((f) => f.id === id)?.name || '—';

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dodavatelé</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vyberte feed a kategorie, které se mají pro danou doménu dodavatele stahovat do doplňku. Bez výběru kategorií se bere celý feed.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
      </div>

      {loading ? <div className="mt-8 text-muted-foreground">Načítám…</div> : (
        <div className="mt-6 space-y-3">
          {items.length === 0 && <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">Žádní dodavatelé. Bez nastavení doplněk stahuje celý feed.</div>}
          {items.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="font-medium">{d.label || d.domain}</div>
                <div className="text-xs text-muted-foreground font-mono">{d.domain}</div>
                <div className="text-xs text-muted-foreground mt-1">Feed: {feedName(d.feed_id)} · Kategorie: {d.category_filter?.length ? d.category_filter.join(', ') : 'všechny'}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Upravit dodavatele' : 'Nový dodavatel'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Doména dodavatele</Label><Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="dodavatel.cz" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Označení (volitelné)</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Feed</Label>
              <Select value={form.feed_id || '__none__'} onValueChange={(v) => setForm({ ...form, feed_id: v === '__none__' ? '' : v, category_filter: [] })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="— všechny feedy —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— všechny feedy —</SelectItem>
                  {feeds.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategorie z feedu {form.feed_id ? '(prázdné = celý feed)' : '(nejdřív vyberte feed)'}</Label>
              {form.feed_id ? (
                feedCategories.length ? (
                  <div className="rounded-md border border-border max-h-48 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {feedCategories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                        <Checkbox checked={form.category_filter.includes(cat)} onCheckedChange={() => toggleCat(cat)} />
                        <span className="truncate">{cat}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Feed zatím nemá kategorie. Spusťte synchronizaci feedu.</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Bez výběru feedu se do doplňku stahuje celý feed.</p>
              )}
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Poznámka</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button onClick={save} disabled={!form.domain}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}