export const LOCALES = ["en", "zh", "hi", "es", "fr", "ar", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

/** Stored setting: follow the device, or lock to one of the supported locales. */
export type LocaleSetting = Locale | "auto";

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

export const LOCALE_META: Record<
  Locale,
  { nativeName: string; htmlLang: string }
> = {
  en: { nativeName: "English", htmlLang: "en" },
  zh: { nativeName: "中文", htmlLang: "zh-CN" },
  hi: { nativeName: "हिन्दी", htmlLang: "hi" },
  es: { nativeName: "Español", htmlLang: "es" },
  fr: { nativeName: "Français", htmlLang: "fr" },
  ar: { nativeName: "العربية", htmlLang: "ar" },
  ru: { nativeName: "Русский", htmlLang: "ru" },
};

const PRIMARY_TO_LOCALE: Record<string, Locale> = {
  en: "en",
  zh: "zh",
  hi: "hi",
  es: "es",
  fr: "fr",
  ar: "ar",
  ru: "ru",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function isLocaleSetting(v: unknown): v is LocaleSetting {
  return v === "auto" || isLocale(v);
}

/** Map a BCP 47 tag such as `zh-CN` or `pt-BR` to a supported locale. */
export function mapLanguageTag(tag: string): Locale | null {
  const primary = tag.toLowerCase().replace(/_/g, "-").split("-")[0];
  return PRIMARY_TO_LOCALE[primary] ?? null;
}

export function detectDeviceLocale(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : []
): Locale {
  for (const tag of languages) {
    const mapped = mapLanguageTag(tag);
    if (mapped) return mapped;
  }
  return "en";
}

export function resolveLocale(setting: LocaleSetting): Locale {
  if (setting === "auto") return detectDeviceLocale();
  return setting;
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function localeUsesWideTracking(locale: Locale): boolean {
  return locale === "en" || locale === "es" || locale === "fr" || locale === "ru";
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = LOCALE_META[locale].htmlLang;
  document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
}
