import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Package, CheckCircle2, Percent, Rss, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [feeds, setFeeds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [low, setLow] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Feed.list(),
      base44.entities.MatchLog.list('-created_date', 100).catch(() => []),
      base44.entities.Product.filter({ last_match_score: { $lt: 70 } }, '-last_match_score', 20).catch(() => []),
    ]).then(([f, l, lw]) => {
      setFeeds(f); setLogs(l); setLow(lw); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Načítám…</div>;
  const totalProducts = feeds.reduce((s, f) => s + (f.product_count || 0), 0);
  const matched = logs.filter((l) => l.method !== 'none' && l.method).length;
  const successRate = logs.length ? Math.round((matched / logs.length) * 100) : 0;
  const lastFeed = feeds[0];

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-heading font-bold">Přehled</h1>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Produktů ve feedu" value={totalProducts} />
        <StatCard icon={CheckCircle2} label="Spárovaných (100)" value={matched} sub="posledních 100 dotazů" />
        <StatCard icon={Percent} label="Úspěšnost párování" value={successRate + '%'} />
        <StatCard icon={Rss} label="Feedů" value={feeds.length} sub={lastFeed ? lastFeed.last_sync_status : ''} />
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Poslední synchronizace</h2>
            <Link to="/feeds" className="text-xs text-primary hover:underline">Spravovat feedy →</Link>
          </div>
          {feeds.length ? feeds.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <span className="truncate">{f.name}</span>
              <span className={`text-xs ${f.last_sync_status === 'success' ? 'text-primary' : f.last_sync_status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {f.product_count || 0} ks · {f.last_sync_status}
              </span>
            </div>
          )) : <p className="text-sm text-muted-foreground">Zatím žádný feed. <Link to="/feeds" className="text-primary hover:underline">Přidat feed</Link></p>}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold">Produkty s nízkou shodou (&lt; 70%)</h2>
          </div>
          {low.length ? low.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-amber-500">{p.last_match_score}%</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">Žádné produkty s nízkou shodou.</p>}
          <Link to="/products" className="block mt-3 text-xs text-primary hover:underline">Spravovat alternativní názvy →</Link>
        </div>
      </div>
    </div>
  );
}