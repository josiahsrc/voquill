import { FormattedMessage } from "react-intl";
import { AppsCarousel } from "../components/apps-carousel";
import { HeroSection } from "../components/hero";
import OfflineShowcase from "../components/offline-showcase";
import PrivacyLock from "../components/privacy-lock";
import SpeedShowcase from "../components/speed-showcase";
import TextCleanupShowcase from "../components/text-cleanup-showcase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import styles from "../styles/page.module.css";

function HomePage() {
  return (
    <BaseLayout>
      <PageLayout>
        <HeroSection />

        <AppsCarousel />

        <SpeedShowcase />

        <section className={styles.splitSection} id="privacy">
          <div className={styles.splitContent}>
            <span className={styles.badge}>
              <FormattedMessage defaultMessage="Private and secure" />
            </span>
            <h2>
              <FormattedMessage defaultMessage="Your data is yours. Period." />
            </h2>
            <p>
              <FormattedMessage defaultMessage="Process everything locally on your device, bring your own API key, or connect to our cloud. Don't believe us? See for yourself. Voquill is fully open-source." />
            </p>
            <a
              href="https://github.com/josiahsrc/voquill"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink}
            >
              <FormattedMessage defaultMessage="GitHub Source Code →" />
            </a>
          </div>
          <div className={`${styles.splitMedia} ${styles.privacyMedia}`}>
            <PrivacyLock />
          </div>
        </section>

        <section className={styles.splitSection} id="demo">
          <div className={styles.splitMedia}>
            <TextCleanupShowcase />
          </div>
          <div className={styles.splitContent}>
            <span className={styles.badge}>
              <FormattedMessage defaultMessage="Smart text cleanup" />
            </span>
            <h2>
              <FormattedMessage defaultMessage="Auto-correct with AI" />
            </h2>
            <p>
              <FormattedMessage defaultMessage="Voquill uses AI to clean up your transcripts. It removes filler words, hesitations, false starts, etc. Speak naturally, Voquill will handle the rest." />
            </p>
          </div>
        </section>

        <OfflineShowcase />
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
