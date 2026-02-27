import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import styles from "../styles/page.module.css";

type PageLayoutProps = {
  children: ReactNode;
  mainClassName?: string;
};

export function PageLayout({ children, mainClassName }: PageLayoutProps) {
  const currentYear = new Date().getFullYear();
  const mainClasses = [styles.main, mainClassName].filter(Boolean).join(" ");

  return (
    <div className={styles.page}>
      <SiteHeader />
      <div className={styles.headerSpacer} />
      <main className={mainClasses}>{children}</main>
      <SiteFooter />
      <footer className={styles.pageMeta}>
        <span>© {currentYear} Handaptive LLC</span>
        <nav className={styles.pageLinks} aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </div>
  );
}

export default PageLayout;
