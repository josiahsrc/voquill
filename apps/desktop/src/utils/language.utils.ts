import { matchSupportedLocale } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

export const LANGUAGE_DISPLAY_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  "pt-BR": "Português (Brasil)",
  it: "Italiano",
  "zh-TW": "中文 (台灣)",
};

export const resolveLocaleValue = (value?: string | null): Locale => {
  return matchSupportedLocale(value) ?? DEFAULT_LOCALE;
};

export const mapLocaleToWhisperLanguage = (locale: Locale): string => {
  if (locale === "pt-BR") {
    return "pt";
  }

  if (locale === "zh-TW") {
    return "zh";
  }

  return locale;
};
