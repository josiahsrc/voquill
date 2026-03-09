import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "../lib/blog";
import { DEFAULT_SITE_LAST_MODIFIED, toAbsoluteSiteUrl } from "../lib/site";

export const dynamic = "force-static";

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
      url: toAbsoluteSiteUrl("/"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: toAbsoluteSiteUrl("/download"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toAbsoluteSiteUrl("/blog"),
      lastModified: blogLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: toAbsoluteSiteUrl("/contact"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...posts.map((post) => ({
      url: toAbsoluteSiteUrl(`/blog/${post.slug}`),
      lastModified: isIsoDate(post.date)
        ? post.date
        : DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: toAbsoluteSiteUrl("/privacy"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: toAbsoluteSiteUrl("/terms"),
      lastModified: DEFAULT_SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
