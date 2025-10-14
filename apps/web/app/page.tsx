import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#security", label: "Security" },
  { href: "#workflow", label: "Workflow" },
  { href: "#cta", label: "Early Access" },
];

const heroStats = [
  { value: "4×", label: "Faster drafting than typing alone" },
  { value: "100%", label: "Local transcription & storage" },
  { value: "12ms", label: "Average response latency" },
];

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
  const year = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>Voquill</div>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} className={styles.navLink}>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.secondaryButton} href="#workflow">
            See workflow
          </a>
          <a className={styles.primaryButton} href="#cta">
            Request access
          </a>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.heroSection} id="overview">
          <div className={styles.heroContent}>
            <span className={styles.badge}>Local-first AI dictation</span>
            <h1 className={styles.heroTitle}>
              Type 4× faster by speaking naturally.
            </h1>
            <p className={styles.heroSubtitle}>
              Voquill turns your voice into polished prose in real time. Capture
              meetings, brainstorms, and deep work sessions with zero cloud
              exposure—everything runs on your machine.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#cta">
                Get early access
              </a>
              <a className={styles.ghostButton} href="#demo">
                Watch a demo
              </a>
            </div>
            <div className={styles.heroStats}>
              {heroStats.map(({ value, label }) => (
                <div key={label} className={styles.statCard}>
                  <span className={styles.statValue}>{value}</span>
                  <span className={styles.statLabel}>{label}</span>
                </div>
              ))}
            </div>
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

      <footer className={styles.footer} id="cta">
        <div className={styles.footerInner}>
          <span className={styles.badge}>Early access</span>
          <h2>Experience Voquill before your competitors do.</h2>
          <p>
            We are onboarding a limited number of teams to refine dictation for
            high-stakes workflows. Reserve your slot and we will share a
            personalized setup.
          </p>
          <div className={styles.footerActions}>
            <a className={styles.primaryButton} href="mailto:founder@voquill.com">
              Request a private demo
            </a>
            <a className={styles.secondaryButton} href="https://cal.com">
              Schedule a call
            </a>
          </div>
        </div>
        <div className={styles.footerMeta}>
          <span>© {year} Voquill, Inc.</span>
          <div className={styles.footerLinks}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/docs/security">Security</Link>
            <a href="mailto:hello@voquill.com">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
