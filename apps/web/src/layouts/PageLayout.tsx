"use client";

import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import Link from "next/link";
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
          <Link href="/privacy">
            <FormattedMessage defaultMessage="Privacy" />
          </Link>
          <Link href="/terms">
            <FormattedMessage defaultMessage="Terms" />
          </Link>
          <Link href="/contact">
            <FormattedMessage defaultMessage="Contact" />
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export default PageLayout;
