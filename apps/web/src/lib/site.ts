export const SITE_URL = "https://voquill.com";
export const DEFAULT_SITE_LAST_MODIFIED = "2025-11-10";
export const DEFAULT_SOCIAL_IMAGE_URL = `${SITE_URL}/social.jpg`;

export function toAbsoluteSiteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path === "/") {
    return SITE_URL;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
