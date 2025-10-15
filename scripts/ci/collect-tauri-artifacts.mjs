#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetRoot = path.join(root, "apps", "desktop", "src-tauri", "target");
const outputDir = path.resolve(
  root,
  process.env.ARTIFACT_OUTPUT_DIR ?? "release-artifacts",
);
const artifactLabel = process.env.TAURI_ARTIFACT_LABEL ?? "desktop";

async function pathExists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function findBundleDirectories() {
  const bundleDirs = [];

  const directBundle = path.join(targetRoot, "release", "bundle");
  if (await pathExists(directBundle)) {
    bundleDirs.push(directBundle);
  }

  let targetEntries = [];
  try {
    targetEntries = await fs.readdir(targetRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Unable to read target directory at ${targetRoot}: ${(error instanceof Error && error.message) || error}`,
    );
  }

  for (const entry of targetEntries) {
    if (!entry.isDirectory()) continue;
    const bundleDir = path.join(targetRoot, entry.name, "release", "bundle");
    if (await pathExists(bundleDir)) {
      bundleDirs.push(bundleDir);
    }
  }

  return [...new Set(bundleDirs.map((dir) => path.normalize(dir)))];
}

const bundleDirs = await findBundleDirectories();

if (bundleDirs.length === 0) {
  throw new Error(
    `No Tauri bundle directory found under ${path.relative(root, targetRoot)}`,
  );
}

const chosenBundleDir = bundleDirs
  .map((dir) => ({
    dir,
    depth: dir.split(path.sep).length,
  }))
  .sort((a, b) => a.depth - b.depth)
  .pop()?.dir;

if (!chosenBundleDir) {
  throw new Error("Unable to choose a bundle directory to collect artifacts");
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const destinationBundleDir = path.join(outputDir, "bundle");
await fs.cp(chosenBundleDir, destinationBundleDir, { recursive: true });

const metadata = {
  artifactLabel,
  bundleSource: path.relative(root, chosenBundleDir),
  releaseEnv: process.env.RELEASE_ENV ?? null,
  releaseVersion: process.env.RELEASE_VERSION ?? null,
  generatedAt: new Date().toISOString(),
};

await fs.writeFile(
  path.join(outputDir, "metadata.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
  "utf8",
);

console.log(
  `Collected bundle from ${path.relative(
    root,
    chosenBundleDir,
  )} into ${path.relative(root, destinationBundleDir)}.`,
);
