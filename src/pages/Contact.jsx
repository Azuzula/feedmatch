import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Mail, Phone } from 'lucide-react';

export default function Contact() {
  const [s, setS] = useState(null);
  useEffect(() => { base44.entities.AppSettings.list().then((r) => setS(r[0] || {})).catch(() => setS({})); }, []);
  if (!s) return <div className="p-10 text-muted-foreground">Načítám…</div>;
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-heading font-bold">Kontakt</h1>
      <div className="mt-6 rounded-lg border border-border bg-card p-6 space-y-3 text-sm">
        <div className="font-semibold">{s.provider_name || 'FeedSpy'}</div>
        {s.provider_street && <div>{s.provider_street}, {s.provider_zip} {s.provider_city}, {s.provider_country}</div>}
        {s.provider_ico && <div>IČO: {s.provider_ico}</div>}
        {s.provider_email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {s.provider_email}</div>}
        {s.provider_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {s.provider_phone}</div>}
        {s.roadmap_url && (
          <a href={s.roadmap_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline mt-2">
            <ExternalLink className="w-4 h-4" /> Roadmapa & report chyb
          </a>
        )}
      </div>
    </div>
  );
}