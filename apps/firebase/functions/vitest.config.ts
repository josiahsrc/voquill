import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    noExternal: ["@firemix/mixed", "@firemix/core", "@firemix/admin", "@firemix/client"]
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  }
});
