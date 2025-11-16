import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIntl } from "react-intl";

type BaseLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function BaseLayout({
  children,
  title,
  description,
}: BaseLayoutProps) {
  const intl = useIntl();
  const location = useLocation();

  const DEFAULT_TITLE = intl.formatMessage({ defaultMessage: "Voquill | Your keyboard is holding you back" });
  const DEFAULT_DESCRIPTION = intl.formatMessage({
    defaultMessage: "Type four times faster with a voice-first keyboard.",
  });
  const FALLBACK_CANONICAL_ORIGIN = "https://voquill.com";

  const finalTitle = title ?? DEFAULT_TITLE;
  const finalDescription = description ?? DEFAULT_DESCRIPTION;

  const canonicalUrl = useMemo(() => {
    // Always use the fallback origin to ensure consistent canonical URLs
    const baseUrl = new URL(FALLBACK_CANONICAL_ORIGIN);
    
    // Use React Router location for the path (client-side routing)
    baseUrl.pathname = location.pathname;
    
    // Don't include search params in canonical URL to avoid duplicate content
    return baseUrl.toString();
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = finalTitle;
    updateMetaTag("name", "description", finalDescription);
    updateMetaTag("name", "robots", "index,follow");

    updateMetaTag("property", "og:type", "website");
    updateMetaTag("property", "og:title", finalTitle);
    updateMetaTag("property", "og:description", finalDescription);
    updateMetaTag("property", "og:url", canonicalUrl);

    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", finalTitle);
    updateMetaTag("name", "twitter:description", finalDescription);

    updateCanonicalLink(canonicalUrl);
  }, [finalTitle, finalDescription, canonicalUrl]);

  return (
    <>
      {children}
    </>
  );
}

export default BaseLayout;

function updateMetaTag(
  attribute: "name" | "property",
  key: string,
  value: string,
) {
  const selector =
    attribute === "name"
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", value);
}

function updateCanonicalLink(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}
