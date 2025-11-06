import { Link } from "react-router-dom";
import AppIconShowcase from "../components/app-icon-showcase";
import DownloadButton from "../components/download-button";
import PrivacyLock from "../components/privacy-lock";
import SpeedShowcase from "../components/speed-showcase";
import TextCleanupShowcase from "../components/text-cleanup-showcase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import { PLATFORM_CONFIG, PLATFORM_ORDER, type Platform } from "../lib/downloads";
import styles from "../styles/page.module.css";

function HomePage() {
  return (
    <BaseLayout>
      <PageLayout>
        <section className={styles.heroContent} id="overview">
          <h1 className={styles.heroTitle}>Your keyboard is holding you back.</h1>
          <p className={styles.heroSubtitle}>
            Make voice your new keyboard. Type four times faster by using your voice.
          </p>
          <div className={styles.heroActions}>
            <DownloadButton />
          </div>
          <div className={styles.heroMeta}>
            <p className={styles.heroNote}>
              No credit card required, get started for free.
            </p>
            <div
              className={styles.heroPlatformList}
              aria-label="Desktop downloads"
            >
              {PLATFORM_ORDER.map((platformId: Platform) => {
                const { Icon, name, id } = PLATFORM_CONFIG[platformId];
                return (
                  <span
                    key={id}
                    className={styles.heroPlatformBadge}
                    role="img"
                    aria-label={name}
                    title={name}
                  >
                    <Icon className={styles.heroPlatformIcon} size={24} />
                  </span>
                );
              })}
            </div>
            <Link
              to="/download"
              className={`${styles.inlineLink} ${styles.heroMoreLink}`}
            >
              More download options
            </Link>
          </div>
        </section>

        <SpeedShowcase />

        <section className={styles.splitSection} id="features">
          <div className={`${styles.splitMedia} ${styles.iconShowcaseMedia}`}>
            <AppIconShowcase />
          </div>
          <div className={styles.splitContent}>
            <span className={styles.badge}>Works on any app</span>
            <h2>Your voice, everywhere you write.</h2>
            <p>
              Voquill integrates seamlessly with any application on your system.
              Whether you&apos;re drafting emails, writing code, or taking notes, your
              voice works everywhere your keyboard does.
            </p>
          </div>
        </section>

        <section className={styles.splitSection} id="privacy">
          <div className={styles.splitContent}>
            <span className={styles.badge}>Private and secure</span>
            <h2>Your data is yours. Period.</h2>
            <p>
              Process everything locally on your device, or bring your own API key to
              connect to the Groq API. Don&apos;t believe us? See for yourself. Voquill is
              fully open-source.
            </p>
            <a
              href="https://github.com/josiahsrc/voquill"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink}
            >
              GitHub Source Code →
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
            <span className={styles.badge}>Smart text cleanup</span>
            <h2>Uhh? Umm? Not anymore.</h2>
            <p>
              Voquill uses AI to clean up your transcripts. It removes filler words,
              hesitations, false starts, etc. Speak naturally, Voquill will handle
              the rest.
            </p>
          </div>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
