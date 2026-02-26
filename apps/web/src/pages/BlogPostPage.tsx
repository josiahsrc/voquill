import { useParams, Link } from "react-router-dom";
import { useIntl } from "react-intl";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import { getBlogPost, formatBlogDate } from "../lib/blog";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
} from "../components/structured-data";
import DownloadButton from "../components/download-button";
import NotFoundPage from "./NotFoundPage";
import styles from "../styles/blog.module.css";

function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const intl = useIntl();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return <NotFoundPage />;
  }

  const postUrl = `https://voquill.com/blog/${post.slug}`;
  const title = `${post.title} | Voquill Blog`;

  return (
    <BaseLayout
      title={title}
      description={post.description}
      ogType="article"
      articleMeta={{
        publishedTime: post.date,
        modifiedTime: post.date,
        author: post.author,
        tags: post.tags,
      }}
    >
      <PageLayout mainClassName={styles.postMain}>
        <ArticleJsonLd post={post} url={postUrl} />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "https://voquill.com/" },
            { name: "Blog", url: "https://voquill.com/blog" },
            { name: post.title, url: postUrl },
          ]}
        />
        <header className={styles.postHeader}>
          <nav className={styles.postBreadcrumb} aria-label="Breadcrumb">
            <Link to="/">
              {intl.formatMessage({ defaultMessage: "Home" })}
            </Link>
            <span>/</span>
            <Link to="/blog">
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
        <article
          className={styles.postContent}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        <footer className={styles.postFooter}>
          <div className={styles.postFooterCta}>
            <h3>
              {intl.formatMessage({
                defaultMessage: "Ready to try voice typing?",
              })}
            </h3>
            <p>
              {intl.formatMessage({
                defaultMessage:
                  "Download Voquill for free and start typing with your voice today.",
              })}
            </p>
            <DownloadButton />
          </div>
        </footer>
      </PageLayout>
    </BaseLayout>
  );
}

export default BlogPostPage;
