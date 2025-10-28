# Repository Guidelines

## Project Structure & Modules
- Turborepo monorepo:
  - `apps/desktop` Tauri v2 + Vite, native desktop app
  - `apps/web` Next.js, product page/marketing site
  - `apps/firebase` Firebase backend
  - `packages/*` shared libs (e.g., `types`, `ui`, `utilities`, `pricing`, `functions`, `firemix`, etc)
  - `scripts/*`, `infra/`, and `packages/local-docker/` for tooling and local services.
  - `terraform/` for cloud infra (GCP).

## Build, Test, Develop
- Install: `npm install`

## Coding Style & Naming
- TypeScript: 2‑space indent.
- Rust: `rustfmt`.
- Runtime: Noted in `.nvmrc`
- Components: `PascalCase.tsx`

## Agent‑Specific Practices
- Read the `docs` directory for more information about architecture, design patterns, tutorials, and conventions.
- Do not run `turbo dev` or any command that hangs. Use `turbo build` instead so that you don't get stuck.
