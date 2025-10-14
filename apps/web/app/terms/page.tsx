import type { Metadata } from "next";
import { getMarkdownContent } from "../../lib/markdown";
import SiteFooter from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import layoutStyles from "../page.module.css";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Voquill",
  description:
    "Read the Voquill Terms of Service to understand your rights and responsibilities when using our AI dictation tools.",
};

export default async function TermsPage() {
  const content = await getMarkdownContent("terms");

  return (
    <div className={layoutStyles.page}>
      <SiteHeader />
      <main className={styles.legalMain}>
        <article
          className={styles.legalContent}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
