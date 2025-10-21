import Image from "next/image";
import Link from "next/link";
import DownloadButton from "./components/download-button";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";
import SpeedShowcase from "./components/speed-showcase";
import styles from "./page.module.css";

const features = [
  {
    title: "Dictation that adapts to you",
    description:
      "Voquill listens for personal vocabulary, meeting context, and project names so every draft sounds like you.",
    highlight: "Custom voice models update after each session.",
  },
  {
    title: "Command mode without the commands",
    description:
      "Natural-language shortcuts let you fix typos, add punctuation, and drop snippets without breaking your flow.",
    highlight: "“Fix the last sentence” instantly rewrites your thought.",
  },
  {
    title: "Live collaboration in any app",
    description:
      "Mirror the transcript into Google Docs, Notion, or your IDE while keeping your raw audio locked on-device.",
    highlight: "Sync over a secure local bridge—never the cloud.",
  },
];

const workflow = [
  {
    title: "Capture",
    description:
      "Start a recording with one keystroke. Voquill detects your microphone and begins a secure local stream.",
  },
  {
    title: "Clarify",
    description:
      "Highlight sentences with your voice—“mark this for edit”—and watch Voquill tidy grammar or tone as you speak.",
  },
  {
    title: "Commit",
    description:
      "Send the polished transcript anywhere with a single push, or export encrypted session logs for compliance.",
  },
];

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
          <div className={styles.splitMedia}>
            <Image
              src="https://picsum.photos/seed/voquill-any-app/960/720"
              alt="Voquill working across multiple applications"
              fill
              className={styles.mediaImage}
              loading="lazy"
              sizes="(max-width: 960px) 100vw, 45vw"
            />
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
              key to connect to the Groq API. Don't believe us? See for
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
          <div className={styles.splitMedia}>
            <Image
              src="https://picsum.photos/seed/voquill-privacy/960/720"
              alt="Local processing and encryption visualization"
              fill
              className={styles.mediaImage}
              loading="lazy"
              sizes="(max-width: 960px) 100vw, 45vw"
            />
          </div>
        </section>

        <section className={styles.splitSection}>
          <div className={styles.splitMedia}>
            <Image
              src="https://picsum.photos/seed/voquill-cleanup/960/720"
              alt="AI-powered text cleanup interface"
              fill
              className={styles.mediaImage}
              loading="lazy"
              sizes="(max-width: 960px) 100vw, 45vw"
            />
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
