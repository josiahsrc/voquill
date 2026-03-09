"use client";

import PageLayout from "../layouts/PageLayout";
import styles from "../styles/legal.module.css";

type LegalPageProps = {
  html: string;
};

export function LegalPage({ html }: LegalPageProps) {
  return (
    <PageLayout mainClassName={styles.legalMain}>
      <article
        className={styles.legalContent}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PageLayout>
  );
}

export default LegalPage;
