import { useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM,
  detectPlatform,
  fetchReleaseManifest,
  PLATFORM_CONFIG,
  selectPlatformUrl,
  type Platform,
} from "../lib/downloads.js";
import styles from "../styles/page.module.css";

type DownloadButtonProps = {
  href?: string;
  className?: string;
};

const BUTTON_ICON_SIZE = 20;
const COMPACT_LABEL_BREAKPOINT = 640;

export function DownloadButton({
  href = "#cta",
  className,
}: DownloadButtonProps) {
  const classes = [styles.primaryButton, className].filter(Boolean).join(" ");
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [downloadHref, setDownloadHref] = useState<string>(href);
  const [isCompact, setIsCompact] = useState(false);
  const { label, shortLabel, Icon } = PLATFORM_CONFIG[platform];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateCompactState = () => {
      setIsCompact(window.innerWidth < COMPACT_LABEL_BREAKPOINT);
    };

    updateCompactState();
    window.addEventListener("resize", updateCompactState);

    return () => {
      window.removeEventListener("resize", updateCompactState);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();
    const detectedPlatform = detectPlatform();

    setPlatform(detectedPlatform);
    setDownloadHref(href);

    async function updateDownloadHref() {
      try {
        const manifest = await fetchReleaseManifest(abortController.signal);
        if (isCancelled || !manifest) {
          return;
        }

        const url = await selectPlatformUrl(manifest, detectedPlatform);
        if (!isCancelled && url) {
          setDownloadHref(url);
        }
      } catch (error) {
        console.error("Failed to resolve download URL", error);
      }
    }

    void updateDownloadHref();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [href]);

  const buttonLabel = isCompact ? shortLabel : label;

  return (
    <a href={downloadHref} className={classes}>
      <Icon className={styles.buttonIcon} size={BUTTON_ICON_SIZE} />
      <span>{buttonLabel}</span>
    </a>
  );
}

export default DownloadButton;
