import type { CSSProperties, ReactElement } from "react";
import { getIntl } from "../i18n/intl";

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

const RELEASES_API_URL =
  "https://api.github.com/repos/josiahsrc/voquill/releases";

const RELEASE_TAG_PATTERNS = {
  cpu: /^desktop-v\d/,
  gpu: /^desktop-gpu-v\d/,
};

export function getPlatformConfig(
  intl = getIntl(),
): Record<Platform, PlatformConfig> {
  return {
    mac: {
      id: "mac",
      name: "macOS",
      label: intl.formatMessage({ defaultMessage: "Download for free" }),
      shortLabel: intl.formatMessage({ defaultMessage: "Download" }),
      Icon: createMaskIcon("/apple.svg"),
    },
    windows: {
      id: "windows",
      name: "Windows",
      label: intl.formatMessage({ defaultMessage: "Download for free" }),
      shortLabel: intl.formatMessage({ defaultMessage: "Download" }),
      Icon: createMaskIcon("/windows.svg"),
    },
    linux: {
      id: "linux",
      name: "Linux",
      label: intl.formatMessage({ defaultMessage: "Download for free" }),
      shortLabel: intl.formatMessage({ defaultMessage: "Download" }),
      Icon: createMaskIcon("/ubuntu.svg"),
    },
  };
}

// Export non-function version for backwards compatibility
export const PLATFORM_CONFIG = getPlatformConfig();

function getManifestKeyDetails(
  intl = getIntl(),
): Record<string, { platform: Platform; label: string; description?: string }> {
  return {
    "darwin-aarch64": {
      platform: "mac",
      label: intl.formatMessage({ defaultMessage: "macOS (Apple silicon)" }),
      description: intl.formatMessage({
        defaultMessage: "Universal .app bundle",
      }),
    },
    "darwin-x86_64": {
      platform: "mac",
      label: intl.formatMessage({ defaultMessage: "macOS (Intel)" }),
      description: intl.formatMessage({
        defaultMessage: "Universal .app bundle",
      }),
    },
    "darwin-universal": {
      platform: "mac",
      label: intl.formatMessage({ defaultMessage: "macOS (Universal)" }),
      description: intl.formatMessage({
        defaultMessage: "Installer for all macOS architectures",
      }),
    },
    "windows-x86_64": {
      platform: "windows",
      label: intl.formatMessage({ defaultMessage: "Windows (x64)" }),
      description: intl.formatMessage({ defaultMessage: ".msi installer" }),
    },
    "windows-x86_64-gpu": {
      platform: "windows",
      label: intl.formatMessage({ defaultMessage: "Windows (x64 GPU)" }),
      description: intl.formatMessage({
        defaultMessage: ".msi installer with Vulkan acceleration",
      }),
    },
    "linux-x86_64": {
      platform: "linux",
      label: intl.formatMessage({ defaultMessage: "Linux (x86_64)" }),
      description: intl.formatMessage({ defaultMessage: "AppImage" }),
    },
    "linux-x86_64-gpu": {
      platform: "linux",
      label: intl.formatMessage({ defaultMessage: "Linux (x86_64 GPU)" }),
      description: intl.formatMessage({
        defaultMessage: "AppImage with Vulkan acceleration",
      }),
    },
    "linux-x86_64-gpu-deb": {
      platform: "linux",
      label: intl.formatMessage({ defaultMessage: "Linux (x86_64 GPU)" }),
      description: intl.formatMessage({
        defaultMessage: ".deb with Vulkan acceleration",
      }),
    },
    "linux-x86_64-gpu-rpm": {
      platform: "linux",
      label: intl.formatMessage({ defaultMessage: "Linux (x86_64 GPU)" }),
      description: intl.formatMessage({
        defaultMessage: ".rpm with Vulkan acceleration",
      }),
    },
    "windows-x86_64-gpu-nsis": {
      platform: "windows",
      label: intl.formatMessage({ defaultMessage: "Windows (x64 GPU)" }),
      description: intl.formatMessage({
        defaultMessage: ".exe installer with Vulkan acceleration",
      }),
    },
  };
}

const MANIFEST_KEY_DETAILS = getManifestKeyDetails();

export const PLATFORM_ORDER: Platform[] = ["mac", "windows", "linux"];

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  content_type?: string;
  size?: number;
};

type GithubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  assets?: GithubReleaseAsset[];
};

const ASSET_KEY_MAPPINGS: Array<{
  match: (name: string, contentType?: string) => boolean;
  keys: string[];
}> = [
  {
    match: (name) => /^Voquill[._](?!GPU).*\.AppImage$/i.test(name),
    keys: ["linux-x86_64", "linux-x86_64-appimage"],
  },
  {
    match: (name) => /^Voquill[._](?!GPU).*\.deb$/i.test(name),
    keys: ["linux-x86_64-deb"],
  },
  {
    match: (name) => /^Voquill[._](?!GPU).*\.rpm$/i.test(name),
    keys: ["linux-x86_64-rpm"],
  },
  {
    match: (name) => /\.app\.tar\.gz$/i.test(name),
    keys: ["darwin-universal"],
  },
  {
    match: (name) => /\.dmg$/i.test(name),
    keys: ["darwin-universal"],
  },
  {
    match: (name) => /darwin.*\.app\.tar\.gz$/i.test(name),
    keys: [
      "darwin-aarch64",
      "darwin-x86_64",
      "darwin-aarch64-app",
      "darwin-x86_64-app",
    ],
  },
  {
    match: (name) => /^Voquill[._](?!GPU).*\.msi$/i.test(name),
    keys: ["windows-x86_64", "windows-x86_64-msi"],
  },
  {
    match: (name) => /^Voquill[._](?!GPU).*setup.*\.exe$/i.test(name),
    keys: ["windows-x86_64-nsis"],
  },
  {
    match: (name) => /Voquill\.GPU.*\.AppImage$/i.test(name),
    keys: ["linux-x86_64-gpu"],
  },
  {
    match: (name) => /Voquill\.GPU.*\.deb$/i.test(name),
    keys: ["linux-x86_64-gpu-deb"],
  },
  {
    match: (name) => /Voquill\.GPU.*\.rpm$/i.test(name),
    keys: ["linux-x86_64-gpu-rpm"],
  },
  {
    match: (name) => /Voquill\.GPU.*\.msi$/i.test(name),
    keys: ["windows-x86_64-gpu"],
  },
  {
    match: (name) => /Voquill\.GPU.*setup.*\.exe$/i.test(name),
    keys: ["windows-x86_64-gpu-nsis"],
  },
];

export async function fetchReleaseManifest(signal?: AbortSignal) {
  try {
    const response = await fetch(RELEASES_API_URL, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.ok) return undefined;

    const allReleases = (await response.json()) as GithubRelease[];

    const cpuReleases = allReleases.filter(
      (r) => r.tag_name && RELEASE_TAG_PATTERNS.cpu.test(r.tag_name),
    );
    const gpuReleases = allReleases.filter(
      (r) => r.tag_name && RELEASE_TAG_PATTERNS.gpu.test(r.tag_name),
    );

    const latestCpu = cpuReleases[0];
    const latestGpu = gpuReleases[0];

    const validReleases = [latestCpu, latestGpu].filter(
      (r): r is GithubRelease => r !== undefined,
    );
    if (validReleases.length === 0) return undefined;

    const allAssets = validReleases.flatMap((r) => r.assets ?? []);
    const firstRelease = validReleases[0];
    const combined: GithubRelease = {
      ...firstRelease,
      assets: allAssets,
    };

    const manifest = transformGithubRelease(combined);
    if (!manifest) return undefined;

    const previousCpu = cpuReleases[1];
    const previousGpu = gpuReleases[1];
    const fallbackReleases = [previousCpu, previousGpu].filter(
      (r): r is GithubRelease => r !== undefined,
    );

    if (fallbackReleases.length > 0) {
      const fallbackAssets = fallbackReleases.flatMap((r) => r.assets ?? []);
      const fallbackCombined: GithubRelease = {
        ...fallbackReleases[0],
        assets: fallbackAssets,
      };
      const fallbackManifest = transformGithubRelease(fallbackCombined);
      if (fallbackManifest) {
        for (const [key, details] of Object.entries(
          fallbackManifest.platforms,
        )) {
          if (!manifest.platforms[key] && details) {
            manifest.platforms[key] = details;
          }
        }
      }
    }

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

      const aIsGpu = a.key.includes("gpu");
      const bIsGpu = b.key.includes("gpu");
      if (aIsGpu !== bIsGpu) {
        return aIsGpu ? 1 : -1;
      }

      return a.label.localeCompare(b.label);
    });
}

function transformGithubRelease(
  release: GithubRelease,
): ReleaseManifest | undefined {
  const assets = release.assets ?? [];
  const platforms: Record<string, ReleasePlatformDetails | undefined> = {};

  for (const asset of assets) {
    const keys = resolveManifestKeys(asset);
    if (!keys?.length) {
      continue;
    }

    for (const key of keys) {
      if (!platforms[key]) {
        platforms[key] = {
          url: asset.browser_download_url,
          signature: "",
        };
      }
    }
  }

  if (Object.keys(platforms).length === 0) {
    return undefined;
  }

  return {
    version: normalizeVersion(release.tag_name ?? release.name),
    notes: release.body ?? "",
    pub_date: release.published_at ?? new Date().toISOString(),
    platforms,
  };
}

function resolveManifestKeys(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();
  for (const { match, keys } of ASSET_KEY_MAPPINGS) {
    if (match(name, asset.content_type)) {
      return keys;
    }
  }

  if (name.endsWith(".json")) {
    return undefined;
  }

  if (name.includes("darwin") || name.includes("mac")) {
    return ["darwin-aarch64", "darwin-x86_64"];
  }

  if (name.includes("windows") || name.includes("win")) {
    return ["windows-x86_64"];
  }

  if (name.includes("linux")) {
    return ["linux-x86_64"];
  }

  return undefined;
}

function normalizeVersion(tag?: string) {
  if (!tag) {
    return "latest";
  }

  const trimmed = tag.trim();
  if (!trimmed) {
    return "latest";
  }

  if (/^desktop[-v]/i.test(trimmed)) {
    return trimmed.replace(/^desktop[-v]*/i, "");
  }

  if (/^v\d/i.test(trimmed)) {
    return trimmed.replace(/^v/i, "");
  }

  return trimmed;
}

export function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return DEFAULT_PLATFORM;
  }

  const { navigator } = window;
  const platformHint =
    "userAgentData" in navigator && navigator.userAgentData
      ? // NavigatorUAData#platform
        ((navigator.userAgentData as { platform?: string }).platform ?? "")
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

export function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const { navigator } = window;
  const platformHint =
    "userAgentData" in navigator && navigator.userAgentData
      ? ((navigator.userAgentData as { platform?: string }).platform ?? "")
      : "";
  const ua = [navigator.userAgent ?? "", platformHint, navigator.platform ?? ""]
    .join(" ")
    .toLowerCase();

  return /iphone|ipad|ipod|android/.test(ua);
}

export function getPlatformDisplayName(platform: Platform) {
  return PLATFORM_CONFIG[platform].name;
}

async function buildPlatformPreference(platform: Platform) {
  switch (platform) {
    case "mac": {
      const macKey = await detectMacManifestKey();
      if (macKey === "darwin-aarch64") {
        return ["darwin-aarch64", "darwin-universal"];
      }

      if (macKey === "darwin-x86_64") {
        return ["darwin-x86_64", "darwin-universal"];
      }

      return ["darwin-universal", "darwin-aarch64", "darwin-x86_64"];
    }
    case "windows":
      return ["windows-x86_64", "windows-x86_64-msi", "windows-x86_64-nsis"];
    case "linux":
      return [
        "linux-x86_64",
        "linux-x86_64-appimage",
        "linux-x86_64-deb",
        "linux-x86_64-rpm",
      ];
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
      ? ((navigator.userAgentData as { platform?: string }).platform ?? "")
      : "",
    navigator.platform ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    ua.includes("arm") ||
    ua.includes("aarch") ||
    ua.includes("apple silicon")
  ) {
    return "darwin-aarch64";
  }

  const userAgentData = (
    navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues?: (
          hints: string[],
        ) => Promise<{ architecture?: string }>;
      };
    }
  ).userAgentData;

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
