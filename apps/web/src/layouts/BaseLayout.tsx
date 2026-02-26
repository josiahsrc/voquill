import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIntl } from "react-intl";

type ArticleMeta = {
  publishedTime: string;
  modifiedTime: string;
  author: string;
  tags: string[];
};

type BaseLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  ogType?: "website" | "article";
  articleMeta?: ArticleMeta;
  noIndex?: boolean;
};

export function BaseLayout({
  children,
  title,
  description,
  ogType = "website",
  articleMeta,
  noIndex = false,
}: BaseLayoutProps) {
  const intl = useIntl();
  const location = useLocation();

  const DEFAULT_TITLE = intl.formatMessage({
    defaultMessage: "Voquill | Your keyboard is holding you back",
  });
  const DEFAULT_DESCRIPTION = intl.formatMessage({
    defaultMessage: "Type four times faster with a voice-first keyboard.",
  });
  const FALLBACK_CANONICAL_ORIGIN = "https://voquill.com";

  const finalTitle = title ?? DEFAULT_TITLE;
  const finalDescription = description ?? DEFAULT_DESCRIPTION;

  const canonicalUrl = useMemo(() => {
    const baseUrl = new URL(FALLBACK_CANONICAL_ORIGIN);
    baseUrl.pathname = location.pathname;
    return baseUrl.toString();
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = intl.locale;

    document.title = finalTitle;
    updateMetaTag("name", "description", finalDescription);
    updateMetaTag("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");

    updateMetaTag("property", "og:type", ogType);
    updateMetaTag("property", "og:site_name", "Voquill");
    updateMetaTag("property", "og:locale", intl.locale.replace("-", "_"));
    updateMetaTag("property", "og:title", finalTitle);
    updateMetaTag("property", "og:description", finalDescription);
    updateMetaTag("property", "og:url", canonicalUrl);

    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", finalTitle);
    updateMetaTag("name", "twitter:description", finalDescription);

    if (articleMeta) {
      updateMetaTag("property", "article:published_time", articleMeta.publishedTime);
      updateMetaTag("property", "article:modified_time", articleMeta.modifiedTime);
      updateMetaTag("property", "article:author", articleMeta.author);
      articleMeta.tags.forEach((tag) => {
        updateMetaTag("property", "article:tag", tag);
      });
    }

    updateCanonicalLink(noIndex ? "" : canonicalUrl);
  }, [finalTitle, finalDescription, canonicalUrl, ogType, articleMeta, noIndex, intl.locale]);

  return <>{children}</>;
}

export default BaseLayout;

function updateMetaTag(
  attribute: "name" | "property",
  key: string,
  value: string,
) {
  const selector =
    attribute === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", value);
}

function updateCanonicalLink(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}
