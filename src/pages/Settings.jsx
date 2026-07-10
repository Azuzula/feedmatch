import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Copy, RefreshCw, Loader2, Check } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [regen, setRegen] = useState(false);
  const [billing, setBilling] = useState({
    billing_name: user?.billing_name || '', billing_company: user?.billing_company || '',
    billing_street: user?.billing_street || '', billing_city: user?.billing_city || '',
    billing_zip: user?.billing_zip || '', billing_country: user?.billing_country || 'CZ', billing_ico: user?.billing_ico || ''
  });
  const [savingBilling, setSavingBilling] = useState(false);

  useEffect(() => { base44.entities.ApiKey.list('-created_date', 1).then((r) => setApiKey(r[0]?.api_key || '')).catch(() => {}); }, []);

  const regenKey = async () => {
    setRegen(true);
    try { const res = await base44.functions.invoke('regenerateApiKey', {}); setApiKey(res.data.api_key); }
    catch (e) { alert(e.response?.data?.error || e.message); }
    setRegen(false);
  };
  const copyKey = () => { navigator.clipboard?.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const saveBilling = async () => {
    setSavingBilling(true);
    try { await base44.auth.updateMe(billing); } catch (e) { alert(e.response?.data?.error || e.message); }
    setSavingBilling(false);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-heading font-bold">Nastavení</h1>
      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="api">
          <AccordionTrigger className="text-sm">API klíč pro doplněk</AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-3">Tento klíč vložíte do Chrome doplňku. Po expiraci předplatného přestane fungovat.</p>
            <div className="flex gap-2">
              <Input readOnly value={apiKey || '—'} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={copyKey}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
              <Button size="sm" variant="outline" onClick={regenKey} disabled={regen}>{regen ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regen.</Button>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="billing">
          <AccordionTrigger className="text-sm">Fakturační adresa</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Jméno</Label><Input value={billing.billing_name} onChange={(e) => setBilling({ ...billing, billing_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Firma</Label><Input value={billing.billing_company} onChange={(e) => setBilling({ ...billing, billing_company: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Ulice</Label><Input value={billing.billing_street} onChange={(e) => setBilling({ ...billing, billing_street: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Město</Label><Input value={billing.billing_city} onChange={(e) => setBilling({ ...billing, billing_city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">PSČ</Label><Input value={billing.billing_zip} onChange={(e) => setBilling({ ...billing, billing_zip: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Země</Label><Input value={billing.billing_country} onChange={(e) => setBilling({ ...billing, billing_country: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">IČO (volitelné)</Label><Input value={billing.billing_ico} onChange={(e) => setBilling({ ...billing, billing_ico: e.target.value })} /></div>
            </div>
            <Button className="mt-4" size="sm" onClick={saveBilling} disabled={savingBilling}>{savingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Uložit</Button>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="lang">
          <AccordionTrigger className="text-sm">Jazyk</AccordionTrigger>
          <AccordionContent>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cz">Čeština</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}