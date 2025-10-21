import Image from "next/image";
import Link from "next/link";
import DownloadButton from "./components/download-button";
import AppIconShowcase from "./components/app-icon-showcase";
import PrivacyLock from "./components/privacy-lock";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";
import SpeedShowcase from "./components/speed-showcase";
import TextCleanupShowcase from "./components/text-cleanup-showcase";
import styles from "./page.module.css";

const partnerLogos = [
  {
    name: "Aurora Labs",
    src: "https://picsum.photos/seed/voquill-logo-aurora/200/80",
  },
  {
    name: "MicDrop",
    src: "https://picsum.photos/seed/voquill-logo-micdrop/200/80",
  },
  {
    name: "Glyph Studio",
    src: "https://picsum.photos/seed/voquill-logo-glyph/200/80",
  },
  {
    name: "House Nine",
    src: "https://picsum.photos/seed/voquill-logo-house/200/80",
  },
  {
    name: "Splitbeam",
    src: "https://picsum.photos/seed/voquill-logo-splitbeam/200/80",
  },
  {
    name: "Northwind",
    src: "https://picsum.photos/seed/voquill-logo-northwind/200/80",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <main className={styles.main}>
        <section className={styles.heroSection} id="overview">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Your keyboard is holding you back.
            </h1>
            <p className={styles.heroSubtitle}>
              Make voice your new keyboard. Type four times faster by using your
              voice.
            </p>
            <div className={styles.heroActions}>
              <DownloadButton />
            </div>
            <p className={styles.heroNote}>
              No credit card required, get started for free.
            </p>
          </div>
          <div className={styles.heroMedia}>
            <div className={styles.videoFrame} id="demo">
              <span>Placeholder demo video</span>
            </div>
          </div>
        </section>

        <section className={styles.partnerSection} aria-label="Pilot partners">
          <p className={styles.partnerHeadline}>
            Trusted by professionals to let them write at the speed of thought.
          </p>
          <div className={styles.partnerCarousel}>
            <div className={styles.partnerTrack}>
              {[...partnerLogos, ...partnerLogos].map(
                ({ name, src }, index) => (
                  <div key={`${name}-${index}`} className={styles.partnerLogo}>
                    <Image
                      src={src}
                      alt={`${name} logo`}
                      width={200}
                      height={80}
                      className={styles.logoImage}
                      loading={index < partnerLogos.length ? "eager" : "lazy"}
                    />
                  </div>
                )
              )}
            </div>
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
              Whether you&apos;re drafting emails, writing code, or taking
              notes, your voice works everywhere your keyboard does.
            </p>
          </div>
        </section>

        <section className={styles.splitSection} id="privacy">
          <div className={styles.splitContent}>
            <span className={styles.badge}>Private and secure</span>
            <h2>Your data is yours. Period.</h2>
            <p>
              Process everything locally on your device, or bring your own API
              key to connect to the Groq API. Don&apos;t believe us? See for
              yourself. Voquill is fully open-source.
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

        <section className={styles.splitSection}>
          <div className={styles.splitMedia}>
            <TextCleanupShowcase />
          </div>
          <div className={styles.splitContent}>
            <span className={styles.badge}>Smart text cleanup</span>
            <h2>Uhh? Umm? Not anymore.</h2>
            <p>
              Voquill uses AI to clean up your transcripts. It removes filler
              words, hesitations, false starts, etc. Speak naturally, Voquill
              will handle the rest.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />

      <div className={styles.pageMeta}>
        <span>© {new Date().getFullYear()} Handaptive LLC</span>
        <div className={styles.pageLinks}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:hello@voquill.com">Contact</a>
        </div>
      </div>
    </div>
  );
}
