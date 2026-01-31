import manifest from "./manifest.json";

type Manifest = {
  defaultLocale: string;
  supportedLocales: string[];
};

const manifestData = manifest as Manifest;

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "pt-BR",
  "it",
  "zh-TW",
  "zh-CN",
  "ko",
] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE = manifestData.defaultLocale as Locale;

export const isSupportedLocale = (
  locale: string | null | undefined,
): locale is Locale => {
  if (!locale) {
    return false;
  }
  return SUPPORTED_LOCALES.includes(locale as Locale);
};
