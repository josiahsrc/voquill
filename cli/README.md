# Voquill CLI

This crate builds three binaries, one per backend environment.

| Binary             | Firebase project                                  | Default `--site`        |
| ------------------ | ------------------------------------------------- | ----------------------- |
| `voquill`          | `voquill-prod`                                    | `https://voquill.com`   |
| `voquill-dev`      | `voquill-dev`                                     | `http://localhost:4321` |
| `voquill-emulator` | `voquill-dev` + Auth emulator on `127.0.0.1:9099` | `http://localhost:4321` |

Each binary writes its credentials to `~/.config/voquill/<env>.json` (mode `0600` on Unix). Running one won't overwrite another's session.

## Install

Pick whichever method matches your platform. Add `--dev` (or `-Dev` on PowerShell) to any script installer to get `voquill-dev` instead. The package managers publish both `voquill` and `voquill-dev` as separate packages.

### macOS / Linux (shell)

```sh
curl -fsSL https://voquill.com/install.sh | sh
```

Options: `--dev` to install `voquill-dev`, `--version X.Y.Z` to pin a version. The script drops the binary in `~/.voquill/bin` and appends it to your shell's PATH (zsh, bash, fish supported). Override the location with `VOQUILL_INSTALL=/some/dir`.

### Windows (PowerShell)

```powershell
iwr https://voquill.com/install.ps1 -UseBasicParsing | iex
```

To pass flags, wrap it in a scriptblock:

```powershell
& ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Dev
& ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Version 1.2.3
```

Installs to `%USERPROFILE%\.voquill\bin` and adds it to your user PATH.

### Homebrew (macOS / Linux)

```sh
brew install voquill/voquill/voquill
# or, for the dev build:
brew install voquill/voquill/voquill-dev
```

### Debian / Ubuntu (APT)

```sh
curl -fsSL https://voquill.github.io/apt/gpg-key.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/voquill.gpg
echo "deb [signed-by=/usr/share/keyrings/voquill.gpg] https://voquill.github.io/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/voquill.list
sudo apt-get update
sudo apt-get install voquill   # or voquill-dev
```

Swap `stable` for `dev` to track dev releases.

### Fedora / RHEL / openSUSE (RPM)

```sh
sudo tee /etc/yum.repos.d/voquill.repo <<'EOF'
[voquill]
name=Voquill
baseurl=https://voquill.github.io/rpm/packages/stable
enabled=1
gpgcheck=1
gpgkey=https://voquill.github.io/rpm/gpg-key.asc
EOF
sudo dnf install voquill   # or voquill-dev
```

Swap `stable` for `dev` to track dev releases.

### Manual download

Pre-built archives (`.tar.gz` / `.zip`) and `.deb` / `.rpm` packages for every release live at <https://github.com/voquill/voquill/releases>. Prod tags are `cli-v*`; dev tags are `cli-dev-v*`.

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
