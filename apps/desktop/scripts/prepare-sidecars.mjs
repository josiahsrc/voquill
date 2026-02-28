#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(scriptDir, "..");
const repoRoot = resolve(desktopDir, "../..");
const sidecarManifestPath = join(
  repoRoot,
  "packages",
  "rust_transcription",
  "Cargo.toml",
);
const rustTargetDir = join(repoRoot, "packages", "rust_transcription", "target");
const tauriBinariesDir = join(desktopDir, "src-tauri", "binaries");

const buildTarget =
  process.env.CARGO_BUILD_TARGET?.trim() ||
  process.env.TAURI_ENV_TARGET_TRIPLE?.trim() ||
  null;
const targetTriple = buildTarget || resolveHostTargetTriple();
const includeGpu = process.env.VOQUILL_INCLUDE_GPU_SIDECAR === "true";
const buildProfile = process.env.VOQUILL_SIDECAR_PROFILE === "release" ? "release" : "debug";
const executableSuffix = isWindowsTarget(targetTriple) ? ".exe" : "";

if (!existsSync(sidecarManifestPath)) {
  fail(`Missing sidecar manifest at ${sidecarManifestPath}`);
}

mkdirSync(tauriBinariesDir, { recursive: true });

buildAndCopy("rust-transcription-cpu", false);
if (includeGpu) {
  buildAndCopy("rust-transcription-gpu", true);
}

function buildAndCopy(binaryName, gpuEnabled) {
  const cargoArgs = [
    "build",
    "--manifest-path",
    sidecarManifestPath,
    "--bin",
    binaryName,
  ];

  if (buildTarget) {
    cargoArgs.push("--target", buildTarget);
  }

  if (buildProfile === "release") {
    cargoArgs.push("--release");
  }

  if (gpuEnabled) {
    cargoArgs.push("--features", "gpu");
  }

  run("cargo", cargoArgs, repoRoot);

  const sourceBinaryPath = join(
    rustTargetDir,
    ...(buildTarget ? [buildTarget] : []),
    buildProfile,
    `${binaryName}${executableSuffix}`,
  );
  const destinationBinaryPath = join(
    tauriBinariesDir,
    `${binaryName}-${targetTriple}${executableSuffix}`,
  );

  if (!existsSync(sourceBinaryPath)) {
    fail(
      `Expected sidecar binary was not produced: ${sourceBinaryPath}`,
    );
  }

  copyFileSync(sourceBinaryPath, destinationBinaryPath);
  if (!isWindowsTarget(targetTriple)) {
    chmodSync(destinationBinaryPath, 0o755);
  }

  console.log(
    `[sidecar] Prepared ${binaryName} for ${targetTriple}: ${destinationBinaryPath}`,
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    fail(`Command failed (${result.status ?? "unknown"}): ${rendered}`);
  }
}

function resolveHostTargetTriple() {
  const result = spawnSync("rustc", ["-vV"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: process.env,
  });

  if (result.status === 0 && result.stdout) {
    const hostLine = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("host:"));
    const hostTriple = hostLine?.slice("host:".length).trim();
    if (hostTriple) {
      return hostTriple;
    }
  }

  const fallback = mapPlatformArchToTarget(process.platform, process.arch);
  if (fallback) {
    return fallback;
  }

  fail(
    `Unable to determine Rust host target triple for platform=${process.platform} arch=${process.arch}`,
  );
}

function mapPlatformArchToTarget(platform, arch) {
  if (platform === "darwin" && arch === "arm64") {
    return "aarch64-apple-darwin";
  }
  if (platform === "darwin" && arch === "x64") {
    return "x86_64-apple-darwin";
  }
  if (platform === "linux" && arch === "x64") {
    return "x86_64-unknown-linux-gnu";
  }
  if (platform === "linux" && arch === "arm64") {
    return "aarch64-unknown-linux-gnu";
  }
  if (platform === "win32" && arch === "x64") {
    return "x86_64-pc-windows-msvc";
  }
  if (platform === "win32" && arch === "arm64") {
    return "aarch64-pc-windows-msvc";
  }
  return null;
}

function isWindowsTarget(target) {
  return target.includes("windows");
}

function fail(message) {
  console.error(`[sidecar] ${message}`);
  process.exit(1);
}
