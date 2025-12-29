import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCOPES = [
  "functions",
  "@repo/functions",
  "@repo/firemix",
  "@repo/pricing",
  "@repo/types",
  "@repo/utilities",
  "@repo/voice-ai",
  "@repo/eslint-config",
  "@repo/typescript-config",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const firebaseRoot = path.resolve(repoRoot, "apps/firebase");
const outputRoot = path.resolve(firebaseRoot, ".firebase");
const pruneOutputDir = path.join(outputRoot, "functions-pruned");
const functionsDir = path.join(pruneOutputDir, "apps/firebase/functions");
const packagesDir = path.join(pruneOutputDir, "packages");
const localPackagesDir = path.join(functionsDir, ".repo-packages");
const MAX_BUFFER_SIZE = 1024 * 1024 * 200;

function runCommand(command, args, { cwd = repoRoot, errorMessage } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_SIZE,
    stdio: ["inherit", "pipe", "pipe"],
  });

  if (result.stdout) {
    process.stderr.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(errorMessage ?? `${command} ${args.join(" ")} failed`);
  }
}

function runTurboPrune() {
  mkdirSync(outputRoot, { recursive: true });
  rmSync(pruneOutputDir, { recursive: true, force: true });
  mkdirSync(pruneOutputDir, { recursive: true });
  const pruneArgs = [
    "turbo",
    "prune",
    "--out-dir",
    pruneOutputDir,
    ...SCOPES.flatMap((scope) => ["--scope", scope]),
  ];

  runCommand("npx", pruneArgs, { errorMessage: "turbo prune failed" });
}

function copyFirebaseConfig() {
  const destinationRoot = path.join(pruneOutputDir, "apps/firebase");
  mkdirSync(destinationRoot, { recursive: true });

  const filesToCopy = [
    "firebase.json",
    ".firebaserc",
    "firestore.rules",
    "firestore.indexes.json",
    "storage.rules",
    "database.rules.json",
  ];
  for (const file of filesToCopy) {
    const sourcePath = path.join(firebaseRoot, file);
    if (existsSync(sourcePath)) {
      cpSync(sourcePath, path.join(destinationRoot, file));
    }
  }
}

function copyEnvFiles() {
  const sourceDir = path.join(firebaseRoot, "functions");
  const destDir = path.join(pruneOutputDir, "apps/firebase/functions");
  mkdirSync(destDir, { recursive: true });

  // Copy .env files that Firebase Functions v2 expects
  const envFiles = [
    ".env",
    ".env.voquill-prod",
    ".env.voquill-dev",
  ];
  for (const file of envFiles) {
    const sourcePath = path.join(sourceDir, file);
    if (existsSync(sourcePath)) {
      cpSync(sourcePath, path.join(destDir, file));
    }
  }
}

function stageLocalPackages() {
  if (!existsSync(packagesDir)) {
    return;
  }

  mkdirSync(localPackagesDir, { recursive: true });

  for (const scope of SCOPES) {
    if (!scope.startsWith("@repo/")) {
      continue;
    }

    const packageName = scope.replace("@repo/", "");
    const sourcePath = path.join(packagesDir, packageName);

    if (existsSync(sourcePath)) {
      cpSync(sourcePath, path.join(localPackagesDir, packageName), {
        recursive: true,
      });
    }
  }
}

function rewritePackageJson() {
  const packageJsonPath = path.join(functionsDir, "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  const rewriteSection = (section) => {
    if (!pkg[section]) {
      return;
    }

    for (const depName of Object.keys(pkg[section])) {
      if (depName.startsWith("@repo/")) {
        const localName = depName.replace("@repo/", "");
        pkg[section][depName] = `file:./.repo-packages/${localName}`;
      }
    }
  };

  rewriteSection("dependencies");
  rewriteSection("devDependencies");

  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function updatePackageLock() {
  runCommand("npm", ["install", "--package-lock-only"], {
    cwd: functionsDir,
    errorMessage: "Failed to refresh package-lock.json for functions",
  });
}

function main() {
  runTurboPrune();
  copyFirebaseConfig();
  copyEnvFiles();
  stageLocalPackages();
  rewritePackageJson();
  updatePackageLock();

  // Emit the absolute path to the Firebase app directory so shell scripts can use it.
  process.stdout.write(`${path.join(pruneOutputDir, "apps/firebase")}\n`);
}

main();
