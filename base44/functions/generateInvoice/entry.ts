import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { invoice_id } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoice = await base44.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings[0] || {};

    const doc = new jsPDF();
    doc.setFontSize(20); doc.text('Faktura / Invoice', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Dodavatel / Provider:', 14, 40);
    doc.text(s.provider_name || '', 14, 46);
    doc.text([s.provider_street, s.provider_zip + ' ' + s.provider_city, s.provider_country].filter(Boolean).join(', '), 14, 52);
    doc.text('IČO: ' + (s.provider_ico || ''), 14, 58);
    doc.text(s.provider_email || '', 14, 64);

    doc.text('Odběratel / Customer:', 120, 40);
    const cust = [user.billing_name || user.billing_company || user.email, user.billing_street, user.billing_zip + ' ' + user.billing_city, user.billing_country].filter(Boolean);
    cust.forEach((line, i) => doc.text(line, 120, 46 + i * 6));
    if (user.billing_ico) doc.text('IČO: ' + user.billing_ico, 120, 46 + cust.length * 6);

    doc.text('Číslo faktury: ' + invoice.number, 14, 85);
    doc.text('Variabilní symbol: ' + (invoice.variable_symbol || ''), 14, 91);
    doc.text('Datum vystavení: ' + (invoice.issued_date || ''), 14, 97);
    doc.text('Období: ' + (invoice.period_start || '') + ' — ' + (invoice.period_end || ''), 14, 103);

    doc.setFillColor(240, 240, 240); doc.rect(14, 112, 182, 10, 'F');
    doc.text('Popis', 16, 119); doc.text('Množství', 120, 119); doc.text('Cena', 170, 119);
    doc.text('Roční předplatné FeedSpy', 16, 129);
    doc.text('1', 120, 129);
    doc.text(invoice.amount + ' ' + invoice.currency, 170, 129);

    doc.setFontSize(12);
    doc.text('Celkem k úhradě (vč. DPH): ' + invoice.amount + ' ' + invoice.currency, 14, 145);
    doc.setFontSize(8);
    doc.text('Neplátce DPH. Cena je uvedena včetně DPH.', 14, 151);

    if (s.bank_account_cz) doc.text('Bankovní účet CZ: ' + s.bank_account_cz, 14, 165);
    if (s.iban) doc.text('IBAN: ' + s.iban, 14, 171);
    if (s.swift) doc.text('SWIFT: ' + s.swift, 14, 177);

    const pdfBytes = doc.output('arraybuffer');
    const upload = await base44.integrations.Core.UploadFile({ file: new Blob([pdfBytes], { type: 'application/pdf' }) as any });
    await base44.entities.Invoice.update(invoice_id, { pdf_url: upload.file_url, status: 'paid', paid_date: new Date().toISOString().slice(0, 10) });
    await base44.auth.updateMe({ subscription_status: 'active', subscription_expiry: invoice.period_end });
    return Response.json({ success: true, pdf_url: upload.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});