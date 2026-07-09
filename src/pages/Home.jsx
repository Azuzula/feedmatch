import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLang } from '@/i18n/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Rss, ScanSearch, BadgePercent, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  return (
    <div>
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-border text-muted-foreground mb-5">
              <Zap className="w-3 h-3 text-primary" /> SaaS pro e-shopaře
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight">{t('home.hero.title')}</h1>
            <p className="mt-5 text-muted-foreground text-lg">{t('home.hero.subtitle')}</p>
            <div className="mt-8 flex gap-3">
              {isAuthenticated ? (
                <Button asChild size="lg"><Link to="/dashboard">{t('nav.dashboard')} <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
              ) : (
                <Button asChild size="lg"><Link to="/login">{t('home.hero.cta')} <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">30denní trial zdarma · bez kreditní karty</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="rounded-lg bg-secondary p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">PLA+ violet 1kg</span><span className="text-primary">shoda 96%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sklad</span><span>10 ks</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nákup</span><span>420 Kč</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prodej</span><span>599 Kč</span></div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">ABS černá 500g</span><span className="text-destructive">Není skladem</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Rss, title: 'Napojte vlastní feed', text: 'XML Heureka nebo CSV/TSV z vašeho e-shopu. Namapujte sloupce jednorázově.' },
            { icon: ScanSearch, title: 'Doplněk skenuje web', text: 'Chrome doplněk páruje produkty na stránce dodavatele s vaším feedem.' },
            { icon: BadgePercent, title: 'Vidíte sklad a ceny', text: 'Počet kusů, nákupní i prodejní cena a míra shody přímo u produktu.' },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-heading font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}