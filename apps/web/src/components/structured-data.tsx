import {
  DEFAULT_SOCIAL_IMAGE_URL,
  SITE_URL,
  toAbsoluteSiteUrl,
} from "../lib/site";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Voquill",
    url: SITE_URL,
    logo: toAbsoluteSiteUrl("/app-icon.svg"),
    description:
      "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
    sameAs: ["https://github.com/josiahsrc/voquill"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareAppJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Voquill",
    description:
      "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
    url: SITE_URL,
    operatingSystem: "macOS, Windows, Linux",
    applicationCategory: "ProductivityApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type BreadcrumbItem = { name: string; url: string };

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type ArticleJsonLdProps = {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  url: string;
};

export function ArticleJsonLd({
  title,
  description,
  date,
  author,
  tags,
  image,
  url,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image ? toAbsoluteSiteUrl(image) : DEFAULT_SOCIAL_IMAGE_URL,
    datePublished: date,
    dateModified: date,
    author: {
      "@type": "Organization",
      name: author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Voquill",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteSiteUrl("/app-icon.svg"),
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    keywords: tags.join(", "),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
