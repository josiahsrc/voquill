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

        <section className={styles.featuresSection} id="features">
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>Why teams choose Voquill</span>
            <h2>Speech-to-text that keeps up with your ideas.</h2>
            <p>
              Our local inference engine, ambient command detection, and privacy
              guardrails deliver a dictation stack inspired by studio-grade
              tools—without sacrificing convenience.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ title, description, highlight }) => (
              <article key={title} className={styles.featureCard}>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className={styles.featureHighlight}>{highlight}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.splitSection} id="privacy">
          <div className={styles.splitContent}>
            <span className={styles.badge}>Private by design</span>
            <h2>Nothing leaves your device unless you send it.</h2>
            <p>
              Voquill packages high-accuracy speech recognition, diarization,
              and summarization into a local workspace. We never phone home, so
              legal, healthcare, and product teams can dictate with confidence.
            </p>
            <ul className={styles.bulletList}>
              <li>Encrypted local vault with automatic session cleanup.</li>
              <li>Hardware-aware optimizations for Apple Silicon &amp; RTX.</li>
              <li>Selectable retention policies for regulated teams.</li>
            </ul>
            <Link className={styles.inlineLink} href="/docs/security">
              Explore the security architecture →
            </Link>
          </div>
          <div className={styles.splitMedia}>
            <Image
              src="https://picsum.photos/seed/voquill-security/960/720"
              alt="Encrypted session log interface"
              fill
              className={styles.mediaImage}
              loading="lazy"
              sizes="(max-width: 960px) 100vw, 45vw"
            />
            <div className={styles.mediaOverlay}>
              <p className={styles.overlayTitle}>AES-256 encrypted session</p>
              <p className={styles.overlayBody}>
                Auto-expiring transcripts with tamper-evident audit trails.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.workflowSection} id="workflow">
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>Flow state, uninterrupted</span>
            <h2>Designed to disappear into your writing routine.</h2>
            <p>
              When you are ready to go heads-down, Voquill orchestrates capture,
              clean-up, and delivery without making you memorize scripts or
              slash commands.
            </p>
          </div>
          <div className={styles.workflowGrid}>
            {workflow.map(({ title, description }) => (
              <div key={title} className={styles.workflowCard}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
          <div className={styles.workflowMedia}>
            <Image
              src="https://picsum.photos/seed/voquill-workflow/1280/720"
              alt="Workflow overview storyboard"
              fill
              className={styles.mediaImage}
              loading="lazy"
              sizes="(max-width: 960px) 100vw, 70vw"
            />
          </div>
        </section>

        <section className={styles.testimonialSection}>
          <div className={styles.testimonialCard}>
            <p className={styles.quote}>
              “The first dictation tool that understands product requirements.
              My engineers ship specs on the same call they brainstorm them.”
            </p>
            <div className={styles.quoteAuthor}>
              <Image
                src="https://picsum.photos/seed/voquill-people/96/96"
                alt="Headshot of pilot customer"
                width={72}
                height={72}
                className={styles.avatar}
                loading="lazy"
              />
              <div>
                <p className={styles.authorName}>Riley Patel</p>
                <p className={styles.authorTitle}>Product Lead, Aurora Labs</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
