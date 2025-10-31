import type { CSSProperties, ReactElement } from "react";

export type Platform = "mac" | "windows" | "linux";

export type IconProps = {
  className?: string;
  size?: number;
};

export type PlatformConfig = {
  id: Platform;
  name: string;
  label: string;
  shortLabel: string;
  Icon: (props: IconProps) => ReactElement;
};

export type ReleaseManifest = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, ReleasePlatformDetails | undefined>;
};

export type ReleasePlatformDetails = {
  signature: string;
  url: string;
};

export type PlatformDownload = {
  platform: Platform;
  key: string;
  label: string;
  description?: string;
  url: string;
};

export const DEFAULT_PLATFORM: Platform = "mac";

export const RELEASE_MANIFEST_ENDPOINT = "/api/desktop-release";

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  mac: {
    id: "mac",
    name: "macOS",
    label: "Download for free",
    shortLabel: "Download",
    Icon: createMaskIcon("/apple.svg"),
  },
  windows: {
    id: "windows",
    name: "Windows",
    label: "Download for free",
    shortLabel: "Download",
    Icon: createMaskIcon("/windows.svg"),
  },
  linux: {
    id: "linux",
    name: "Linux",
    label: "Download for free",
    shortLabel: "Download",
    Icon: createMaskIcon("/ubuntu.svg"),
  },
};

const MANIFEST_KEY_DETAILS: Record<
  string,
  { platform: Platform; label: string; description?: string }
> = {
  "darwin-aarch64": {
    platform: "mac",
    label: "macOS (Apple silicon)",
    description: "Universal .app bundle",
  },
  "darwin-x86_64": {
    platform: "mac",
    label: "macOS (Intel)",
    description: "Universal .app bundle",
  },
  "windows-x86_64": {
    platform: "windows",
    label: "Windows (x64)",
    description: ".msi installer",
  },
  "linux-x86_64": {
    platform: "linux",
    label: "Linux (x86_64)",
    description: "AppImage",
  },
};

export const PLATFORM_ORDER: Platform[] = ["mac", "windows", "linux"];

export async function fetchReleaseManifest(signal?: AbortSignal) {
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

export async function selectPlatformUrl(
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

export function extractDownloads(manifest: ReleaseManifest) {
  return Object.entries(manifest.platforms)
    .flatMap(([key, details]) => {
      if (!details?.url) {
        return [];
      }

      const meta = MANIFEST_KEY_DETAILS[key];

      if (meta) {
        const download: PlatformDownload = {
          platform: meta.platform,
          key,
          label: meta.label,
          description: meta.description,
          url: details.url,
        };
        return [download];
      }

      const fallbackPlatform =
        inferPlatformFromManifestKey(key) ?? DEFAULT_PLATFORM;
      const fallback: PlatformDownload = {
        platform: fallbackPlatform,
        key,
        label: formatManifestKey(key),
        url: details.url,
      };
      return [fallback];
    })
    .sort((a, b) => {
      const platformOrder =
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform);
      if (platformOrder !== 0) {
        return platformOrder;
      }

      return a.label.localeCompare(b.label);
    });
}

export function detectPlatform(): Platform {
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

export function getPlatformDisplayName(platform: Platform) {
  return PLATFORM_CONFIG[platform].name;
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

function formatManifestKey(key: string) {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferPlatformFromManifestKey(key: string): Platform | undefined {
  const normalized = key.toLowerCase();
  const [segment = ""] = normalized.split(/[-_]/);

  if (
    segment === "darwin" ||
    segment === "mac" ||
    segment === "macos" ||
    normalized.includes("darwin")
  ) {
    return "mac";
  }

  if (
    segment === "win" ||
    segment === "windows" ||
    normalized.includes("windows")
  ) {
    return "windows";
  }

  if (segment === "linux" || normalized.includes("linux")) {
    return "linux";
  }

  return undefined;
}

function createMaskIcon(path: string) {
  return function Icon({ className, size = 20 }: IconProps): ReactElement {
    const dimensions: CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
    };

    const style: CSSProperties = {
      display: "inline-block",
      backgroundColor: "currentColor",
      mask: `url(${path}) center / contain no-repeat`,
      WebkitMask: `url(${path}) center / contain no-repeat`,
      verticalAlign: "middle",
      ...dimensions,
    };

    return <span aria-hidden="true" className={className} style={style} />;
  };
}
