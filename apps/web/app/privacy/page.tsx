import type { Metadata } from "next";
import { getMarkdownContent } from "../../lib/markdown";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Voquill",
  description:
    "Learn how Voquill collects, processes, and protects information across our local-first AI dictation platform.",
};

export default async function PrivacyPage() {
  const content = await getMarkdownContent("privacy");

  return (
    <div className={styles.legalPage}>
      <article
        className={styles.legalWrapper}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
