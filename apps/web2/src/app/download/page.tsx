import type { Metadata } from "next";
import DownloadPage from "../../views/DownloadPage";

export const metadata: Metadata = {
  title: "Download Voquill",
  description:
    "Install Voquill on macOS, Windows, or Linux and start dictating with AI today.",
  alternates: { canonical: "/download" },
};

export default function Page() {
  return <DownloadPage />;
}
