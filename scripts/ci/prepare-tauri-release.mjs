#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactsDir = path.resolve(root, process.env.ARTIFACTS_DIR ?? "artifacts");
const outputRoot = path.resolve(root, process.env.OUTPUT_DIR ?? "publish");
const releaseEnv = process.env.RELEASE_ENV;
const releaseVersion = process.env.RELEASE_VERSION;
const binariesBucket = process.env.DESKTOP_BINARIES_BUCKET;

if (!releaseEnv) {
  throw new Error("RELEASE_ENV is not defined");
}

if (!releaseVersion) {
  throw new Error("RELEASE_VERSION is not defined");
}

if (!binariesBucket) {
  throw new Error("DESKTOP_BINARIES_BUCKET is not defined");
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

await fs.rm(outputRoot, { recursive: true, force: true });
const binariesDir = path.join(outputRoot, "binaries");
const versionDir = path.join(outputRoot, "version");
const latestDir = path.join(outputRoot, "latest");
await fs.mkdir(binariesDir, { recursive: true });
await fs.mkdir(versionDir, { recursive: true });
await fs.mkdir(latestDir, { recursive: true });

const binariesBucketName = binariesBucket.replace(/^gs:\/\//, "");

const finalManifest = {
  version: releaseVersion,
  notes: null,
  pub_date: new Date().toISOString(),
  platforms: {},
};

const assetRecords = [];
const usedAssetNames = new Set();

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
  if (!(await pathExists(updaterDir))) {
    throw new Error(
      `Expected updater directory at ${path.relative(root, updaterDir)}`,
    );
  }

  const manifestFiles = await gatherLatestJsonFiles(updaterDir);
  if (manifestFiles.length === 0) {
    throw new Error(
      `No latest.json files found under ${path.relative(root, updaterDir)}`,
    );
  }

  for (const manifestPath of manifestFiles) {
    const manifest = await readJson(manifestPath);
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
        assetName = `${platformKey}-${assetName}`;
      }
      usedAssetNames.add(assetName);

      const destinationFile = path.join(binariesDir, assetName);
      await fs.copyFile(sourceFile, destinationFile);

      const signatureFile = `${sourceFile}.sig`;
      if (await pathExists(signatureFile)) {
        await fs.copyFile(signatureFile, `${destinationFile}.sig`);
      }

      const signature =
        typeof platformInfo.signature === "string"
          ? platformInfo.signature.trim()
          : (await pathExists(signatureFile))
          ? (await fs.readFile(signatureFile, "utf8")).trim()
          : undefined;

      const finalUrl = new URL(
        path.posix.join("desktop", releaseEnv, releaseVersion, assetName),
        `https://storage.googleapis.com/${binariesBucketName}/`,
      ).toString();

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
      assets: assetRecords,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Prepared release manifest with ${Object.keys(finalManifest.platforms).length} platform entries for ${releaseEnv}/${releaseVersion}.`,
);
for (const record of assetRecords) {
  console.log(
    ` - ${record.platform}: ${record.fileName} (from ${record.source})`,
  );
}
