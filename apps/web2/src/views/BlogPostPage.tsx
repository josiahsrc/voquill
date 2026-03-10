"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import Link from "next/link";
import Image from "next/image";
import PageLayout from "../layouts/PageLayout";
import type { BlogPost } from "../lib/blog-utils";
import { formatBlogDate } from "../lib/blog-utils";
import styles from "../styles/blog.module.css";

type Props = {
  post: BlogPost;
};

export default function BlogPostPage({ post }: Props) {
  const intl = useIntl();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const articleRef = useRef<HTMLElement>(null);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        setLightboxSrc((target as HTMLImageElement).src);
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [post]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxSrc, closeLightbox]);

  return (
    <PageLayout mainClassName={styles.postMain}>
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
            alt=""
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
      {lightboxSrc && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <img src={lightboxSrc} alt="" className={styles.lightboxImage} />
        </div>
      )}
    </PageLayout>
  );
}
