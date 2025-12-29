import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "../i18n/config";

export const LANGUAGE_DISPLAY_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
};

export const normalizeLocaleValue = (value?: string | null): Locale | null => {
  if (!value) {
    return null;
  }

  const cleaned = value.toLowerCase().replace(/_/g, "-");
  const [language] = cleaned.split("-");
  if (isSupportedLocale(language)) {
    return language as Locale;
  }

  return null;
};

export const resolveLocaleValue = (value?: string | null): Locale => {
  return normalizeLocaleValue(value) ?? DEFAULT_LOCALE;
};
