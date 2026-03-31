import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { getAllBlogPosts } from "../lib/blog";
import { locales } from "../types/locale";
import { localePath } from "../utils/paths";
import { toAbsoluteUrl, toIsoDate, toIsoDateFromDateOnly } from "../utils/seo";

const PAGE_SOURCES = {
  home: "src/pages/[...locale]/index.astro",
  download: "src/pages/[...locale]/download.astro",
  blogIndex: "src/pages/[...locale]/blog/index.astro",
  contact: "content/contact.md",
  privacy: "content/privacy.md",
  terms: "content/terms.md",
} as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getFileLastModified(relativePath: string): string {
  return toIsoDate(fs.statSync(path.resolve(relativePath)).mtime);
}

function buildAlternateLinks(pathWithoutLocale: string): string {
  const localeLinks = locales
    .map((locale) => {
      const href =
        pathWithoutLocale === "/"
          ? toAbsoluteUrl(localePath(locale, "/"))
          : toAbsoluteUrl(localePath(locale, pathWithoutLocale));

      return `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(href)}" />`;
    })
    .join("");

  const xDefaultHref =
    pathWithoutLocale === "/"
      ? toAbsoluteUrl(localePath("en", "/"))
      : toAbsoluteUrl(localePath("en", pathWithoutLocale));

  return `${localeLinks}<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultHref)}" />`;
}

function buildLocalizedPageEntries(input: {
  pathWithoutLocale: string;
  lastmod: string;
}): string {
  return locales
    .map((locale) => {
      const loc =
        input.pathWithoutLocale === "/"
          ? toAbsoluteUrl(localePath(locale, "/"))
          : toAbsoluteUrl(localePath(locale, input.pathWithoutLocale));

      return `<url><loc>${escapeXml(loc)}</loc><lastmod>${escapeXml(input.lastmod)}</lastmod>${buildAlternateLinks(input.pathWithoutLocale)}</url>`;
    })
    .join("");
}

function getBlogIndexLastModified(): string {
  const posts = getAllBlogPosts();
  const latestPostDate =
    posts.length > 0
      ? toIsoDateFromDateOnly(posts[0]!.date)
      : getFileLastModified(PAGE_SOURCES.blogIndex);

  return latestPostDate > getFileLastModified(PAGE_SOURCES.blogIndex)
    ? latestPostDate
    : getFileLastModified(PAGE_SOURCES.blogIndex);
}

export const GET: APIRoute = () => {
  const staticEntries = [
    buildLocalizedPageEntries({
      pathWithoutLocale: "/",
      lastmod: getFileLastModified(PAGE_SOURCES.home),
    }),
    buildLocalizedPageEntries({
      pathWithoutLocale: "/download",
      lastmod: getFileLastModified(PAGE_SOURCES.download),
    }),
    buildLocalizedPageEntries({
      pathWithoutLocale: "/blog",
      lastmod: getBlogIndexLastModified(),
    }),
    buildLocalizedPageEntries({
      pathWithoutLocale: "/contact",
      lastmod: getFileLastModified(PAGE_SOURCES.contact),
    }),
    buildLocalizedPageEntries({
      pathWithoutLocale: "/privacy",
      lastmod: getFileLastModified(PAGE_SOURCES.privacy),
    }),
    buildLocalizedPageEntries({
      pathWithoutLocale: "/terms",
      lastmod: getFileLastModified(PAGE_SOURCES.terms),
    }),
  ];

  const postEntries = getAllBlogPosts()
    .map((post) =>
      buildLocalizedPageEntries({
        pathWithoutLocale: `/blog/${post.slug}`,
        lastmod: toIsoDateFromDateOnly(post.date),
      }),
    )
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticEntries.join("")}
${postEntries}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
