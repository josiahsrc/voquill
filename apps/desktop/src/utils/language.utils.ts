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
};

export const resolveLocaleValue = (value?: string | null): Locale => {
  return matchSupportedLocale(value) ?? DEFAULT_LOCALE;
};

export const mapLocaleToSupportedTranscriptionLocale = (
  locale: Locale,
): Locale => {
  if (locale === "pt-BR") {
    return "pt";
  }

  return locale;
};
