import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

export function loadPackageEnv() {
  if (loaded) {
    return;
  }

  loaded = true;

  const envPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    ".env",
  );

  try {
    const envFile = readFileSync(envPath, "utf-8");

    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Local development can run entirely from process env.
  }
}
