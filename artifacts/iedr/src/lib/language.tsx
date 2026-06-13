import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'fa';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  t: (en: string | undefined | null, fa: string | undefined | null) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const isRtl = language === 'fa';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.body.style.fontFamily = isRtl ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif";
  }, [language]);

  const t = (en: string | undefined | null, fa: string | undefined | null) => {
    if (language === 'fa') return fa || en || '';
    return en || fa || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl: language === 'fa', t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
