import type { Metadata } from "next";
import { getMarkdownContent } from "../../lib/markdown";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Voquill",
  description:
    "Read the Voquill Terms of Service to understand your rights and responsibilities when using our AI dictation tools.",
};

export default async function TermsPage() {
  const content = await getMarkdownContent("terms");

  return (
    <div className={styles.legalPage}>
      <article
        className={styles.legalWrapper}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
