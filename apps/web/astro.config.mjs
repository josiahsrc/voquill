import { defineConfig } from "astro/config";
import react from "@astrojs/react";

import node from "@astrojs/node";

export default defineConfig({
  site: "https://voquill.com",
  output: "server",
  integrations: [react()],
  adapter: node({
    mode: "standalone",
  }),
});