import type { Metadata } from "next";
import { renderMarkdown } from "../../lib/markdown";
import TermsPage from "../../views/TermsPage";

export const metadata: Metadata = {
  title: "Terms of Service | Voquill",
  description:
    "Review the terms of service for using Voquill's voice-first keyboard and transcription tools.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  const html = renderMarkdown("terms");
  return <TermsPage html={html} />;
}
