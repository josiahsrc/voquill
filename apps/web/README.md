## Voquill Web

Static marketing site for Voquill built with Vite, React, and TypeScript.

### Available scripts

- `npm run dev` – start the development server on port 3000
- `npm run build` – type-check and produce a production build in `dist`
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint using the shared workspace config
- `npm run check-types` – run TypeScript without emitting files

### Key directories

- `src/components` – reusable presentational components
- `src/layouts` – layout wrappers for pages and metadata management
- `src/pages` – top-level route components rendered by React Router
- `src/lib` – shared utilities (download manifests, markdown rendering)
- `content` – Markdown sources for privacy policy and terms of service
- `public` – static assets copied verbatim to the build output

### Deployment notes

The build output in `dist` is static and compatible with Firebase Hosting. The SPA uses React Router to handle client-side navigation; ensure your hosting rewrites unknown paths back to `index.html` (see `firebase.json`).
