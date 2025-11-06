import { Link } from "react-router-dom";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import styles from "../styles/page.module.css";

function NotFoundPage() {
  return (
    <BaseLayout title="Page not found | Voquill" description="Sorry, we couldn't find that page.">
      <PageLayout>
        <section className={styles.heroContent}>
          <h1>Page not found</h1>
          <p>We couldn&apos;t find the page you were looking for.</p>
          <Link to="/" className={styles.inlineLink}>
            Return home
          </Link>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default NotFoundPage;
