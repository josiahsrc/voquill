import type { Metadata } from "next";
import { Providers } from "../providers";
import { PageViewTracker } from "../components/page-view-tracker";
import { SITE_URL } from "../lib/site";
import "../styles/global.css";

export const metadata: Metadata = {
  title: "Voquill | Your keyboard is holding you back",
  description: "Type four times faster with a voice-first keyboard.",
  robots: "index,follow",
  openGraph: {
    type: "website",
    title: "Voquill",
    description: "Type four times faster with a voice-first keyboard.",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/social.jpg`,
        type: "image/jpeg",
        alt: "Voquill voice-first typing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voquill | Your keyboard is holding you back",
    description: "Type four times faster with a voice-first keyboard.",
    images: [`${SITE_URL}/social.jpg`],
  },
  icons: {
    icon: "/app-icon.svg",
    shortcut: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
