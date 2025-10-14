import Link from "next/link";
import styles from "../page.module.css";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#security", label: "Security" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#cta", label: "Early Access" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        Voquill
      </Link>
      <nav className={styles.nav} aria-label="Primary navigation">
        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href} className={styles.navLink}>
            {label}
          </Link>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <Link className={styles.secondaryButton} href="/#workflow">
          See workflow
        </Link>
        <Link className={styles.primaryButton} href="/#cta">
          Request access
        </Link>
      </div>
    </header>
  );
}

export default SiteHeader;
