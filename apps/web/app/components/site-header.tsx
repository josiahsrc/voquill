import Link from "next/link";
import DownloadButton from "./download-button";
import GitHubButton from "./github-button";
import LogoMark from "./logo-mark";
import styles from "../page.module.css";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <LogoMark className={styles.logoMark} />
        <span>Voquill</span>
      </Link>
      <nav className={styles.nav} aria-label="Primary navigation">
        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href} className={styles.navLink}>
            {label}
          </Link>
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
