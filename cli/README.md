# Voquill CLI

This crate builds three binaries, one per backend environment.

| Binary             | Firebase project                                  | Default `--site`        |
| ------------------ | ------------------------------------------------- | ----------------------- |
| `voquill`          | `voquill-prod`                                    | `https://voquill.com`   |
| `voquill-dev`      | `voquill-dev`                                     | `http://localhost:4321` |
| `voquill-emulator` | `voquill-dev` + Auth emulator on `127.0.0.1:9099` | `http://localhost:4321` |

Each binary writes its credentials to `~/.config/voquill/<env>.json` (mode `0600` on Unix). Running one won't overwrite another's session.

## Build

```sh
cargo build             # all three, debug
cargo build --release
```

Binaries end up in `target/debug/` or `target/release/`.

## Running locally

### Prod

```sh
cargo run --bin voquill -- login
```

Opens the live authorize page and uses real Firebase.

### Dev

Astro dev server plus the dev Firebase project:

```sh
# terminal 1
cd ../apps/web && pnpm run dev

# terminal 2
cargo run --bin voquill-dev -- login
```

Hits `http://localhost:4321/authorize?env=dev&...`, which loads the dev Firebase config.

### Emulators

```sh
# terminal 1
firebase emulators:start --only auth --project voquill-dev

# terminal 2
cd ../apps/web && pnpm run dev

# terminal 3
cargo run --bin voquill-emulator -- login
```

With `?env=emulator` the authorize page calls `connectAuthEmulator(auth, "http://127.0.0.1:9099")`. The whole sign-in round-trip stays on your machine.

## Pointing at a different frontend

Pass `--site <origin>` to any binary if you want to test against a preview deploy, staging, or some other host. The binary still picks which Firebase project the login goes through.

```sh
voquill login --site https://preview-42.voquill.com
voquill-dev login --site https://staging.voquill.com
```

The CLI appends `/authorize` itself, so just give it the origin.

## Agent sessions

Wrap an agent command in a Voquill session:

```sh
voquill agent [claude|codex|codebuff]
```

Each session gets a random name (e.g. `brave-octopus`) and is written to the Realtime Database under `session/<uid>/<sessionId>`. The wrapped command runs inside a pty, so interactive TUIs like `claude` work. Exiting the wrapped command deletes the session.

You need to `login` first so the CLI has a token to talk to RTDB. `voquill-emulator agent` talks to the RTDB emulator on `127.0.0.1:9000` — start it with `firebase emulators:start --only auth,database --project voquill-dev`.

## One-time Firebase setup

Do this once for `voquill-prod` and once for `voquill-dev` in the Firebase Console:

1. Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorized domains → add wherever the authorize page is hosted (`voquill.com` for prod). `localhost` is allowed by default.
