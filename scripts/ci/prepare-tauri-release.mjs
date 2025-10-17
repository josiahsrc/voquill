#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactsDir = path.resolve(root, process.env.ARTIFACTS_DIR ?? "artifacts");
const outputRoot = path.resolve(root, process.env.OUTPUT_DIR ?? "publish");
const releaseEnv = process.env.RELEASE_ENV;
const releaseVersion = process.env.RELEASE_VERSION;
const repository = process.env.GITHUB_REPOSITORY;
const releaseTagName = process.env.RELEASE_TAG_NAME;
const channelReleaseTagInput = process.env.CHANNEL_RELEASE_TAG;

if (!releaseEnv) {
  throw new Error("RELEASE_ENV is not defined");
}

if (!releaseVersion) {
  throw new Error("RELEASE_VERSION is not defined");
}

if (!repository) {
  throw new Error("GITHUB_REPOSITORY is not defined");
}

if (!releaseTagName) {
  throw new Error("RELEASE_TAG_NAME is not defined");
}

const [owner, repo] = repository.split("/");
if (!owner || !repo) {
  throw new Error(
    `GITHUB_REPOSITORY must be in 'owner/repo' format (received '${repository}')`,
  );
}

const channelReleaseTag =
  channelReleaseTagInput ??
  (releaseEnv === "prod" ? "desktop-prod" : "desktop-dev");

function githubDownloadUrl(tag, fileName) {
  const encodedName = fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/${encodedName}`;
}

async function pathExists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function gatherLatestJsonFiles(startDir) {
  const results = [];
  const queue = [startDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase() === "latest.json"
      ) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

function inferPlatformFromLabel(label) {
  const lower = label.toLowerCase();
  if (lower.includes("mac")) return "darwin";
  if (lower.includes("win")) return "windows";
  if (lower.includes("linux")) return "linux";
  return null;
}

async function inferPlatformFromBundleDir(bundleDir) {
  try {
    const entries = await fs.readdir(bundleDir, { withFileTypes: true });
    const names = entries.map((entry) => entry.name.toLowerCase());
    if (names.some((name) => ["macos", "dmg"].includes(name))) {
      return "darwin";
    }
    if (names.some((name) => ["nsis", "msi", "windows"].includes(name))) {
      return "windows";
    }
    if (names.some((name) => ["appimage", "deb", "rpm", "linux"].includes(name))) {
      return "linux";
    }
  } catch {
    // ignore discovery errors; caller will handle missing platform.
  }

  return null;
}

function inferArchFromName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes("aarch64") || lower.includes("arm64")) return "aarch64";
  if (lower.includes("universal")) return "universal";
  if (lower.includes("x86_64") || lower.includes("amd64") || lower.includes("x64")) {
    return "x86_64";
  }
  if (lower.includes("armv7")) return "armv7";
  if (lower.includes("i686") || lower.includes("x86")) return "i686";
  return null;
}

function platformKeysForAsset(platformType, archHint) {
  switch (platformType) {
    case "darwin": {
      if (archHint === "aarch64") return ["darwin-aarch64"];
      if (archHint === "x86_64") return ["darwin-x86_64"];
      // Treat universal or unknown as a universal bundle for both desktop architectures.
      return ["darwin-aarch64", "darwin-x86_64"];
    }
    case "linux": {
      const arch = archHint && archHint !== "universal" ? archHint : "x86_64";
      return [`linux-${arch}`];
    }
    case "windows": {
      const arch = archHint && archHint !== "universal" ? archHint : "x86_64";
      return [`windows-${arch}`];
    }
    default:
      return [];
  }
}

function assetWeight(platformType, filePath) {
  const lower = filePath.toLowerCase();
  let weight = 0;

  switch (platformType) {
    case "windows": {
      if (lower.includes("nsis")) weight = 3;
      else if (lower.includes("msi")) weight = 2;
      if (lower.endsWith(".zip")) weight += 2;
      else if (lower.endsWith(".exe")) weight += 1;
      else if (lower.endsWith(".msi")) weight += 1;
      break;
    }
    case "linux": {
      if (lower.includes("appimage")) weight = 2;
      if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) weight += 1;
      else if (lower.endsWith(".appimage")) weight += 1;
      break;
    }
    case "darwin": {
      if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) weight = 3;
      break;
    }
    default:
      break;
  }

  return weight;
}

const ARCHIVE_EXTENSIONS = [
  ".tar.gz",
  ".tgz",
  ".zip",
  ".exe",
  ".msi",
  ".appimage",
];

function hasValidExtension(fileName) {
  const lower = fileName.toLowerCase();
  return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function collectUpdaterArchives(startDir) {
  const results = [];
  const queue = [startDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const lower = entry.name.toLowerCase();
      if (lower.endsWith(".sig")) continue;
      if (!hasValidExtension(entry.name)) continue;

      // Skip obvious tooling/support assets that are unrelated to updater bundles.
      if (entryPath.includes(`${path.sep}share${path.sep}`)) continue;

      results.push(entryPath);
    }
  }

  return results;
}

async function synthesizeManifestFromBundle(artifactLabel, bundleDir) {
  const platformType =
    inferPlatformFromLabel(artifactLabel) ??
    (await inferPlatformFromBundleDir(bundleDir));

  if (!platformType) {
    console.warn(
      `Unable to determine platform for artifact '${artifactLabel}' (bundle ${path.relative(
        root,
        bundleDir,
      )}).`,
    );
    return null;
  }

  const archives = await collectUpdaterArchives(bundleDir);
  if (archives.length === 0) {
    return null;
  }

  const platformEntries = new Map();

  for (const archivePath of archives) {
    const relativePath = path
      .relative(bundleDir, archivePath)
      .split(path.sep)
      .join(path.posix.sep);

    const archHint = inferArchFromName(path.basename(archivePath));
    const platformKeys = platformKeysForAsset(platformType, archHint);
    if (platformKeys.length === 0) continue;

    const signaturePath = `${archivePath}.sig`;
    const signature = (await pathExists(signaturePath))
      ? (await fs.readFile(signaturePath, "utf8")).trim()
      : undefined;

    const descriptor = {
      relativePath,
      absolutePath: archivePath,
      signature,
      weight: assetWeight(platformType, archivePath),
    };

    for (const platformKey of platformKeys) {
      const existing = platformEntries.get(platformKey);
      if (!existing || descriptor.weight > existing.weight) {
        platformEntries.set(platformKey, descriptor);
      }
    }
  }

  if (platformEntries.size === 0) {
    return null;
  }

  const platforms = {};
  for (const [platformKey, descriptor] of platformEntries.entries()) {
    platforms[platformKey] = {
      url: descriptor.relativePath,
      ...(descriptor.signature ? { signature: descriptor.signature } : {}),
    };
  }

  console.warn(
    `Synthesized updater manifest for '${artifactLabel}' from bundle ${path.relative(
      root,
      bundleDir,
    )}.`,
  );

  return {
    version: releaseVersion,
    notes: null,
    pub_date: new Date().toISOString(),
    platforms,
  };
}

await fs.rm(outputRoot, { recursive: true, force: true });
const binariesDir = path.join(outputRoot, "binaries");
const versionDir = path.join(outputRoot, "version");
const latestDir = path.join(outputRoot, "latest");
await fs.mkdir(binariesDir, { recursive: true });
await fs.mkdir(versionDir, { recursive: true });
await fs.mkdir(latestDir, { recursive: true });

const finalManifest = {
  version: releaseVersion,
  notes: null,
  pub_date: new Date().toISOString(),
  platforms: {},
};

const assetRecords = [];
const usedAssetNames = new Set();
const assetNameBySource = new Map();

const artifactEntries = await fs.readdir(artifactsDir, { withFileTypes: true });

if (artifactEntries.length === 0) {
  throw new Error(`No artifacts found in ${artifactsDir}`);
}

for (const entry of artifactEntries) {
  if (!entry.isDirectory()) continue;

  const artifactPath = path.join(artifactsDir, entry.name);
  const metadataPath = path.join(artifactPath, "metadata.json");
  const metadata = (await pathExists(metadataPath))
    ? await readJson(metadataPath)
    : {};

  const artifactLabel = metadata.artifactLabel ?? entry.name;
  const bundleDir = path.join(artifactPath, "bundle");

  if (!(await pathExists(bundleDir))) {
    throw new Error(
      `Expected bundle directory at ${path.relative(root, bundleDir)}`,
    );
  }

  const updaterDir = path.join(bundleDir, "updater");
  const updaterDirExists = await pathExists(updaterDir);
  if (!updaterDirExists) {
    console.warn(
      `No dedicated updater directory at ${path.relative(
        root,
        updaterDir,
      )}; scanning entire bundle instead.`,
    );
  }

  const manifestSearchRoot = updaterDirExists ? updaterDir : bundleDir;
  const manifestFiles = await gatherLatestJsonFiles(manifestSearchRoot);
  const manifestSources = [];

  if (manifestFiles.length === 0) {
    const synthesized = await synthesizeManifestFromBundle(
      artifactLabel,
      bundleDir,
    );
    if (!synthesized) {
      const missingRoot = updaterDirExists ? updaterDir : bundleDir;
      throw new Error(
        `No updater manifest data found under ${path.relative(
          root,
          missingRoot,
        )}`,
      );
    }

    manifestSources.push({
      manifestPath: path.join(bundleDir, "__generated_latest.json"),
      manifest: synthesized,
      sourceDir: bundleDir,
    });
  } else {
    for (const manifestPath of manifestFiles) {
      const manifest = await readJson(manifestPath);
      manifestSources.push({
        manifestPath,
        manifest,
        sourceDir: path.dirname(manifestPath),
      });
    }
  }

  for (const { manifestPath, manifest, sourceDir } of manifestSources) {
    if (manifest.version && manifest.version !== releaseVersion) {
      console.warn(
        `Manifest version ${manifest.version} from ${path.relative(
          root,
          manifestPath,
        )} differs from expected ${releaseVersion}`,
      );
    }

    const platforms = manifest.platforms ?? {};
    for (const [platformKey, platformInfo] of Object.entries(platforms)) {
      if (finalManifest.platforms[platformKey]) {
        throw new Error(
          `Duplicate platform entry '${platformKey}' encountered when processing ${path.relative(
            root,
            manifestPath,
          )}`,
        );
      }

      if (!platformInfo || typeof platformInfo.url !== "string") {
        throw new Error(
          `Missing URL for platform '${platformKey}' in ${path.relative(
            root,
            manifestPath,
          )}`,
        );
      }

      const sourceDir = path.dirname(manifestPath);
      const originalUrl = platformInfo.url;
      const sourceFile = path.resolve(sourceDir, originalUrl);

      if (!(await pathExists(sourceFile))) {
        throw new Error(
          `Expected update asset for '${platformKey}' at ${sourceFile}`,
        );
      }

      let assetName = path.basename(sourceFile);
      if (usedAssetNames.has(assetName)) {
        const cached = assetNameBySource.get(sourceFile);
        if (cached) {
          assetName = cached.assetName;
        } else {
          const parsed = path.parse(assetName);
          let counter = 1;
          let candidate = assetName;
          while (usedAssetNames.has(candidate)) {
            const suffix = `${parsed.name}-${counter}`;
            candidate = parsed.ext
              ? `${suffix}${parsed.ext}`
              : `${assetName}-${counter}`;
            counter += 1;
          }
          assetName = candidate;
        }
      }
      usedAssetNames.add(assetName);

      const existing = assetNameBySource.get(sourceFile);
      let destinationFile;
      if (existing) {
        destinationFile = existing.destinationFile;
      } else {
        destinationFile = path.join(binariesDir, assetName);
        await fs.copyFile(sourceFile, destinationFile);

        const signatureSourceFile = `${sourceFile}.sig`;
        if (await pathExists(signatureSourceFile)) {
          await fs.copyFile(signatureSourceFile, `${destinationFile}.sig`);
        }

        assetNameBySource.set(sourceFile, {
          assetName,
          destinationFile,
        });
      }

      const signatureFile = `${sourceFile}.sig`;
      const signature =
        typeof platformInfo.signature === "string"
          ? platformInfo.signature.trim()
          : (await pathExists(signatureFile))
          ? (await fs.readFile(signatureFile, "utf8")).trim()
          : undefined;

      const finalUrl = githubDownloadUrl(releaseTagName, assetName);

      finalManifest.platforms[platformKey] = {
        ...platformInfo,
        url: finalUrl,
        ...(signature ? { signature } : {}),
      };

      assetRecords.push({
        platform: platformKey,
        fileName: assetName,
        source: path.relative(root, sourceFile),
      });
    }
  }

  const installersRoot = path.join(
    binariesDir,
    "installers",
    artifactLabel.replace(/\s+/g, "-").toLowerCase(),
  );
  await fs.mkdir(installersRoot, { recursive: true });

  const bundleContents = await fs.readdir(bundleDir, { withFileTypes: true });
  for (const bundleEntry of bundleContents) {
    if (bundleEntry.name === "updater") continue;
    const source = path.join(bundleDir, bundleEntry.name);
    const destination = path.join(installersRoot, bundleEntry.name);
    await fs.cp(source, destination, { recursive: true });
  }
}

if (Object.keys(finalManifest.platforms).length === 0) {
  throw new Error("No platform entries collected for latest.json");
}

const manifestJson = `${JSON.stringify(finalManifest, null, 2)}\n`;
await fs.writeFile(path.join(versionDir, "latest.json"), manifestJson, "utf8");
await fs.writeFile(path.join(latestDir, "latest.json"), manifestJson, "utf8");

await fs.writeFile(
  path.join(versionDir, "summary.json"),
  `${JSON.stringify(
    {
      releaseEnv,
      releaseVersion,
      releaseTagName,
      channelReleaseTag,
      assets: assetRecords,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Prepared release manifest with ${Object.keys(finalManifest.platforms).length} platform entries for ${releaseEnv}/${releaseVersion} (tag ${releaseTagName}, channel ${channelReleaseTag}).`,
);
for (const record of assetRecords) {
  console.log(
    ` - ${record.platform}: ${record.fileName} (from ${record.source})`,
  );
}
