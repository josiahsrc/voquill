import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "../lib/blog";
import { DEFAULT_SITE_LAST_MODIFIED, SITE_URL } from "../lib/site";

export const dynamic = "force-static";

function toAbsoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllBlogPosts();
  const latestBlogDate = posts[0]?.date;
  const blogLastModified = isIsoDate(latestBlogDate ?? "")
    ? latestBlogDate
    : DEFAULT_SITE_LAST_MODIFIED;

  return [
    {
      url: toAbsoluteUrl("/"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/download"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/blog"),
      lastModified: blogLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map((post) => ({
      url: toAbsoluteUrl(`/blog/${post.slug}`),
      lastModified: isIsoDate(post.date)
        ? post.date
        : DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: toAbsoluteUrl("/privacy"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: toAbsoluteUrl("/terms"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
