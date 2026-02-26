import { Link } from "react-router-dom";
import { useIntl } from "react-intl";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import { getAllBlogPosts, formatBlogDate } from "../lib/blog";
import { BreadcrumbJsonLd } from "../components/structured-data";
import styles from "../styles/blog.module.css";

function BlogListPage() {
  const intl = useIntl();
  const posts = getAllBlogPosts();

  const title = intl.formatMessage({
    defaultMessage: "Blog | Voquill",
  });
  const description = intl.formatMessage({
    defaultMessage:
      "Tips, guides, and insights on voice typing, speech-to-text technology, and productivity from the Voquill team.",
  });

  return (
    <BaseLayout title={title} description={description}>
      <PageLayout mainClassName={styles.blogMain}>
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "https://voquill.com/" },
            { name: "Blog", url: "https://voquill.com/blog" },
          ]}
        />
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
              to={`/blog/${post.slug}`}
              className={styles.blogCard}
            >
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
            </Link>
          ))}
        </div>
      </PageLayout>
    </BaseLayout>
  );
}

export default BlogListPage;
