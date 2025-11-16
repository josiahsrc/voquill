#!/usr/bin/env node

import { spawn } from "node:child_process";

const rawArgs = process.argv.slice(2);
const viteSubcommands = new Set(["build", "preview"]);

const explicitCommand = rawArgs[0];
const hasExplicitCommand = explicitCommand && viteSubcommands.has(explicitCommand);
const modeHint = hasExplicitCommand ? explicitCommand : "dev";
const subcommandArgs = hasExplicitCommand ? rawArgs.slice(1) : rawArgs;

const finalArgs = []
  .concat(hasExplicitCommand ? explicitCommand : [])
  .concat(subcommandArgs);

const defaultMode = modeHint === "build" || modeHint === "preview" ? "prod" : "dev";
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

const viteCmd = "vite";

const child = spawn(viteCmd, finalArgs, {
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
