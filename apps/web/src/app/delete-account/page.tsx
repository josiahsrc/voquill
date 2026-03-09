import type { Metadata } from "next";
import { renderMarkdown } from "../../lib/markdown";
import DeleteAccountPage from "../../views/DeleteAccountPage";

export const metadata: Metadata = {
  title: "Delete Account | Voquill",
  description: "Learn how to delete your Voquill account.",
  alternates: { canonical: "/delete-account" },
};

export default function Page() {
  const html = renderMarkdown("delete-account");
  return <DeleteAccountPage html={html} />;
}
