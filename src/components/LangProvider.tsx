"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { translate, type Key, type Lang } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key, v?: Record<string, string | number>) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => translate("en", k),
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      if (saved === "en" || saved === "zh") setLangState(saved);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };
  useEffect(() => { document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; }, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t: (k, v) => translate(lang, k, v) }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
