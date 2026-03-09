"use client";

import { useIntl } from "react-intl";
import Link from "next/link";
import Image from "next/image";
import PageLayout from "../layouts/PageLayout";
import type { BlogPost } from "../lib/blog-utils";
import { formatBlogDate } from "../lib/blog-utils";
import styles from "../styles/blog.module.css";

type Props = {
  posts: Omit<BlogPost, "content">[];
};

export default function BlogListPage({ posts }: Props) {
  const intl = useIntl();

  return (
    <PageLayout mainClassName={styles.blogMain}>
      <header className={styles.blogHeader}>
        <h1 className={styles.blogTitle}>
          {intl.formatMessage({ defaultMessage: "Blog" })}
        </h1>
        <p className={styles.blogSubtitle}>
          {intl.formatMessage({
            defaultMessage:
              "Guides, tips, and insights on voice typing and productivity.",
          })}
        </p>
      </header>
      <div className={styles.blogGrid}>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className={styles.blogCard}
          >
            {post.image && (
              <div className={styles.cardImageWrapper}>
                <Image
                  src={post.image}
                  alt=""
                  className={styles.cardImage}
                  width={680}
                  height={383}
                />
              </div>
            )}
            <div className={styles.cardBody}>
              <div className={styles.cardMeta}>
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                <span className={styles.cardMetaSeparator} />
                <span>{post.author}</span>
              </div>
              <h2 className={styles.cardTitle}>{post.title}</h2>
              <p className={styles.cardDescription}>{post.description}</p>
              <div className={styles.cardTags}>
                {post.tags.map((tag) => (
                  <span key={tag} className={styles.cardTag}>
                    {tag}
                  </span>
                ))}
              </div>
              <span className={styles.readMore}>
                {intl.formatMessage({ defaultMessage: "Read article →" })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
