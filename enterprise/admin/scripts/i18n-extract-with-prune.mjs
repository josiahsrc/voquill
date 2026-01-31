import { execSync } from "child_process";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, "..");
const localesDir = path.join(adminRoot, "src", "i18n", "locales");
const englishLocalePath = path.join(localesDir, "en.json");

const formatjsCommand =
  'npx --no-install formatjs extract "src/**/*.{ts,tsx}" --ignore "src/**/*.d.ts" --out-file src/i18n/locales/en.json --format ./scripts/formatjs-formatter.mjs --id-interpolation-pattern "[sha1:contenthash:base64:6]"';

async function readJson(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function computeChangedKeys(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => {
    const beforeValue = before[key];
    const afterValue = after[key];
    const beforeSerialized = beforeValue === undefined ? undefined : JSON.stringify(beforeValue);
    const afterSerialized = afterValue === undefined ? undefined : JSON.stringify(afterValue);
    return beforeSerialized !== afterSerialized;
  });
}

async function pruneLocaleFile(localePath, keys) {
  const localeData = await readJson(localePath);
  let updated = false;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(localeData, key)) {
      delete localeData[key];
      updated = true;
    }
  }
  if (updated) {
    await writeJson(localePath, localeData);
  }
  return updated;
}

async function main() {
  const beforeSnapshot = await readJson(englishLocalePath);
  execSync(formatjsCommand, {
    cwd: adminRoot,
    stdio: "inherit",
  });
  const afterSnapshot = await readJson(englishLocalePath);
  const changedKeys = computeChangedKeys(beforeSnapshot, afterSnapshot);
  if (changedKeys.length === 0) {
    console.log("No changes detected in en.json; skipping locale pruning.");
    return;
  }
  console.log(`Detected ${changedKeys.length} changed en.json entr${changedKeys.length === 1 ? "y" : "ies"}. Removing them from other locales.`);

  const localeFiles = (await readdir(localesDir)).filter(
    (fileName) => fileName.endsWith(".json") && fileName !== "en.json",
  );
  const prunedLocales = [];
  for (const fileName of localeFiles) {
    const localePath = path.join(localesDir, fileName);
    if (await pruneLocaleFile(localePath, changedKeys)) {
      prunedLocales.push(fileName);
    }
  }

  if (prunedLocales.length > 0) {
    console.log(`Pruned ${changedKeys.length} key(s) from ${prunedLocales.join(", ")}.`);
  } else {
    console.log("Other locale files already matched the English locale after extraction.");
  }
}

main().catch((error) => {
  console.error("Failed to run i18n extraction with pruning:", error);
  process.exitCode = 1;
});
