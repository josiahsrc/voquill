import type { Metadata } from "next";
import { getMarkdownContent } from "../../lib/markdown";
import SiteFooter from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import layoutStyles from "../page.module.css";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Voquill",
  description:
    "Learn how Voquill collects, processes, and protects information across our local-first AI dictation platform.",
};

export default async function PrivacyPage() {
  const content = await getMarkdownContent("privacy");

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
