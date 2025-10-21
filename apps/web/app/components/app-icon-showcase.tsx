import Image from "next/image";
import styles from "./app-icon-showcase.module.css";

type IconDefinition = {
  id: string;
  label: string;
  src: string;
  delay: number;
};

const icons: IconDefinition[] = [
  { id: "imessage", label: "Apple Messages", src: "/imessage.png", delay: 0 },
  { id: "notes", label: "Apple Notes", src: "/notes.png", delay: 2 },
  { id: "slack", label: "Slack", src: "/slack.png", delay: 4 },
  { id: "docs", label: "Google Docs", src: "/docs.png", delay: 6 },
  { id: "github", label: "GitHub Source Code", src: "/vscode.png", delay: 8 },
  { id: "notion", label: "Notion", src: "/notion.png", delay: 10 },
];

type AppIconShowcaseProps = {
  className?: string;
};

export default function AppIconShowcase({ className }: AppIconShowcaseProps) {
  const stageClass = className
    ? `${styles.stage} ${className}`
    : styles.stage;

  return (
    <div className={stageClass}>
      <div className={styles.iconCloud} aria-hidden="true">
        {icons.map(({ id, src, delay }) => (
          <div
            key={id}
            className={`${styles.appIcon} ${styles[id] ?? ""}`}
            style={{ animationDelay: `${delay}s` }}
          >
            <Image
              src={src}
              alt=""
              width={128}
              height={128}
              className={styles.iconImage}
              loading={delay === 0 ? "eager" : "lazy"}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className={styles.srOnly}>
        Supported destinations include {icons
          .map((icon) => icon.label)
          .join(", ")}
        .
      </p>
    </div>
  );
}
