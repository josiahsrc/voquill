import type { Metadata } from "next";
import { Providers } from "../providers";
import { PageViewTracker } from "../components/page-view-tracker";
import { SITE_URL } from "../lib/site";
import "../styles/global.css";

export const metadata: Metadata = {
  title: "Voquill | Your keyboard is holding you back",
  description:
    "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
  robots: "index,follow",
  openGraph: {
    type: "website",
    siteName: "Voquill",
    locale: "en_US",
    title: "Voquill | Your keyboard is holding you back",
    description:
      "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/social.jpg`,
        type: "image/jpeg",
        width: 1200,
        height: 630,
        alt: "Voquill — type four times faster with voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voquill | Your keyboard is holding you back",
    description:
      "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
    images: [
      {
        url: `${SITE_URL}/social.jpg`,
        alt: "Voquill — type four times faster with voice",
      },
    ],
  },
  icons: {
    icon: "/app-icon.svg",
    shortcut: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
  other: {
    "theme-color": "#121212",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap"
        />
      </head>
      <body>
        <Providers>
          <PageViewTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
