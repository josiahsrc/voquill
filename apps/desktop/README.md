# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## WebdriverIO smoke test

1. Install the [tauri-driver](https://github.com/tauri-apps/tauri-driver) binary once with `cargo install tauri-driver`.
2. From this directory run `npm run test:webdriver` to build the app in debug mode and execute the WebdriverIO proof-of-concept spec.
3. You can override the compiled binary path by setting `TAURI_APPLICATION_PATH` before running the test if you use a custom build output.

The test boots the desktop application and asserts that the app shell renders in the main window, providing a starting point for richer end-to-end coverage.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Internationalization

The desktop app uses [`react-intl`](https://formatjs.io/docs/react-intl/) for translations. Device language is detected from the browser/OS locale and falls back to English (`src/i18n/manifest.json` tracks the supported locales). Translation JSON files live in `src/i18n/locales`.

### Adding or Updating Messages

1. Wrap UI strings with `<FormattedMessage>` or call `intl.formatMessage` from the `useIntl` hook. Only `defaultMessage` (and optional `description`) is required—the Babel plugin (`babel-plugin-formatjs`) derives ids directly from the default text (e.g., `"Installing update..."` ⇒ `installing_update`).
2. Run `npm run i18n:extract` (from `apps/desktop`) to regenerate the English catalog (`src/i18n/locales/en.json`) from the source defaults. The custom formatter applies the same slug rules so ids match the runtime output.
3. Run `npm run i18n:sync` to copy the new message ids into the other locale files (`es`, `fr`) while preserving any existing translations. Use `npm run i18n:sync -- --locale=es` to target a subset.

To add a new locale, list it inside `src/i18n/manifest.json`, create a `.json` file in `src/i18n/locales`, then run the sync command to seed the keys with English defaults before translating them.
