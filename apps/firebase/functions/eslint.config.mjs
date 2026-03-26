import { config as baseConfig } from "@voquill/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ["lib/**", "assets/**", "node_modules/**", ".repo-packages/**"]
  }
];
