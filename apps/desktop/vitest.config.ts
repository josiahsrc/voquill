import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/integration/**/*.test.ts"],
    setupFiles: ["./test/helpers/setup.ts"],
  },
});
