import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const { formatjsOverrideIdFn } = await import("./scripts/formatjs-id.mjs");

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            [
              "babel-plugin-formatjs",
              {
                overrideIdFn: (
                  id: string | undefined,
                  defaultMessage: string | undefined,
                  description: string | undefined,
                  filePath: string | undefined,
                ) =>
                  formatjsOverrideIdFn(
                    id,
                    defaultMessage,
                    description,
                    filePath,
                  ) ?? id,
                ast: true,
              },
            ],
          ],
        },
      }),
    ],
    build: {
      outDir: "dist",
      sourcemap: true,
    },
    server: {
      port: 3000,
      host: true,
    },
    preview: {
      port: 3000,
      host: true,
    },
  };
});
