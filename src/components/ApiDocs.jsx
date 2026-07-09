export default function ApiDocs({ baseUrl }) {
  const base = baseUrl || 'https://<vase-app>.base44.app';
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">API pro vývoj Chrome doplňku. Všechny požadavky vyžadují API klíč uživatele jako Bearer token.</p>
      <div className="space-y-2">
        <h4 className="font-semibold font-mono">POST /functions/getProductsForExtension</h4>
        <p className="text-muted-foreground text-xs">Stáhne filtrovaný set produktů pro lokální cache v doplňku. Volitelný parametr <code>?domain=</code> aplikuje filtr kategorií.</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{`GET ${base}/functions/getProductsForExtension?domain=eshop-dodavatel.cz&limit=3000
Authorization: Bearer fsk_...
→ { products: [...], count, cached_at }`}</pre>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold font-mono">POST /functions/matchProduct</h4>
        <p className="text-muted-foreground text-xs">Spáruje jeden produkt z webu dodavatele. Nejprve EAN/kód, pak fuzzy název.</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{`POST ${base}/functions/matchProduct
Authorization: Bearer fsk_...
{ "text": "PLA+ violet 1kg", "ean": "123456", "domain": "dodavatel.cz" }
→ { match: { id, name, stock_qty, stock_unit, purchase_price, sale_price, score, method } }`}</pre>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold font-mono">POST /functions/addAlternativeName</h4>
        <p className="text-muted-foreground text-xs">Přidá alternativní název k produktu z doplňku.</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{`POST ${base}/functions/addAlternativeName
Authorization: Bearer fsk_...
{ "product_id": "...", "name": "PLA+ fialová 1kg" }
→ { success: true, alternative_names: [...] }`}</pre>
      </div>
    </div>
  );
}