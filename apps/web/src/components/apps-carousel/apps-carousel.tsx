import { FormattedMessage } from "react-intl";
import styles from "./apps-carousel.module.css";

type AppIcon = {
  name: string;
  slug: string;
};

// Top carousel apps
const topRowApps: AppIcon[] = [
  { name: "Chromatic", slug: "chromatic" },
  { name: "Discord", slug: "discord" },
  { name: "Notion", slug: "notion" },
  { name: "Google Docs", slug: "googledocs" },
  { name: "Obsidian", slug: "obsidian" },
  { name: "WhatsApp", slug: "whatsapp" },
  { name: "Telegram", slug: "telegram" },
  { name: "Signal", slug: "signal" },
  { name: "Linear", slug: "linear" },
  { name: "Figma", slug: "figma" },
  { name: "Trello", slug: "trello" },
  { name: "Asana", slug: "asana" },
  { name: "Jira", slug: "jira" },
  { name: "Todoist", slug: "todoist" },
  { name: "Evernote", slug: "evernote" },
];

// Bottom carousel apps
const bottomRowApps: AppIcon[] = [
  { name: "GitHub", slug: "github" },
  { name: "GitLab", slug: "gitlab" },
  { name: "Chrome", slug: "googlechrome" },
  { name: "Firefox", slug: "firefox" },
  { name: "Safari", slug: "safari" },
  { name: "Gmail", slug: "gmail" },
  { name: "YouTube", slug: "youtube" },
  { name: "Spotify", slug: "spotify" },
  { name: "Zoom", slug: "zoom" },
  { name: "Sketch", slug: "sketch" },
  { name: "Dribbble", slug: "dribbble" },
  { name: "Dropbox", slug: "dropbox" },
  { name: "Google Drive", slug: "googledrive" },
  { name: "iCloud", slug: "icloud" },
  { name: "WhatsApp", slug: "whatsapp" },
];

function IconRow({
  apps,
  direction,
  duration,
}: {
  apps: AppIcon[];
  direction: "left" | "right";
  duration: number;
}) {
  // Duplicate apps for seamless loop
  const duplicatedApps = [...apps, ...apps];

  return (
    <div className={styles.rowWrapper}>
      <div
        className={`${styles.row} ${direction === "right" ? styles.rowReverse : ""}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {duplicatedApps.map((app, index) => (
          <div key={`${app.slug}-${index}`} className={styles.iconCard}>
            <img
              src={`https://cdn.simpleicons.org/${app.slug}`}
              alt={app.name}
              width={32}
              height={32}
              className={styles.iconImage}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppsCarousel() {
  return (
    <section className={styles.section}>
      {/* Top carousel - angled */}
      <div className={styles.carouselTop}>
        <IconRow apps={topRowApps} direction="left" duration={40} />
      </div>

      {/* Center content */}
      <div className={styles.content}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Universal compatibility" />
        </span>
        <h2 className={styles.title}>
          <FormattedMessage defaultMessage="One voice. Every app." />
        </h2>
        <p className={styles.subtitle}>
          <FormattedMessage defaultMessage="Voquill works system-wide across macOS, Windows, and Linux. Any text field, any application—your voice just works." />
        </p>
      </div>

      {/* Bottom carousel - angled */}
      <div className={styles.carouselBottom}>
        <IconRow apps={bottomRowApps} direction="right" duration={35} />
      </div>
    </section>
  );
}
