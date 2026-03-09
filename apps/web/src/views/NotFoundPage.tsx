"use client";

import Link from "next/link";
import { FormattedMessage } from "react-intl";
import PageLayout from "../layouts/PageLayout";
import styles from "../styles/page.module.css";

function NotFoundPage() {
  return (
    <PageLayout>
      <section className={styles.heroContent}>
        <h1>
          <FormattedMessage defaultMessage="Page not found" />
        </h1>
        <p>
          <FormattedMessage defaultMessage="We couldn't find the page you were looking for." />
        </p>
        <Link href="/" className={styles.inlineLink}>
          <FormattedMessage defaultMessage="Return home" />
        </Link>
      </section>
    </PageLayout>
  );
}

export default NotFoundPage;
