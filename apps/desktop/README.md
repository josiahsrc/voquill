# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## WebdriverIO smoke test

1. Install the [tauri-driver](https://github.com/tauri-apps/tauri-driver) binary once with `cargo install tauri-driver`.
2. From this directory run `npm run test:webdriver` to build the app in debug mode and execute the WebdriverIO proof-of-concept spec.
3. You can override the compiled binary path by setting `TAURI_APPLICATION_PATH` before running the test if you use a custom build output.

The test boots the desktop application and asserts that the app shell renders in the main window, providing a starting point for richer end-to-end coverage.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
