import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { AppLanguage } from '../utils/i18n';
import { getLocale } from '../utils/i18n';
import { loadSavedLanguage, saveLanguage } from '../utils/storage';

interface LanguageContextValue {
  lang: AppLanguage;
  locale: string;
  setLang: (next: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'it',
  locale: 'it-IT',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => loadSavedLanguage());

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    saveLanguage(next);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.title =
        lang === 'en'
          ? 'ImmoPulse — Real Estate CRM Agenda'
          : 'ImmoPulse — Agenda CRM Immobiliare';
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, locale: getLocale(lang), setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
