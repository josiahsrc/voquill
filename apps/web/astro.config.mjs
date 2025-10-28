import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://voquill.com",
  output: "static",
  integrations: [react()],
});
