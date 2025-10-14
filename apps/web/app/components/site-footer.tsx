import Link from "next/link";
import styles from "../page.module.css";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
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
  );
}

export default SiteFooter;
