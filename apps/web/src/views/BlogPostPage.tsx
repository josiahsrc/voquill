"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import Link from "next/link";
import Image from "next/image";
import PageLayout from "../layouts/PageLayout";
import type { BlogPost } from "../lib/blog-utils";
import { formatBlogDate } from "../lib/blog-utils";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
} from "../components/structured-data";
import { SITE_URL } from "../lib/site";
import styles from "../styles/blog.module.css";

type Props = {
  post: BlogPost;
};

type LightboxImage = {
  src: string;
  alt: string;
};

export default function BlogPostPage({ post }: Props) {
  const intl = useIntl();
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );
  const articleRef = useRef<HTMLElement>(null);

  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const image = target as HTMLImageElement;
        setLightboxImage({
          src: image.src,
          alt: image.alt || post.title,
        });
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [post.title]);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxImage, closeLightbox]);

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <PageLayout mainClassName={styles.postMain}>
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        date={post.date}
        author={post.author}
        tags={post.tags}
        image={post.image}
        url={postUrl}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
          { name: post.title, url: postUrl },
        ]}
      />
      <header className={styles.postHeader}>
        <nav className={styles.postBreadcrumb} aria-label="Breadcrumb">
          <Link href="/">
            {intl.formatMessage({ defaultMessage: "Home" })}
          </Link>
          <span>/</span>
          <Link href="/blog">
            {intl.formatMessage({ defaultMessage: "Blog" })}
          </Link>
          <span>/</span>
          <span>{post.title}</span>
        </nav>
        <h1 className={styles.postTitle}>{post.title}</h1>
        <div className={styles.postMeta}>
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span className={styles.cardMetaSeparator} />
          <span>{post.author}</span>
          <span className={styles.cardMetaSeparator} />
          <span>
            {intl.formatMessage(
              { defaultMessage: "{minutes} min read" },
              { minutes: post.readingTimeMinutes },
            )}
          </span>
        </div>
      </header>
      {post.image && (
        <div className={styles.postHeroWrapper}>
          <Image
            src={post.image}
            alt={post.title}
            className={styles.postHeroImage}
            width={780}
            height={439}
            priority
          />
        </div>
      )}
      <article
        ref={articleRef}
        className={styles.postContent}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      {lightboxImage && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className={styles.lightboxImage}
          />
        </div>
      )}
    </PageLayout>
  );
}
