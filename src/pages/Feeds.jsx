import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FeedColumnMapper from '@/components/FeedColumnMapper';
import { Plus, RefreshCw, Pencil, Trash2, Loader2, Search } from 'lucide-react';

const EMPTY = { name: '', url: '', format: 'xml_heureka', delimiter: ',', encoding: 'utf-8', sync_time: '03:00', mapping: {} };

export default function Feeds() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [fields, setFields] = useState([]);
  const [sample, setSample] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(null);

  const load = () => { setLoading(true); base44.entities.Feed.list('-updated_date').then((r) => { setFeeds(r); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setFields([]); setSample([]); setOpen(true); };
  const openEdit = (f) => { setForm({ ...f, mapping: f.mapping || {} }); setEditId(f.id); setFields([]); setSample([]); setOpen(true); };

  const preview = async () => {
    setPreviewing(true);
    try {
      const res = await base44.functions.invoke('previewFeed', { url: form.url, format: form.format, delimiter: form.delimiter, encoding: form.encoding || 'utf-8' });
      setFields(res.data.fields || []);
      setSample(res.data.sampleRows || []);
      if (res.data.itemPath && !form.mapping.item_path) setForm({ ...form, mapping: { ...form.mapping, item_path: res.data.itemPath } });
    } catch (e) { alert('Nepodařilo se stáhnout feed: ' + (e.response?.data?.error || e.message)); }
    setPreviewing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await base44.entities.Feed.update(editId, form);
      else await base44.entities.Feed.create(form);
      setOpen(false); load();
    } catch (e) { alert('Chyba: ' + (e.response?.data?.error || e.message)); }
    setSaving(false);
  };

  const sync = async (f) => {
    setSyncing(f.id);
    try { await base44.functions.invoke('syncFeed', { feed_id: f.id }); load(); }
    catch (e) { alert('Sync selhal: ' + (e.response?.data?.error || e.message)); }
    setSyncing(null);
  };

  const del = async (f) => { if (confirm('Smazat feed ' + f.name + '?')) { await base44.entities.Feed.delete(f.id); await base44.entities.Product.deleteMany({ feed_id: f.id }); load(); } };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Feed</h1>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Přidat feed</Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Napojte feed z vašeho e-shopu (XML Heureka nebo CSV/TSV).</p>

      {loading ? <div className="mt-8 text-muted-foreground">Načítám…</div> : (
        <div className="mt-6 space-y-3">
          {feeds.length === 0 && <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">Zatím žádný feed.</div>}
          {feeds.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground truncate font-mono">{f.url}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.format} · sync {f.sync_time} · {f.product_count || 0} produktů · {f.last_sync_status}{f.last_sync_error ? ' · ' + f.last_sync_error : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => sync(f)} disabled={syncing === f.id}>
                    {syncing === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(f)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Upravit feed' : 'Nový feed'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Název</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Formát</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xml_heureka">XML (Heureka)</SelectItem>
                    <SelectItem value="xml_custom">XML (vlastní)</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="tsv">TSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">URL feedu</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://eshop.cz/feed.xml" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Čas denní synchronizace</Label><Input type="time" value={form.sync_time} onChange={(e) => setForm({ ...form, sync_time: e.target.value })} /></div>
              {(form.format === 'csv') && <div className="space-y-1.5"><Label className="text-xs">Oddělovač</Label><Input value={form.delimiter} onChange={(e) => setForm({ ...form, delimiter: e.target.value })} maxLength={1} /></div>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kódování feedu</Label>
              <Select value={form.encoding || 'utf-8'} onValueChange={(v) => setForm({ ...form, encoding: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="windows-1250">Windows-1250 (CZ)</SelectItem>
                  <SelectItem value="iso-8859-2">ISO-8859-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={preview} disabled={!form.url || previewing}>
              {previewing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />} Detekovat sloupce
            </Button>
            {fields.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-md bg-secondary p-3 text-xs overflow-x-auto">
                  <div className="text-muted-foreground mb-1">Ukázka:</div>
                  <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(sample[0] || {}, null, 1).slice(0, 400)}</pre>
                </div>
                <FeedColumnMapper fields={fields} mapping={form.mapping} onChange={(m) => setForm({ ...form, mapping: m })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.url}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}