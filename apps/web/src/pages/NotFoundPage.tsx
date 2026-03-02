import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import styles from "../styles/page.module.css";

function NotFoundPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({ defaultMessage: "Page not found | Voquill" })}
      description={intl.formatMessage({
        defaultMessage: "Sorry, we couldn't find that page.",
      })}
      noIndex
    >
      <PageLayout>
        <section className={styles.heroContent}>
          <h1>
            <FormattedMessage defaultMessage="Page not found" />
          </h1>
          <p>
            <FormattedMessage defaultMessage="We couldn't find the page you were looking for." />
          </p>
          <Link to="/" className={styles.inlineLink}>
            <FormattedMessage defaultMessage="Return home" />
          </Link>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default NotFoundPage;
