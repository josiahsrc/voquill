import { type ReactElement, useEffect, useState } from "react";
import styles from "../styles/page.module.css";

type DownloadButtonProps = {
  href?: string;
  className?: string;
};

type Platform = "mac" | "windows" | "linux";

type PlatformConfig = {
  label: string;
  Icon: (props: IconProps) => ReactElement;
};

type IconProps = {
  className?: string;
  size?: number;
};

type ReleaseManifest = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, ReleasePlatformDetails | undefined>;
};

type ReleasePlatformDetails = {
  signature: string;
  url: string;
};

const DEFAULT_PLATFORM: Platform = "mac";

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  mac: {
    label: "Download for macOS",
    Icon: AppleIcon,
  },
  windows: {
    label: "Download for Windows",
    Icon: WindowsIcon,
  },
  linux: {
    label: "Download for Linux",
    Icon: LinuxIcon,
  },
};

const RELEASE_MANIFEST_ENDPOINT = "/api/desktop-release";

function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return DEFAULT_PLATFORM;
  }

  const { navigator } = window;
  const platformHint =
    "userAgentData" in navigator && navigator.userAgentData
      ? // NavigatorUAData#platform
        (navigator.userAgentData as { platform?: string }).platform ?? ""
      : "";
  const ua = [navigator.userAgent ?? "", platformHint, navigator.platform ?? ""]
    .join(" ")
    .toLowerCase();

  if (ua.includes("win")) {
    return "windows";
  }

  if (ua.includes("mac") || ua.includes("darwin")) {
    return "mac";
  }

  if (ua.includes("linux") && !ua.includes("android")) {
    return "linux";
  }

  return DEFAULT_PLATFORM;
}

export function DownloadButton({
  href = "#cta",
  className,
}: DownloadButtonProps) {
  const classes = [styles.primaryButton, className].filter(Boolean).join(" ");
  const size = 20;
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [downloadHref, setDownloadHref] = useState<string>(href);
  const { label, Icon } = PLATFORM_CONFIG[platform];

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

  return (
    <a href={downloadHref} className={classes}>
      <Icon className={styles.buttonIcon} size={size} />
      <span>{label}</span>
    </a>
  );
}

function AppleIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ transform: "translateY(-1px)" }}
    >
      <path
        fill="currentColor"
        d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
      />
    </svg>
  );
}

function WindowsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
    >
      <path
        fill="currentColor"
        d="M2 4.2 11.5 3v9.1H2zm0 10.4h9.5V22L2 20.8zm10.5-11 9.5-1.3V12h-9.5zm0 11.3H22V22l-9.5-1.3z"
      />
    </svg>
  );
}

function LinuxIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
    >
      <path
        fill="currentColor"
        d="M12 2.5a3.5 3.5 0 0 1 3.5 3.4c0 1.6-1.1 3.1-2.7 3.6v.6c2 0 3.8 1.3 4.4 3.1l.9 2.7c.2.7-.2 1.5-.9 1.6l-1.6.3-.9 3.6a1 1 0 0 1-1 .8h-3.5a1 1 0 0 1-1-.8l-.9-3.6-1.6-.3c-.7-.1-1.1-.9-.9-1.6l.9-2.7c.6-1.8 2.4-3.1 4.4-3.1v-.6A3.6 3.6 0 0 1 8.5 5.9 3.5 3.5 0 0 1 12 2.5Zm-1.5 16.2.7 2.7h1.6l.7-2.7zm4.2-8.2c-1.3-.9-3-.9-4.3 0l-.5.3c-1.1.7-1.9 1.6-2.3 2.8l-.4 1.1.8.2c.5.1.9.4 1 .8l1 4h4l1-4c.1-.4.5-.7 1-.8l.8-.2-.4-1.1c-.4-1.2-1.2-2.1-2.3-2.8Z"
      />
      <circle cx="10.5" cy="6.4" r=".6" fill="currentColor" />
      <circle cx="13.5" cy="6.4" r=".6" fill="currentColor" />
    </svg>
  );
}

export default DownloadButton;

async function fetchReleaseManifest(signal: AbortSignal) {
  try {
    const response = await fetch(RELEASE_MANIFEST_ENDPOINT, {
      signal,
      cache: "no-cache",
    });

    if (!response.ok) {
      return undefined;
    }

    const manifest = (await response.json()) as ReleaseManifest;
    return manifest;
  } catch {
    return undefined;
  }
}

async function selectPlatformUrl(
  manifest: ReleaseManifest,
  platform: Platform,
) {
  const preference = await buildPlatformPreference(platform);

  for (const key of preference) {
    const url = manifest.platforms[key]?.url;
    if (url) {
      return url;
    }
  }

  return undefined;
}

async function buildPlatformPreference(platform: Platform) {
  switch (platform) {
    case "mac": {
      const macKey = await detectMacManifestKey();
      if (macKey === "darwin-aarch64") {
        return ["darwin-aarch64", "darwin-x86_64"];
      }

      if (macKey === "darwin-x86_64") {
        return ["darwin-x86_64", "darwin-aarch64"];
      }

      return ["darwin-aarch64", "darwin-x86_64"];
    }
    case "windows":
      return ["windows-x86_64"];
    case "linux":
      return ["linux-x86_64"];
    default:
      return [];
  }
}

async function detectMacManifestKey() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { navigator } = window;
  const ua = [
    navigator.userAgent ?? "",
    "userAgentData" in navigator
      ? (navigator.userAgentData as { platform?: string }).platform ?? ""
      : "",
    navigator.platform ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (ua.includes("arm") || ua.includes("aarch") || ua.includes("apple silicon")) {
    return "darwin-aarch64";
  }

  const userAgentData = (navigator as Navigator & {
    userAgentData?: {
      getHighEntropyValues?: (
        hints: string[],
      ) => Promise<{ architecture?: string }>;
    };
  }).userAgentData;

  if (userAgentData?.getHighEntropyValues) {
    try {
      const { architecture } = await userAgentData.getHighEntropyValues([
        "architecture",
      ]);
      const normalized = architecture?.toLowerCase() ?? "";

      if (normalized.includes("arm") || normalized.includes("aarch")) {
        return "darwin-aarch64";
      }

      if (normalized.includes("86") || normalized.includes("amd")) {
        return "darwin-x86_64";
      }
    } catch {
      // ignore failures and fall through to default preference order
    }
  }

  return undefined;
}
