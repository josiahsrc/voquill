import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import { getMarkdownContent, type LegalSlug } from "../lib/markdown";
import styles from "../styles/legal.module.css";

type LegalPageProps = {
  slug: LegalSlug;
  title: string;
  description: string;
};

export function LegalPage({ slug, title, description }: LegalPageProps) {
  const content = getMarkdownContent(slug);

  return (
    <BaseLayout title={title} description={description}>
      <PageLayout mainClassName={styles.legalMain}>
        <article
          className={styles.legalContent}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </PageLayout>
    </BaseLayout>
  );
}

export default LegalPage;
