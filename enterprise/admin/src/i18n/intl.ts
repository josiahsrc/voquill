import { createIntl, createIntlCache } from "react-intl";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./config";
import type { Locale } from "./config";
import deMessages from "./locales/de.json";
import enMessages from "./locales/en.json";
import esMessages from "./locales/es.json";
import frMessages from "./locales/fr.json";
import itMessages from "./locales/it.json";
import ptBRMessages from "./locales/pt-BR.json";
import ptMessages from "./locales/pt.json";
import zhCNMessages from "./locales/zh-CN.json";
import zhTWMessages from "./locales/zh-TW.json";
import koMessages from "./locales/ko.json";

const LOCALE_MESSAGES: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  pt: ptMessages,
  "pt-BR": ptBRMessages,
  it: itMessages,
  "zh-TW": zhTWMessages,
  "zh-CN": zhCNMessages,
  ko: koMessages,
};

export const matchSupportedLocale = (value?: string | null): Locale | null => {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/_/g, "-");

  if (SUPPORTED_LOCALES.includes(cleaned as Locale)) {
    return cleaned as Locale;
  }

  const [language] = cleaned.toLowerCase().split("-");
  if (SUPPORTED_LOCALES.includes(language as Locale)) {
    return language as Locale;
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
