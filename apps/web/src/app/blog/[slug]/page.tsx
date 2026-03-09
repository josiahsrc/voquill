import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPost, getAllBlogSlugs } from "../../../lib/blog";
import { DEFAULT_SOCIAL_IMAGE_URL, toAbsoluteSiteUrl } from "../../../lib/site";
import BlogPostPage from "../../../views/BlogPostPage";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const postPath = `/blog/${post.slug}`;
  const postUrl = toAbsoluteSiteUrl(postPath);
  const socialImageUrl = post.image
    ? toAbsoluteSiteUrl(post.image)
    : DEFAULT_SOCIAL_IMAGE_URL;

  return {
    title: `${post.title} | Voquill Blog`,
    description: post.description,
    alternates: { canonical: postPath },
    openGraph: {
      type: "article",
      url: postUrl,
      title: post.title,
      description: post.description,
      images: [{ url: socialImageUrl, alt: post.title }],
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [socialImageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return <BlogPostPage post={post} />;
}
