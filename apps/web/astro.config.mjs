import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";

export default defineConfig({
  site: "https://voquill.com",
  output: "static",
  integrations: [react()],
  adapter: netlify(),
});