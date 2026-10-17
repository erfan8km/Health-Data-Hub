import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "fa";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  isRtl: boolean;
  t: (english: string | null | undefined, persian: string | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function initialLanguage(): Language {
  try {
    return window.localStorage.getItem("iedr-language") === "en" ? "en" : "fa";
  } catch {
    return "fa";
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    const isPersian = language === "fa";
    document.documentElement.lang = language;
    document.documentElement.dir = isPersian ? "rtl" : "ltr";
    try {
      window.localStorage.setItem("iedr-language", language);
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [language]);

  const t = (english: string | null | undefined, persian: string | null | undefined) =>
    language === "fa" ? persian || english || "" : english || persian || "";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl: language === "fa", t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
