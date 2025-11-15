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

### Internationalization

The marketing site uses `react-intl` with hashed IDs derived from each `defaultMessage`.

1. Wrap UI text with `<FormattedMessage>` or call `intl.formatMessage` using only `defaultMessage` (+ optional `description`). The Babel plugin (`babel-plugin-formatjs`) converts default text like `"Your keyboard is holding you back."` to an ID such as `your_keyboard_is_holding_you_back`.
2. Run `npm run i18n:extract` (from `apps/web`) to regenerate `src/i18n/locales/en.json`.
3. Run `npm run i18n:sync` to propagate keys into the other locale files (`src/i18n/locales/es.json`, `fr.json`). Pass `-- --locale=es` to update individual locales.

Add new locales by editing `src/i18n/manifest.json`, creating the locale JSON file, then executing the extract + sync workflow.
