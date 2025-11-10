import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

type BaseLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

const DEFAULT_TITLE = "Voquill";
const DEFAULT_DESCRIPTION = "Type four times faster with a voice-first keyboard.";
const DEFAULT_SOCIAL_IMAGE = "/docs.png";
const FALLBACK_CANONICAL_ORIGIN = "https://voquill.com";

export function BaseLayout({
  children,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: BaseLayoutProps) {
  const location = useLocation();

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

    document.title = title;
    updateMetaTag("name", "description", description);
    updateMetaTag("name", "robots", "index,follow");

    updateMetaTag("property", "og:type", "website");
    updateMetaTag("property", "og:title", title);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:url", canonicalUrl);
    updateMetaTag("property", "og:image", DEFAULT_SOCIAL_IMAGE);

    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", title);
    updateMetaTag("name", "twitter:description", description);
    updateMetaTag("name", "twitter:image", DEFAULT_SOCIAL_IMAGE);

    updateCanonicalLink(canonicalUrl);
  }, [title, description, canonicalUrl]);

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
