import { Outlet, Link } from 'react-router-dom';
import { useLang } from '@/i18n/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CookieConsent } from '@/components/CookieConsent';
import { LayoutDashboard, LogIn } from 'lucide-react';

export default function PublicLayout() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">F</div>
            <span className="font-heading font-semibold">FeedSpy</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
              </Link>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <LogIn className="w-4 h-4" /> {t('home.hero.login')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">FeedSpy</span>
          <Link to="/contact" className="hover:text-foreground">Kontakt</Link>
          <Link to="/terms" className="hover:text-foreground">Obchodní podmínky</Link>
          <Link to="/privacy" className="hover:text-foreground">GDPR</Link>
          <Link to="/accessibility" className="hover:text-foreground">Přístupnost</Link>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}