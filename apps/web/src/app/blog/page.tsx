import type { Metadata } from "next";
import { getAllBlogPosts } from "../../lib/blog";
import BlogListPage from "../../views/BlogListPage";

export const metadata: Metadata = {
  title: "Blog | Voquill",
  description:
    "Tips, guides, and insights on voice typing, speech-to-text technology, and productivity from the Voquill team.",
  alternates: { canonical: "/blog" },
};

export default function Page() {
  const posts = getAllBlogPosts().map(({ content, ...rest }) => rest);
  return <BlogListPage posts={posts} />;
}
