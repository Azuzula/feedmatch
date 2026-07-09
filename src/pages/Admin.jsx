import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import ApiDocs from '@/components/ApiDocs';
import { Loader2, Save, ShieldAlert } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.list().then((r) => setSettings(r[0] || {}));
    base44.entities.User.list().then(setUsers).catch(() => setUsers([]));
  }, []);

  if (!user) return null;
  if (user.role !== 'admin') {
    return <div className="p-10 flex items-center gap-3 text-muted-foreground"><ShieldAlert className="w-5 h-5" /> Tato sekce je přístupná pouze administrátorům.</div>;
  }
  if (!settings) return <div className="p-8 text-muted-foreground">Načítám…</div>;

  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) await base44.entities.AppSettings.update(settings.id, settings);
      else await base44.entities.AppSettings.create(settings);
    } catch (e) { alert(e.response?.data?.error || e.message); }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-heading font-bold">Administrace</h1>
      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="provider">
          <AccordionTrigger className="text-sm">Údaje poskytovatele služby</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Jméno / název</Label><Input value={settings.provider_name || ''} onChange={(e) => set('provider_name', e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Ulice</Label><Input value={settings.provider_street || ''} onChange={(e) => set('provider_street', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Město</Label><Input value={settings.provider_city || ''} onChange={(e) => set('provider_city', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">PSČ</Label><Input value={settings.provider_zip || ''} onChange={(e) => set('provider_zip', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Země</Label><Input value={settings.provider_country || ''} onChange={(e) => set('provider_country', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">IČO</Label><Input value={settings.provider_ico || ''} onChange={(e) => set('provider_ico', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">E-mail</Label><Input value={settings.provider_email || ''} onChange={(e) => set('provider_email', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefon</Label><Input value={settings.provider_phone || ''} onChange={(e) => set('provider_phone', e.target.value)} /></div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="bank">
          <AccordionTrigger className="text-sm">Bankovní spojení & ceny</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Účet CZ</Label><Input value={settings.bank_account_cz || ''} onChange={(e) => set('bank_account_cz', e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">IBAN</Label><Input value={settings.iban || ''} onChange={(e) => set('iban', e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">SWIFT</Label><Input value={settings.swift || ''} onChange={(e) => set('swift', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Cena CZK / rok</Label><Input type="number" value={settings.price_czk ?? 690} onChange={(e) => set('price_czk', Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Cena EUR / rok</Label><Input type="number" value={settings.price_eur ?? 27} onChange={(e) => set('price_eur', Number(e.target.value))} /></div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="content">
          <AccordionTrigger className="text-sm">Veřejné stránky & roadmapa</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Obchodní podmínky (markdown)</Label><Textarea rows={4} value={settings.terms_html || ''} onChange={(e) => set('terms_html', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">GDPR (markdown)</Label><Textarea rows={4} value={settings.privacy_html || ''} onChange={(e) => set('privacy_html', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Přístupnost (markdown)</Label><Textarea rows={4} value={settings.accessibility_html || ''} onChange={(e) => set('accessibility_html', e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Odkaz na roadmapu</Label><Input value={settings.roadmap_url || ''} onChange={(e) => set('roadmap_url', e.target.value)} placeholder="https://github.com/…" /></div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="users">
          <AccordionTrigger className="text-sm">Uživatelé ({users.length})</AccordionTrigger>
          <AccordionContent>
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="truncate">{u.email}</span>
                  <span className="text-xs text-muted-foreground">{u.subscription_status} · {u.role}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="api">
          <AccordionTrigger className="text-sm">API dokumentace pro doplněk</AccordionTrigger>
          <AccordionContent><ApiDocs /></AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button className="mt-4" onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Uložit nastavení</Button>
    </div>
  );
}