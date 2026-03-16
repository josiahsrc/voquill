#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(scriptDir, "..");
const repoRoot = resolve(desktopDir, "../..");
const aiSidecarPackageDir = join(repoRoot, "packages", "ai");
const aiSidecarEntrypoint = join(
  aiSidecarPackageDir,
  "src",
  "server.ts",
);
const aiSidecarBinaryName = "voquill-ai-sidecar";
const sidecarManifestPath = join(
  repoRoot,
  "packages",
  "rust_transcription",
  "Cargo.toml",
);
const cargoTargetDirOverride = process.env.CARGO_TARGET_DIR?.trim() || null;
const rustTargetDir = cargoTargetDirOverride
  ? isAbsolute(cargoTargetDirOverride)
    ? cargoTargetDirOverride
    : resolve(repoRoot, cargoTargetDirOverride)
  : join(repoRoot, "packages", "rust_transcription", "target");
const tauriBinariesDir = join(desktopDir, "src-tauri", "binaries");

const buildTarget =
  process.env.CARGO_BUILD_TARGET?.trim() ||
  process.env.TAURI_ENV_TARGET_TRIPLE?.trim() ||
  null;
const targetTriple = buildTarget || resolveHostTargetTriple();
const buildProfile =
  process.env.VOQUILL_SIDECAR_PROFILE === "release" ? "release" : "debug";
const requireNativeGpuSidecar =
  process.env.VOQUILL_REQUIRE_GPU_SIDECAR === "true";
const executableSuffix = isWindowsTarget(targetTriple) ? ".exe" : "";

if (!existsSync(sidecarManifestPath)) {
  fail(`Missing sidecar manifest at ${sidecarManifestPath}`);
}
if (!existsSync(aiSidecarEntrypoint)) {
  fail(`Missing AI sidecar entrypoint at ${aiSidecarEntrypoint}`);
}

mkdirSync(tauriBinariesDir, { recursive: true });

const cpuSidecarPath = buildAndCopy("rust-transcription-cpu", false);
const gpuBuildState = resolveGpuBuildState(targetTriple);

if (gpuBuildState.canBuildNative) {
  const gpuSidecarPath = buildAndCopy("rust-transcription-gpu", true, {
    allowFailure: !requireNativeGpuSidecar,
  });

  if (!gpuSidecarPath) {
    mirrorCpuSidecarAsGpu(cpuSidecarPath);
  }
} else {
  if (requireNativeGpuSidecar) {
    fail(
      `Native GPU sidecar is required for ${targetTriple}, but unavailable: ${gpuBuildState.reason}`,
    );
  }

  console.warn(
    `[sidecar] Skipping native GPU sidecar build for ${targetTriple}: ${gpuBuildState.reason}`,
  );
  mirrorCpuSidecarAsGpu(cpuSidecarPath);
}

buildAiSidecar();

function buildAndCopy(binaryName, gpuEnabled, options = {}) {
  const allowFailure = options.allowFailure === true;
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
    cargoArgs.push(
      "--features",
      resolveGpuCargoFeatures(targetTriple).join(","),
    );
  }

  const buildOk = run("cargo", cargoArgs, repoRoot, { allowFailure });
  if (!buildOk) {
    return null;
  }

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
    fail(`Expected sidecar binary was not produced: ${sourceBinaryPath}`);
  }

  copyFileSync(sourceBinaryPath, destinationBinaryPath);
  if (!isWindowsTarget(targetTriple)) {
    chmodSync(destinationBinaryPath, 0o755);
  }

  console.log(
    `[sidecar] Prepared ${binaryName} for ${targetTriple}: ${destinationBinaryPath}`,
  );

  return destinationBinaryPath;
}

function mirrorCpuSidecarAsGpu(cpuSidecarPath) {
  const gpuDestinationPath = join(
    tauriBinariesDir,
    `rust-transcription-gpu-${targetTriple}${executableSuffix}`,
  );
  copyFileSync(cpuSidecarPath, gpuDestinationPath);
  if (!isWindowsTarget(targetTriple)) {
    chmodSync(gpuDestinationPath, 0o755);
  }

  console.warn(
    `[sidecar] Using CPU sidecar binary for rust-transcription-gpu on ${targetTriple}: ${gpuDestinationPath}`,
  );
}

function buildAiSidecar() {
  const destinationBinaryPath = join(
    tauriBinariesDir,
    `${aiSidecarBinaryName}-${targetTriple}${executableSuffix}`,
  );

  run(
    "bun",
    [
      "build",
      "--compile",
      `--target=${resolveBunCompileTarget(targetTriple)}`,
      aiSidecarEntrypoint,
      "--outfile",
      destinationBinaryPath,
    ],
    aiSidecarPackageDir,
  );

  if (!existsSync(destinationBinaryPath)) {
    fail(
      `Expected AI sidecar binary was not produced: ${destinationBinaryPath}`,
    );
  }

  if (!isWindowsTarget(targetTriple)) {
    chmodSync(destinationBinaryPath, 0o755);
  }

  console.log(
    `[sidecar] Prepared ${aiSidecarBinaryName} for ${targetTriple}: ${destinationBinaryPath}`,
  );
}

function run(command, args, cwd, options = {}) {
  const allowFailure = options.allowFailure === true;
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    if (allowFailure) {
      console.warn(
        `[sidecar] Command failed (${result.status ?? "unknown"}): ${rendered}`,
      );
      return false;
    }
    fail(`Command failed (${result.status ?? "unknown"}): ${rendered}`);
  }

  return true;
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

function isAppleTarget(target) {
  return target.includes("apple-darwin");
}

function resolveBunCompileTarget(target) {
  if (target === "aarch64-apple-darwin") {
    return "bun-darwin-arm64";
  }
  if (target === "x86_64-apple-darwin") {
    return "bun-darwin-x64";
  }
  if (target === "x86_64-unknown-linux-gnu") {
    return "bun-linux-x64";
  }
  if (target === "aarch64-unknown-linux-gnu") {
    return "bun-linux-arm64";
  }
  if (target === "x86_64-pc-windows-msvc") {
    return "bun-windows-x64";
  }
  if (target === "aarch64-pc-windows-msvc") {
    return "bun-windows-arm64";
  }

  fail(`No Bun compile target mapping exists for ${target}`);
}

function supportsNativeGpuSidecar(target) {
  return (
    isAppleTarget(target) ||
    target.includes("windows") ||
    target.includes("linux")
  );
}

function resolveGpuCargoFeatures(target) {
  if (isAppleTarget(target)) {
    return ["gpu", "gpu-metal"];
  }

  if (target.includes("windows") || target.includes("linux")) {
    return ["gpu", "gpu-vulkan"];
  }

  fail(`No GPU cargo feature mapping exists for ${target}`);
}

function resolveGpuBuildState(target) {
  if (!supportsNativeGpuSidecar(target)) {
    return {
      canBuildNative: false,
      reason: "native GPU sidecar builds are unsupported on this platform",
    };
  }

  if (isWindowsTarget(target)) {
    const vulkanSdkDir = process.env.VULKAN_SDK?.trim();
    if (!vulkanSdkDir || !existsSync(vulkanSdkDir)) {
      return {
        canBuildNative: false,
        reason: "VULKAN_SDK is not set to an existing directory",
      };
    }
  }

  if (target.includes("linux")) {
    const pkgCheck = spawnSync("pkg-config", ["--exists", "vulkan"], {
      stdio: "ignore",
    });
    if (pkgCheck.status !== 0) {
      return {
        canBuildNative: false,
        reason:
          "Vulkan development libraries not found (pkg-config --exists vulkan failed)",
      };
    }
  }

  return {
    canBuildNative: true,
    reason: null,
  };
}

function fail(message) {
  console.error(`[sidecar] ${message}`);
  process.exit(1);
}
