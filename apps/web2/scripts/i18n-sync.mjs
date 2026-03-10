#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import manifest from "../src/i18n/manifest.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const localesDir = path.join(projectRoot, "src/i18n/locales");

const defaultLocale = manifest.defaultLocale;
const supportedLocales = manifest.supportedLocales;

const baseLocalePath = path.join(localesDir, `${defaultLocale}.json`);

if (!fs.existsSync(baseLocalePath)) {
  console.error(
    `[i18n] Base locale file ${baseLocalePath} does not exist. Run the extract command first.`,
  );
  process.exit(1);
}

const baseMessages = JSON.parse(fs.readFileSync(baseLocalePath, "utf8"));
const sortedKeys = Object.keys(baseMessages).sort();

const args = process.argv.slice(2);
const localeArg = args.find((arg) => arg.startsWith("--locale="));

let localesToSync = supportedLocales.filter(
  (locale) => locale !== defaultLocale,
);

if (localeArg) {
  localesToSync = localeArg
    .replace("--locale=", "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

if (localesToSync.length === 0) {
  console.log("[i18n] No locales selected for syncing.");
  process.exit(0);
}

const ensureLocale = (locale) => {
  if (!supportedLocales.includes(locale)) {
    throw new Error(
      `[i18n] Locale "${locale}" is not listed in src/i18n/manifest.json.`,
    );
  }
};

const writeLocaleFile = (locale) => {
  ensureLocale(locale);
  const targetFile = path.join(localesDir, `${locale}.json`);
  let existingMessages = {};

  if (fs.existsSync(targetFile)) {
    existingMessages = JSON.parse(fs.readFileSync(targetFile, "utf8"));
  }

  const nextMessages = {};
  let added = 0;
  let retained = 0;

  for (const key of sortedKeys) {
    if (Object.prototype.hasOwnProperty.call(existingMessages, key)) {
      nextMessages[key] = existingMessages[key];
      retained += 1;
    } else {
      nextMessages[key] = baseMessages[key];
      added += 1;
    }
  }

  const removedKeys = Object.keys(existingMessages).filter(
    (key) => !baseMessages[key],
  );

  fs.writeFileSync(targetFile, `${JSON.stringify(nextMessages, null, 2)}\n`);

  const removedLabel =
    removedKeys.length > 0 ? `, removed ${removedKeys.length}` : "";
  console.log(
    `[i18n] Synced ${locale}: ${retained} existing, ${added} added${removedLabel}.`,
  );
};

localesToSync.forEach((locale) => {
  writeLocaleFile(locale);
});
