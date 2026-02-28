const RELEASE_TAG_REGEX = /\/releases\/download\/([^/]+)\//;
const GITHUB_RELEASE_DOWNLOAD_BASE =
  "https://github.com/josiahsrc/voquill/releases/download";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractReleaseTagFromRawJson = (
  rawJson: Record<string, unknown>,
): string | null => {
  const platforms = rawJson.platforms;
  if (!isRecord(platforms)) {
    return null;
  }

  for (const platform of Object.values(platforms)) {
    if (!isRecord(platform)) {
      continue;
    }
    const url = platform.url;
    if (typeof url !== "string") {
      continue;
    }

    const match = RELEASE_TAG_REGEX.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

export const isReadOnlyFilesystemInstallError = (
  message: string | null | undefined,
): boolean => {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("read-only file system") ||
    normalized.includes("os error 30")
  );
};

export const buildManualMacInstallerUrl = (
  version: string,
  rawJson: Record<string, unknown>,
): string | null => {
  const releaseTag = extractReleaseTagFromRawJson(rawJson);
  if (!releaseTag) {
    return null;
  }

  const fileName = `Voquill_${version}_universal.pkg`;
  return `${GITHUB_RELEASE_DOWNLOAD_BASE}/${encodeURIComponent(releaseTag)}/${encodeURIComponent(fileName)}`;
};
