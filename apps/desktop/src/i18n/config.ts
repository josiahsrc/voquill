import manifest from "./manifest.json";

type Manifest = {
  defaultLocale: string;
  supportedLocales: string[];
};

const manifestData = manifest as Manifest;

export const DEFAULT_LOCALE = manifestData.defaultLocale;
export const SUPPORTED_LOCALES = manifestData.supportedLocales;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const isSupportedLocale = (
  locale: string | null | undefined
): locale is Locale => {
  if (!locale) {
    return false;
  }
  return SUPPORTED_LOCALES.includes(locale as Locale);
};
