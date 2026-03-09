import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { trackButtonClick } from "../utils/analytics.utils";
import {
  DEFAULT_PLATFORM,
  detectPlatform,
  fetchReleaseManifest,
  isMobileDevice,
  PLATFORM_CONFIG,
  selectPlatformUrl,
  type Platform,
} from "../lib/downloads";
import { Dialog } from "./dialog";
import styles from "../styles/page.module.css";

type DownloadButtonProps = {
  href?: string;
  className?: string;
  trackingId?: string;
};

const BUTTON_ICON_SIZE = 20;
const COMPACT_LABEL_BREAKPOINT = 640;

const LINUX_INSTALL_COMMAND =
  "curl -fsSL https://voquill.github.io/apt/install.sh | bash";

function LinuxInstallDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(LINUX_INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={<FormattedMessage defaultMessage="Install Voquill on Linux" />}
    >
      <p className={styles.linuxDialogDescription}>
        <FormattedMessage defaultMessage="Run this command in your terminal to install Voquill via APT:" />
      </p>
      <div className={styles.linuxCodeBlock}>
        <code>{LINUX_INSTALL_COMMAND}</code>
        <button
          type="button"
          className={styles.linuxCopyButton}
          onClick={handleCopy}
        >
          {copied ? (
            <FormattedMessage defaultMessage="Copied!" />
          ) : (
            <FormattedMessage defaultMessage="Copy" />
          )}
        </button>
      </div>
      <p className={styles.linuxDialogHint}>
        <FormattedMessage defaultMessage="Supports Debian, Ubuntu, and other APT-based distributions. After installing, upgrade anytime with:" />
      </p>
      <div className={styles.linuxCodeBlock}>
        <code>sudo apt-get update && sudo apt-get upgrade voquill-desktop</code>
      </div>
      <p className={styles.linuxDialogHint}>
        <FormattedMessage defaultMessage="Looking for other options? Visit the {link} for AppImage and other downloads." values={{
          link: <a href="/download" className={styles.inlineLink}><FormattedMessage defaultMessage="downloads page" /></a>,
        }} />
      </p>
      <button
        type="button"
        className={styles.ghostButton}
        onClick={onClose}
      >
        <FormattedMessage defaultMessage="Close" />
      </button>
    </Dialog>
  );
}

export function DownloadButton({
  href,
  className,
  trackingId,
}: DownloadButtonProps) {
  const classes = [styles.primaryButton, className].filter(Boolean).join(" ");
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [downloadHref, setDownloadHref] = useState<string | undefined>(href);
  const [isCompact, setIsCompact] = useState(false);
  const [showLinuxDialog, setShowLinuxDialog] = useState(false);
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

    if (isMobile || detectedPlatform === "linux") {
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

  const handleCloseLinuxDialog = useCallback(() => {
    setShowLinuxDialog(false);
  }, []);

  if (isMobile) {
    return (
      <button type="button" className={classes} disabled>
        <FormattedMessage defaultMessage="iOS/Android coming soon" />
      </button>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    if (trackingId) {
      trackButtonClick(trackingId);
    }
    if (platform === "linux") {
      e.preventDefault();
      setShowLinuxDialog(true);
    }
  };

  return (
    <>
      <a href={downloadHref} className={classes} onClick={handleClick}>
        <Icon className={styles.buttonIcon} size={BUTTON_ICON_SIZE} />
        <span>{buttonLabel}</span>
      </a>
      {platform === "linux" && (
        <LinuxInstallDialog
          open={showLinuxDialog}
          onClose={handleCloseLinuxDialog}
        />
      )}
    </>
  );
}

export default DownloadButton;
