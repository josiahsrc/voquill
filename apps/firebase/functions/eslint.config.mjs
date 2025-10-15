import { config as baseConfig } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ["lib/**", "assets/**", "node_modules/**"]
  },
  {
    files: ["jest.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly"
      }
    }
  }
];
