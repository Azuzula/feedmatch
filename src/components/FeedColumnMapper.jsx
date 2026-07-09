import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TARGETS = [
  { key: 'name', label: 'Název produktu' },
  { key: 'ean', label: 'EAN' },
  { key: 'supplier_code', label: 'Kód dodavatele' },
  { key: 'purchase_price', label: 'Nákupní cena' },
  { key: 'sale_price', label: 'Prodejní cena' },
  { key: 'stock_qty', label: 'Sklad — množství' },
  { key: 'stock_unit', label: 'Sklad — jednotka' },
  { key: 'category', label: 'Kategorie' },
];

export default function FeedColumnMapper({ fields, mapping, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TARGETS.map((tgt) => (
        <div key={tgt.key} className="space-y-1.5">
          <Label className="text-xs">{tgt.label}</Label>
          <Select value={mapping[tgt.key] || '__none__'} onValueChange={(v) => onChange({ ...mapping, [tgt.key]: v === '__none__' ? '' : v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="— neurčeno —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— neurčeno —</SelectItem>
              {fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}