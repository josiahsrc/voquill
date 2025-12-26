import { useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router-dom";
import styles from "../styles/page.module.css";
import DownloadButton from "./download-button";
import GitHubButton from "./github-button";
import LogoMark from "./logo-mark";

export function SiteHeader() {
  const intl = useIntl();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      href: "/#demo",
      label: intl.formatMessage({ defaultMessage: "Demo" }),
    },
    {
      href: "/#speed",
      label: intl.formatMessage({ defaultMessage: "Purpose" }),
    },
    {
      href: "/#features",
      label: intl.formatMessage({ defaultMessage: "Features" }),
    },
    {
      href: "/#privacy",
      label: intl.formatMessage({ defaultMessage: "Security" }),
    },
  ];

  return (
    <div className={styles.headerWrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <LogoMark className={styles.logoMark} />
          <span>Voquill</span>
        </Link>
        <nav
          className={styles.nav}
          aria-label={intl.formatMessage({
            defaultMessage: "Primary navigation",
          })}
        >
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
        <button
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={
            isMobileMenuOpen
              ? intl.formatMessage({ defaultMessage: "Close menu" })
              : intl.formatMessage({ defaultMessage: "Open menu" })
          }
        >
          <svg
            className={styles.mobileMenuIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>
      {isMobileMenuOpen && (
        <div className={styles.header} style={{ marginTop: "8px" }}>
          <nav className={styles.mobileNav}>
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                className={styles.mobileNavLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.mobileMenuActions}>
            <GitHubButton />
            <DownloadButton />
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteHeader;
