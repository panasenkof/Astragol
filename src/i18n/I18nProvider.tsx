import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  applyDocumentLocale,
  isRtl,
  type Locale,
} from "./locales";
import {
  interpolate,
  translations,
  type MessageKey,
} from "./messages";

export type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>
) => string;

interface I18nValue {
  locale: Locale;
  t: Translate;
  rtl: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const dict = translations[locale];
    const t: Translate = (key, vars) => interpolate(dict[key], vars);
    return { locale, t, rtl: isRtl(locale) };
  }, [locale]);

  applyDocumentLocale(locale);

  useEffect(() => {
    applyDocumentLocale(locale);
    const dict = translations[locale];
    document.title = dict.docTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", dict.docDescription);
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
