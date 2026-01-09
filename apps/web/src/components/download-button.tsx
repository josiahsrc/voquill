import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { trackButtonClick } from "../lib/analytics";
import {
  DEFAULT_PLATFORM,
  detectPlatform,
  fetchReleaseManifest,
  isMobileDevice,
  PLATFORM_CONFIG,
  selectPlatformUrl,
  type Platform,
} from "../lib/downloads";
import styles from "../styles/page.module.css";

type DownloadButtonProps = {
  href?: string;
  className?: string;
  trackingId?: string;
};

const BUTTON_ICON_SIZE = 20;
const COMPACT_LABEL_BREAKPOINT = 640;

export function DownloadButton({
  href,
  className,
  trackingId,
}: DownloadButtonProps) {
  const classes = [styles.primaryButton, className].filter(Boolean).join(" ");
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [downloadHref, setDownloadHref] = useState<string | undefined>(href);
  const [isCompact, setIsCompact] = useState(false);
  const { label, shortLabel, Icon } = PLATFORM_CONFIG[platform];
  const isMobile = useMemo(() => isMobileDevice(), []);

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

    if (isMobile) {
      return () => {
        isCancelled = true;
        abortController.abort();
      };
    }

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
  }, [href, isMobile]);

  const buttonLabel = isMobile
    ? "iOS/Android coming soon"
    : isCompact
      ? shortLabel
      : label;

  if (isMobile) {
    return (
      <button type="button" className={classes} disabled>
        <FormattedMessage defaultMessage="iOS/Android coming soon" />
      </button>
    );
  }

  const handleClick = () => {
    if (trackingId) {
      trackButtonClick(trackingId);
    }
  };

  return (
    <a href={downloadHref} className={classes} onClick={handleClick}>
      <Icon className={styles.buttonIcon} size={BUTTON_ICON_SIZE} />
      <span>{buttonLabel}</span>
    </a>
  );
}

export default DownloadButton;
