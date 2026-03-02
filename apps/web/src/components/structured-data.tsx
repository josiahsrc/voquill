import type { BlogPost } from "../lib/blog";

type ArticleJsonLdProps = {
  post: BlogPost;
  url: string;
};

export function ArticleJsonLd({ post, url }: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: post.image
      ? `https://voquill.com${post.image}`
      : "https://voquill.com/social.jpg",
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
      url: "https://voquill.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Voquill",
      url: "https://voquill.com",
      logo: {
        "@type": "ImageObject",
        url: "https://voquill.com/app-icon.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    keywords: post.tags.join(", "),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Voquill",
    url: "https://voquill.com",
    logo: "https://voquill.com/app-icon.svg",
    description:
      "VType four times faster with your voice. Open-source alternative to Wispr Flow.",
    sameAs: ["https://github.com/josiahsrc/voquill"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type BreadcrumbJsonLdProps = {
  items: { name: string; url: string }[];
};

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
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

type SoftwareAppJsonLdProps = {
  name: string;
  description: string;
  url: string;
  operatingSystem: string;
  category: string;
};

export function SoftwareAppJsonLd({
  name,
  description,
  url,
  operatingSystem,
  category,
}: SoftwareAppJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    operatingSystem,
    applicationCategory: category,
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
