import { useLang } from '@/i18n/LanguageContext';

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={() => setLang('cz')} className={`px-1.5 py-0.5 rounded ${lang === 'cz' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>CZ</button>
      <span className="text-muted-foreground/50">/</span>
      <button onClick={() => setLang('en')} className={`px-1.5 py-0.5 rounded ${lang === 'en' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>EN</button>
    </div>
  );
}