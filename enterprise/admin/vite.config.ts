import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { formatjsOverrideIdFn } from './scripts/formatjs-id.mjs'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "babel-plugin-formatjs",
            {
              overrideIdFn: formatjsOverrideIdFn,
              ast: true,
            },
          ],
        ],
      },
    }),
    svgr(),
  ],
})
