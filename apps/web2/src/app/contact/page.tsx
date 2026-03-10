import type { Metadata } from "next";
import { renderMarkdown } from "../../lib/markdown";
import ContactPage from "../../views/ContactPage";

export const metadata: Metadata = {
  title: "Contact | Voquill",
  description:
    "Get in touch with the Voquill team for support, enterprise inquiries, or general questions.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  const html = renderMarkdown("contact");
  return <ContactPage html={html} />;
}
