#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = process.env.RELEASE_VERSION;
const releaseEnv = process.env.RELEASE_ENV;
const updaterPublicKeyInput = process.env.TAURI_UPDATER_PUBLIC_KEY;
const repository = process.env.GITHUB_REPOSITORY;

if (!version) {
  throw new Error("RELEASE_VERSION is not defined");
}

if (!releaseEnv) {
  throw new Error("RELEASE_ENV is not defined");
}

if (!repository) {
  throw new Error("GITHUB_REPOSITORY is not defined");
}

const [owner, repo] = repository.split("/");
if (!owner || !repo) {
  throw new Error(
    `GITHUB_REPOSITORY must be in 'owner/repo' format (received '${repository}')`
  );
}

const configPath = path.join(
  root,
  "apps",
  "desktop",
  "src-tauri",
  "tauri.conf.json"
);

const raw = fs.readFileSync(configPath, "utf8");
const data = JSON.parse(raw);

data.version = version;
data.plugins ??= {};
data.plugins.updater ??= {};

if (updaterPublicKeyInput) {
  data.plugins.updater.pubkey = updaterPublicKeyInput;
  console.log("Set updater public key from environment variable.");
} else if (data.plugins.updater.pubkey === "__UPDATER_PUBLIC_KEY__") {
  delete data.plugins.updater.pubkey;
  console.log("Removed placeholder updater public key.");
}

fs.writeFileSync(configPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(
  `Updated tauri.conf.json with version ${version} for ${releaseEnv} release.`
);
