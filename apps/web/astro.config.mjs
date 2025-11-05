import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";

export default defineConfig({
  site: "https://voquill.com",
  output: "server",
  integrations: [react()],
  adapter: netlify(),
});
