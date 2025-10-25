import styles from "../styles/page.module.css";
import DownloadButton from "./download-button.js";
import GitHubButton from "./github-button.js";
import LogoMark from "./logo-mark.js";

const navLinks = [
  { href: "/#demo", label: "Demo" },
  { href: "/#speed", label: "Purpose" },
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Security" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo}>
        <LogoMark className={styles.logoMark} />
        <span>Voquill</span>
      </a>
      <nav className={styles.nav} aria-label="Primary navigation">
        {navLinks.map(({ href, label }) => (
          <a key={href} href={href} className={styles.navLink}>
            {label}
          </a>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <GitHubButton className={styles.headerCta} />
        <DownloadButton className={styles.headerCta} />
      </div>
    </header>
  );
}

export default SiteHeader;
