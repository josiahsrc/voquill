#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const rawArgs = process.argv.slice(2);
const viteSubcommands = new Set(["build", "preview"]);

const explicitCommand = rawArgs[0];
const hasExplicitCommand = explicitCommand && viteSubcommands.has(explicitCommand);
const modeHint = hasExplicitCommand ? explicitCommand : "dev";
const subcommandArgs = hasExplicitCommand ? rawArgs.slice(1) : rawArgs;

const finalArgs = []
  .concat(hasExplicitCommand ? explicitCommand : [])
  .concat(subcommandArgs);

const defaultMode =
  modeHint === "build" || modeHint === "preview" ? "prod" : "emulators";
const flavorFromEnv =
  (process.env.VITE_FLAVOR ?? process.env.FLAVOR)?.trim() ?? undefined;
const desiredMode = flavorFromEnv || defaultMode;

const hasModeFlag = finalArgs.some(
  (arg) => arg === "--mode" || arg.startsWith("--mode=")
);
if (!hasModeFlag) {
  finalArgs.push("--mode", desiredMode);
}

const envFlavor = flavorFromEnv ?? desiredMode;
const childEnv = {
  ...process.env,
  VITE_FLAVOR: envFlavor,
  FLAVOR: process.env.FLAVOR ?? envFlavor,
};

const require = createRequire(import.meta.url);
const vitePkgPath = require.resolve("vite/package.json");
const vitePkg = require("vite/package.json");
const viteBinRelative = vitePkg.bin?.vite ?? "bin/vite.js";
const viteBin = join(dirname(vitePkgPath), viteBinRelative);
const child = spawn(process.execPath, [viteBin, ...finalArgs], {
  env: childEnv,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Unable to start Vite:", error);
  process.exit(1);
});
