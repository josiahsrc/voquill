import { FormattedMessage } from "react-intl";
import AppIconShowcase from "../components/app-icon-showcase";
import { HeroSection } from "../components/hero";
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

        <SpeedShowcase />

        <section className={styles.splitSection} id="features">
          <div className={`${styles.splitMedia} ${styles.iconShowcaseMedia}`}>
            <AppIconShowcase />
          </div>
          <div className={styles.splitContent}>
            <span className={styles.badge}>
              <FormattedMessage defaultMessage="Works on any app" />
            </span>
            <h2>
              <FormattedMessage defaultMessage="Your voice, everywhere you write." />
            </h2>
            <p>
              <FormattedMessage defaultMessage="Voquill integrates seamlessly with any application on your system. Whether you're drafting emails, writing code, or taking notes, your voice works everywhere your keyboard does." />
            </p>
          </div>
        </section>

        <section className={styles.splitSection} id="privacy">
          <div className={styles.splitContent}>
            <span className={styles.badge}>
              <FormattedMessage defaultMessage="Private and secure" />
            </span>
            <h2>
              <FormattedMessage defaultMessage="Your data is yours. Period." />
            </h2>
            <p>
              <FormattedMessage defaultMessage="Process everything locally on your device, or bring your own API key to connect to the Groq API. Don't believe us? See for yourself. Voquill is fully open-source." />
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
              <FormattedMessage defaultMessage="Uhh? Umm? Not anymore." />
            </h2>
            <p>
              <FormattedMessage defaultMessage="Voquill uses AI to clean up your transcripts. It removes filler words, hesitations, false starts, etc. Speak naturally, Voquill will handle the rest." />
            </p>
          </div>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
