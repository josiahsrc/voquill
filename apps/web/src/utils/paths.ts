import { locales, defaultLocale, type Locale } from "../types/locale";

function normalizePath(path: string): string {
  if (path === "/" || path === "") {
    return "/";
  }

  const [pathWithQuery, hash = ""] = path.split("#");
  const [rawPath, query = ""] = pathWithQuery.split("?");

  if (!rawPath || rawPath === "/") {
    return `/${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  }

  const normalizedPath =
    !/\/[^/]+\.[a-z0-9]+$/i.test(rawPath) && !rawPath.endsWith("/")
      ? `${rawPath}/`
      : rawPath;

  return `${normalizedPath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

export function localeParam(locale: Locale): string | undefined {
  return locale === defaultLocale ? undefined : locale;
}

export function getLocaleStaticPaths() {
  return locales.map((locale) => ({
    params: { locale: localeParam(locale) },
  }));
}

export function localePath(lang: string, path: string) {
  const normalizedPath = normalizePath(path);
  if (lang === defaultLocale) {
    return normalizedPath;
  }
  return normalizedPath === "/" ? `/${lang}/` : `/${lang}${normalizedPath}`;
}
