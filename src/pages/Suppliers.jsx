import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY = { domain: '', label: '', category_filter: [], notes: '' };

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [catText, setCatText] = useState('');

  const load = () => { setLoading(true); base44.entities.SupplierDomain.list('-updated_date').then((r) => { setItems(r); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setCatText(''); setOpen(true); };
  const openEdit = (d) => { setForm({ ...d, category_filter: d.category_filter || [] }); setCatText((d.category_filter || []).join(', ')); setEditId(d.id); setOpen(true); };

  const save = async () => {
    const payload = { ...form, category_filter: catText.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (editId) await base44.entities.SupplierDomain.update(editId, payload);
      else await base44.entities.SupplierDomain.create(payload);
      setOpen(false); load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };
  const del = async (d) => { if (confirm('Smazat?')) { await base44.entities.SupplierDomain.delete(d.id); load(); } };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dodavatelé</h1>
          <p className="mt-1 text-sm text-muted-foreground">Nastavte, které kategorie z vašeho feedu se prohledávají na kterém webu dodavatele. Bez nastavení se prohledává celý feed.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
      </div>

      {loading ? <div className="mt-8 text-muted-foreground">Načítám…</div> : (
        <div className="mt-6 space-y-3">
          {items.length === 0 && <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">Žádní dodavatelé. Bez nastavení doplněk prohledává celý feed.</div>}
          {items.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="font-medium">{d.label || d.domain}</div>
                <div className="text-xs text-muted-foreground font-mono">{d.domain}</div>
                <div className="text-xs text-muted-foreground mt-1">Kategorie: {d.category_filter?.length ? d.category_filter.join(', ') : 'všechny'}</div>
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
            <div className="space-y-1.5"><Label className="text-xs">Kategorie z feedu (čárkou oddělené, prázdné = všechny)</Label><Input value={catText} onChange={(e) => setCatText(e.target.value)} placeholder="Filament, Tiskárny" /></div>
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