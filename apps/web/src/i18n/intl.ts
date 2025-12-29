import { createIntl, createIntlCache } from "react-intl";
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from "./config";
import enMessages from "./locales/en.json";
import esMessages from "./locales/es.json";
import frMessages from "./locales/fr.json";
import deMessages from "./locales/de.json";
import ptMessages from "./locales/pt.json";
import ptBRMessages from "./locales/pt-BR.json";
import itMessages from "./locales/it.json";

const LOCALE_MESSAGES: Record<string, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  pt: ptMessages,
  "pt-BR": ptBRMessages,
  it: itMessages,
};

const matchSupportedLocale = (value?: string | null): Locale | null => {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/_/g, "-");

  // First check if the full locale (with region) is supported
  if (SUPPORTED_LOCALES.includes(cleaned)) {
    return cleaned;
  }

  // Fall back to just the language part
  const language = cleaned.toLowerCase().split("-")[0];
  if (language && SUPPORTED_LOCALES.includes(language)) {
    return language;
  }

  return null;
};

export const detectLocale = (): Locale => {
  if (typeof navigator === "undefined") {
    return DEFAULT_LOCALE;
  }

  const candidates = Array.isArray(navigator.languages)
    ? [...navigator.languages]
    : [];

  if (navigator.language) {
    candidates.push(navigator.language);
  }

  for (const candidate of candidates) {
    const match = matchSupportedLocale(candidate);
    if (match != null) {
      return match;
    }
  }

  return DEFAULT_LOCALE;
};

export const getMessagesForLocale = (locale: Locale) => {
  return LOCALE_MESSAGES[locale] ?? LOCALE_MESSAGES[DEFAULT_LOCALE];
};

export const getIntlConfig = () => {
  const locale = detectLocale();
  return {
    locale,
    defaultLocale: DEFAULT_LOCALE,
    messages: getMessagesForLocale(locale),
  };
};

// Helper to get intl instance for non-React contexts
export function getIntl(locale?: Locale) {
  const cache = createIntlCache();
  const detectedLocale = locale ?? detectLocale();
  return createIntl(
    {
      locale: detectedLocale,
      defaultLocale: DEFAULT_LOCALE,
      messages: getMessagesForLocale(detectedLocale),
    },
    cache,
  );
}
