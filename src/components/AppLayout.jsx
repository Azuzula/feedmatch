import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LayoutDashboard, Rss, Package, Store, CreditCard, Settings as SettingsIcon, LogOut, Shield } from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/feeds', icon: Rss, label: t('nav.feeds') },
    { to: '/products', icon: Package, label: t('nav.products') },
    { to: '/suppliers', icon: Store, label: t('nav.suppliers') },
    { to: '/subscription', icon: CreditCard, label: t('nav.subscription') },
    { to: '/settings', icon: SettingsIcon, label: t('nav.settings') },
  ];
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0 hidden md:flex">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">F</div>
            <span className="font-heading font-semibold">Feed Match</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                <it.icon className="w-4 h-4" /> {it.label}
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <Link to="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${location.pathname.startsWith('/admin') ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Shield className="w-4 h-4" /> {t('nav.admin')}
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <LanguageSwitcher />
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button onClick={() => logout()} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary w-full">
            <LogOut className="w-4 h-4" /> {t('nav.logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}