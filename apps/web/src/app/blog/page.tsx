import type { Metadata } from "next";
import { getAllBlogPostPreviews } from "../../lib/blog";
import {
  DEFAULT_SOCIAL_IMAGE_URL,
  toAbsoluteSiteUrl,
} from "../../lib/site";
import BlogListPage from "../../views/BlogListPage";

const BLOG_TITLE = "Blog | Voquill";
const BLOG_DESCRIPTION =
  "Tips, guides, and insights on voice typing, speech-to-text technology, and productivity from the Voquill team.";

export const metadata: Metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: toAbsoluteSiteUrl("/blog"),
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE_URL],
  },
};

export default function Page() {
  const posts = getAllBlogPostPreviews();
  return <BlogListPage posts={posts} />;
}
