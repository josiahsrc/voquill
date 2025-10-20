import Image from "next/image";
import Link from "next/link";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";
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

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <main className={styles.main}>
        <section className={styles.heroSection} id="overview">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Your keyboard is slowing you down.
            </h1>
            <p className={styles.heroSubtitle}>
              Make your voice your new keyboard. Type four times faster with
              your voice.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#cta">
                <svg
                  aria-hidden="true"
                  className={styles.buttonIcon}
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <path d="M16.365 13.533c-.031-3.084 2.514-4.584 2.628-4.659-1.43-2.09-3.647-2.376-4.431-2.406-1.888-.19-3.68 1.109-4.636 1.109-.955 0-2.435-1.082-4.007-1.052-2.05.031-3.944 1.185-4.994 3.009-2.129 3.688-.542 9.164 1.528 12.166 1.013 1.463 2.221 3.109 3.809 3.048 1.528-.062 2.104-.986 3.96-.986 1.856 0 2.371.986 4.008.955 1.655-.031 2.706-1.494 3.719-2.957 1.166-1.701 1.647-3.348 1.678-3.439-.031-.031-3.216-1.24-3.247-4.788zM12.584 5.807c.834-1.008 1.396-2.412 1.24-3.807-1.201.047-2.648.801-3.5 1.809-.772.887-1.448 2.301-1.271 3.659 1.34.103 2.697-.683 3.531-1.661z" />
                </svg>
                <span>Download for free</span>
              </a>
            </div>
            <p className={styles.heroNote}>
              No credit card required, get started for free.
            </p>
          </div>
          <div className={styles.heroMedia}>
            <div className={styles.videoFrame} id="demo">
              <span>Placeholder demo video</span>
            </div>
            <div className={styles.calloutCard}>
              <p className={styles.calloutTitle}>Smart cleanup</p>
              <p className={styles.calloutBody}>
                “Replace filler words and tighten tone.” Voquill edits while you
                speak, so drafts are ready to ship.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.partnerSection} aria-label="Pilot partners">
          <p className={styles.partnerHeadline}>
            Trusted pilots are already closing the gap between thought and text.
          </p>
          <div className={styles.partnerLogos}>
            {[
              "Aurora Labs",
              "MicDrop",
              "Glyph Studio",
              "House Nine",
              "Splitbeam",
            ].map((name) => (
              <span key={name} className={styles.partner}>
                {name}
              </span>
            ))}
          </div>
        </section>

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

        <section className={styles.splitSection} id="security">
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
