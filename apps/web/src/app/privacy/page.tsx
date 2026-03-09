import type { Metadata } from "next";
import { renderMarkdown } from "../../lib/markdown";
import PrivacyPage from "../../views/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Voquill",
  description:
    "Learn how Voquill collects, processes, and protects information across our local-first AI dictation platform.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  const html = renderMarkdown("privacy");
  return <PrivacyPage html={html} />;
}
