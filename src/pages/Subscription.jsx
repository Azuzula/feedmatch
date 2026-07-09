import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, FileText, CheckCircle2 } from 'lucide-react';

export default function Subscription() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [currency, setCurrency] = useState('czk');
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();

  const load = () => {
    base44.entities.AppSettings.list().then((r) => setSettings(r[0] || {}));
    base44.entities.Invoice.list('-issued_date').then(setInvoices);
  };
  useEffect(() => { load(); }, []);

  const startStripe = async () => {
    if (window.self !== window.top) { alert('Platba kartou funguje pouze z publikované aplikace, ne z náhledu.'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('createStripeCheckout', { currency });
      window.location.href = res.data.url;
    } catch (e) { alert(e.response?.data?.error || e.message); setBusy(false); }
  };

  const createBankInvoice = async () => {
    setBusy(true);
    try {
      const amt = currency === 'eur' ? (settings.price_eur || 27) : (settings.price_czk || 690);
      const cur = currency.toUpperCase();
      const today = new Date();
      const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const vs = String(Date.now()).slice(-10);
      const num = 'FS-' + today.getFullYear() + '-' + String(invoices.length + 1).padStart(4, '0');
      await base44.entities.Invoice.create({
        number: num, amount: amt, currency: cur, status: 'pending',
        issued_date: today.toISOString().slice(0, 10),
        period_start: today.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        variable_symbol: vs, payment_method: 'bank_transfer'
      });
      load(); setBusy(false);
    } catch (e) { alert(e.response?.data?.error || e.message); setBusy(false); }
  };

  const finalizePaid = async (inv) => {
    setBusy(true);
    try { await base44.functions.invoke('generateInvoice', { invoice_id: inv.id }); load(); } catch (e) { alert(e.response?.data?.error || e.message); }
    setBusy(false);
  };

  if (!settings) return <div className="p-8 text-muted-foreground">Načítám…</div>;
  const price = currency === 'eur' ? settings.price_eur : settings.price_czk;
  const cur = currency.toUpperCase();
  const status = user?.subscription_status || 'trial';
  const pending = invoices.find((i) => i.status === 'pending' && i.payment_method === 'bank_transfer');

  const spayd = pending && settings.iban
    ? `SPD*1.0*ACC:${settings.iban.replace(/\s/g, '')}*AM:${pending.amount.toFixed(2)}*CC:${pending.currency}*MSG:FeedSpy predplatne*X-VS:${pending.variable_symbol}*`
    : '';
  const qrUrl = spayd ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(spayd)}` : '';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-heading font-bold">Předplatné & Faktury</h1>

      <div className="mt-4 rounded-lg border border-border bg-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Stav</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'destructive'}>
              {status === 'active' ? 'Aktivní' : status === 'trial' ? 'Trial' : 'Expirováno'}
            </Badge>
            {user?.subscription_expiry && <span className="text-sm text-muted-foreground">do {user.subscription_expiry}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={currency === 'czk' ? 'default' : 'outline'} onClick={() => setCurrency('czk')}>CZK</Button>
          <Button size="sm" variant={currency === 'eur' ? 'default' : 'outline'} onClick={() => setCurrency('eur')}>EUR</Button>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3"><CreditCard className="w-4 h-4 text-primary" /><h2 className="font-semibold">Platba kartou (Stripe)</h2></div>
          <div className="text-3xl font-heading font-bold">{price} {cur}<span className="text-sm font-normal text-muted-foreground"> / rok</span></div>
          <p className="text-xs text-muted-foreground mt-1">Neplátce DPH, cena včetně DPH.</p>
          <Button className="w-full mt-4" onClick={startStripe} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Zaplatit kartou / Google Pay</Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-primary" /><h2 className="font-semibold">Převod na účet</h2></div>
          {pending ? (
            <div className="space-y-2 text-sm">
              {qrUrl && <img src={qrUrl} alt="QR platba" className="w-40 h-40 rounded-md bg-white p-1" />}
              <div className="text-xs text-muted-foreground">Číslo účtu: <span className="font-mono text-foreground">{settings.bank_account_cz || '—'}</span></div>
              {settings.iban && <div className="text-xs text-muted-foreground">IBAN: <span className="font-mono text-foreground">{settings.iban}</span></div>}
              {settings.swift && <div className="text-xs text-muted-foreground">SWIFT: <span className="font-mono text-foreground">{settings.swift}</span></div>}
              <div className="text-xs text-muted-foreground">VS: <span className="font-mono text-foreground">{pending.variable_symbol}</span></div>
              <div className="text-xs text-muted-foreground">Částka: <span className="text-foreground">{pending.amount} {pending.currency}</span></div>
              <Button size="sm" className="w-full mt-2" onClick={() => finalizePaid(pending)} disabled={busy}><CheckCircle2 className="w-4 h-4 mr-1" /> Zaplaceno — vygenerovat fakturu</Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={createBankInvoice} disabled={busy}>Vygenerovat platební údaje</Button>
          )}
        </div>
      </div>

      {searchParams.get('status') === 'success' && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">Platba proběhla. Fakturu vygenerujete níže.</div>
      )}

      <div className="mt-8">
        <h2 className="font-semibold mb-3">Faktury</h2>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {invoices.length === 0 && <div className="p-4 text-sm text-muted-foreground">Žádné faktury.</div>}
          {invoices.map((inv) => (
            <div key={inv.id} className="p-3 flex items-center justify-between gap-3 flex-wrap text-sm">
              <div className="font-mono text-xs">{inv.number}</div>
              <div className="text-xs text-muted-foreground">{inv.issued_date}</div>
              <div className="text-xs">{inv.amount} {inv.currency}</div>
              <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
              {inv.pdf_url ? (
                <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">PDF</a>
              ) : inv.status === 'pending' ? (
                <Button size="sm" variant="ghost" onClick={() => finalizePaid(inv)} disabled={busy}>Označit zaplaceno</Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}