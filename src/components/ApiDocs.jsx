export default function ApiDocs({ baseUrl }) {
  const base = baseUrl || 'https://<vase-app>.base44.app';
  const productShape = `{
  "id", "name", "ean", "supplier_code",
  "purchase_price", "sale_price",
  "stock_qty", "stock_unit", "category",
  "alternative_names": [...],
  "name_normalized": "...",
  "tokens": [...],
  "alt_tokens": [...]
}`;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">API pro vývoj Chrome doplňku. Všechny požadavky vyžadují API klíč uživatele jako Bearer token. Doplněk si jednorázově stáhne produkty pro danou doménu a párování prvků webu s feedem dělá lokálně — na každý element se API nevolá.</p>

      <div className="space-y-2">
        <h4 className="font-semibold font-mono">GET /functions/getProductsForExtension</h4>
        <p className="text-muted-foreground text-xs">Stáhne produkty pro doménu dodavatele. Pokud je k doméně nastavený dodavatel s feedem a kategoriemi, vrátí se vyfiltrovaný set; jinak celý feed. Odpověď obsahuje vše potřebné pro lokální párování (EAN, kód, tokeny, alternativní názvy).</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{`GET ${base}/functions/getProductsForExtension?domain=dodavatel.cz&limit=3000
Authorization: Bearer fsk_...
→ { products: [...], count, cached_at }`}</pre>
        <p className="text-muted-foreground text-xs">Tvar položky <code>products[]</code>:</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{productShape}</pre>
        <p className="text-muted-foreground text-xs">Postup párování v doplňku: 1) shoda EAN, 2) shoda <code>supplier_code</code>, 3) fuzzy párování přes <code>tokens</code> / <code>alt_tokens</code> vůči názvu prvku na webu.</p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold font-mono">POST /functions/addAlternativeName</h4>
        <p className="text-muted-foreground text-xs">Přidá alternativní název k produktu (např. když doplněk najde produkt pod jiným označením na webu). Po přidání se uplatní při dalším stažení produktů.</p>
        <pre className="bg-secondary rounded-md p-3 text-xs overflow-x-auto font-mono">{`POST ${base}/functions/addAlternativeName
Authorization: Bearer fsk_...
{ "product_id": "...", "name": "PLA+ fialová 1kg" }
→ { success: true, alternative_names: [...] }`}</pre>
      </div>
    </div>
  );
}