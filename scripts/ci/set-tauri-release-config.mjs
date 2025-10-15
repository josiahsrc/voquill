#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = process.env.RELEASE_VERSION;
const releaseEnv = process.env.RELEASE_ENV;
const bucket = process.env.DESKTOP_VERSION_BUCKET;
const updaterPublicKeyInput = process.env.TAURI_UPDATER_PUBLIC_KEY;

if (!version) {
  throw new Error("RELEASE_VERSION is not defined");
}

if (!releaseEnv) {
  throw new Error("RELEASE_ENV is not defined");
}

if (!bucket) {
  throw new Error("DESKTOP_VERSION_BUCKET is not defined");
}

const endpoint = new URL(
  path.posix.join("desktop", releaseEnv, "latest.json"),
  `https://storage.googleapis.com/${bucket.replace(/^gs:\/\//, "")}/`,
).toString();

const configPath = path.join(
  root,
  "apps",
  "desktop",
  "src-tauri",
  "tauri.conf.json",
);

const raw = fs.readFileSync(configPath, "utf8");
const data = JSON.parse(raw);

data.version = version;
data.plugins ??= {};
data.plugins.updater ??= {};
data.plugins.updater.endpoints = [endpoint];

function resolveUpdaterPublicKey(rawValue) {
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return undefined;
  }

  let resolved = trimmed;

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("minisign public key")) {
      const lines = decoded
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const candidate = lines[index];
        if (/^[A-Za-z0-9+/=]+$/.test(candidate)) {
          resolved = candidate;
          break;
        }
      }
    }
  } catch {
    // Ignore decoding errors; fall back to the raw trimmed value.
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(resolved)) {
    throw new Error(
      "TAURI_UPDATER_PUBLIC_KEY must be the minisign public key string (base64, characters A-Z, a-z, 0-9, +, /, =).",
    );
  }

  return resolved;
}

const resolvedUpdaterPublicKey = resolveUpdaterPublicKey(updaterPublicKeyInput);

if (resolvedUpdaterPublicKey) {
  data.plugins.updater.pubkey = resolvedUpdaterPublicKey;
} else if (data.plugins.updater.pubkey === "__UPDATER_PUBLIC_KEY__") {
  delete data.plugins.updater.pubkey;
}

fs.writeFileSync(configPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(
  `Updated tauri.conf.json with version ${version} for ${releaseEnv} (endpoint ${endpoint}).`,
);
