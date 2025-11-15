import { createIntl, createIntlCache } from "react-intl";
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from "./config";
import enMessages from "./locales/en.json";
import esMessages from "./locales/es.json";
import frMessages from "./locales/fr.json";

const LOCALE_MESSAGES: Record<string, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
};

const normalizeLocale = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const cleaned = value.toLowerCase().replace("_", "-");
  const [language] = cleaned.split("-");
  return language ?? cleaned;
};

const matchSupportedLocale = (value?: string | null): Locale | null => {
  const normalized = normalizeLocale(value);
  if (!normalized) {
    return null;
  }

  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
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
    if (match) {
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
    cache
  );
}
