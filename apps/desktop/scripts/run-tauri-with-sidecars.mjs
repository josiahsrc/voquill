#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const tauriArgs = process.argv.slice(2);
const tauriCommand = tauriArgs[0];
const requestedTarget = readOptionValue(tauriArgs, "--target");

if (tauriCommand === "build" || tauriCommand === "dev") {
  const targets = resolveTargets(requestedTarget);
  const sidecarProfile =
    process.env.VOQUILL_SIDECAR_PROFILE ||
    (tauriCommand === "build" ? "release" : "debug");

  for (const target of targets) {
    const prepareEnv = {
      ...process.env,
      VOQUILL_SIDECAR_PROFILE: sidecarProfile,
    };

    if (target) {
      prepareEnv.CARGO_BUILD_TARGET = target;
    } else {
      delete prepareEnv.CARGO_BUILD_TARGET;
    }

    run("node", ["scripts/prepare-sidecars.mjs"], prepareEnv);
  }

  if (requestedTarget === "universal-apple-darwin") {
    composeUniversalMacSidecars();
  }
}

run("tauri", tauriArgs, process.env);

function resolveTargets(requestedTarget) {
  if (!requestedTarget) {
    return [null];
  }

  if (requestedTarget === "universal-apple-darwin") {
    return ["aarch64-apple-darwin", "x86_64-apple-darwin"];
  }

  return [requestedTarget];
}

function readOptionValue(args, optionName) {
  const exactIndex = args.indexOf(optionName);
  if (exactIndex >= 0) {
    return args[exactIndex + 1] || null;
  }

  const inlinePrefix = `${optionName}=`;
  const inlineArg = args.find((arg) => arg.startsWith(inlinePrefix));
  if (!inlineArg) {
    return null;
  }

  const value = inlineArg.slice(inlinePrefix.length).trim();
  return value.length > 0 ? value : null;
}

function composeUniversalMacSidecars() {
  if (process.platform !== "darwin") {
    fail(
      "universal-apple-darwin sidecar composition requires a macOS runner with lipo",
    );
  }

  const binariesDir = join(process.cwd(), "src-tauri", "binaries");
  const sidecars = [
    "rust-transcription-cpu",
    "rust-transcription-gpu",
    "voquill-ai-sidecar",
  ];

  for (const sidecarName of sidecars) {
    const arm64Path = join(binariesDir, `${sidecarName}-aarch64-apple-darwin`);
    const x64Path = join(binariesDir, `${sidecarName}-x86_64-apple-darwin`);
    const universalPath = join(
      binariesDir,
      `${sidecarName}-universal-apple-darwin`,
    );

    if (!existsSync(arm64Path) || !existsSync(x64Path)) {
      fail(
        `Missing architecture-specific sidecars for universal build: ${arm64Path}, ${x64Path}`,
      );
    }

    run(
      "lipo",
      ["-create", "-output", universalPath, arm64Path, x64Path],
      process.env,
    );
    chmodSync(universalPath, 0o755);

    process.stdout.write(
      `[tauri-sidecar] Prepared ${sidecarName} for universal-apple-darwin: ${universalPath}\n`,
    );
  }
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
    shell: true,
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    process.stderr.write(
      `[tauri-sidecar] Command failed (${result.status ?? "unknown"}): ${rendered}\n`,
    );
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  process.stderr.write(`[tauri-sidecar] ${message}\n`);
  process.exit(1);
}
