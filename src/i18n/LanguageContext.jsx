import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import cz from '@/language/cz.json';
import en from '@/language/en.json';

const dictionaries = { cz, en };
const LanguageContext = createContext({ lang: 'cz', t: (k) => k, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('feedspy_lang') || 'cz';
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('feedspy_lang', l);
  }, []);

  const t = useCallback((key) => {
    const d = dictionaries[lang] || cz;
    return d[key] !== undefined ? d[key] : key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);