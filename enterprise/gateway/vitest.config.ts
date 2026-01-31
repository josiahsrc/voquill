import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["./test/global-teardown.ts"],
    fileParallelism: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
