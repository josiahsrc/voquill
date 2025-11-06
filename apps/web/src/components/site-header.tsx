import { Link } from "react-router-dom";
import styles from "../styles/page.module.css";
import DownloadButton from "./download-button";
import GitHubButton from "./github-button";
import LogoMark from "./logo-mark";

const navLinks = [
  { href: "/#demo", label: "Demo" },
  { href: "/#speed", label: "Purpose" },
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Security" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <LogoMark className={styles.logoMark} />
        <span>Voquill</span>
      </Link>
      <nav className={styles.nav} aria-label="Primary navigation">
        {navLinks.map(({ href, label }) => (
          <Link key={href} to={href} className={styles.navLink}>
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
