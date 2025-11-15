import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import styles from "../styles/page.module.css";
import DownloadButton from "./download-button";
import GitHubButton from "./github-button";
import LogoMark from "./logo-mark";

export function SiteHeader() {
  const intl = useIntl();

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
    </header>
  );
}

export default SiteHeader;
