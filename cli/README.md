# Voquill CLI

This crate builds three binaries, one per backend environment.

| Binary             | Firebase project                                  | Default `--site`        |
| ------------------ | ------------------------------------------------- | ----------------------- |
| `voquill`          | `voquill-prod`                                    | `https://voquill.com`   |
| `voquill-dev`      | `voquill-dev`                                     | `http://localhost:4321` |
| `voquill-emulator` | `voquill-dev` + Auth emulator on `127.0.0.1:9099` | `http://localhost:4321` |

Each binary writes its credentials to `~/.config/voquill/<env>.json` (mode `0600` on Unix). Running one won't overwrite another's session.

## Install

Released builds are published to GitHub Releases and mirrored to Homebrew, APT, and RPM repositories. Pick the channel that matches your OS. Append `--dev` (or `-Dev` on Windows, or swap the package name on package managers) to install the `voquill-dev` build that targets the dev Firebase backend.

### macOS / Linux (shell installer)

```sh
curl -fsSL https://voquill.com/install.sh | sh
```

Dev build:

```sh
curl -fsSL https://voquill.com/install.sh | sh -s -- --dev
```

Pin a specific version:

```sh
curl -fsSL https://voquill.com/install.sh | sh -s -- --version 1.2.3
```

Installs to `$VOQUILL_INSTALL/bin` (defaults to `~/.voquill/bin`) and appends it to your shell profile.

### Windows (PowerShell)

```powershell
iwr https://voquill.com/install.ps1 -UseBasicParsing | iex
```

Dev build:

```powershell
& ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Dev
```

Pin a specific version:

```powershell
& ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Version 1.2.3
```

Installs to `%VOQUILL_INSTALL%\bin` (defaults to `%USERPROFILE%\.voquill\bin`) and adds it to your user `PATH`.

### Homebrew (macOS, Linux)

```sh
brew tap voquill/voquill
brew install voquill
```

Dev build (side-by-side install is fine — the binaries have different names):

```sh
brew install voquill-dev
```

Upgrade:

```sh
brew update && brew upgrade voquill
```

### APT (Debian, Ubuntu)

```sh
# Add GPG key
curl -fsSL https://voquill.github.io/apt/gpg-key.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/voquill.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/voquill.gpg] https://voquill.github.io/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/voquill.list

sudo apt-get update
sudo apt-get install voquill
```

For the dev build, swap `stable` for `dev` in the `deb` line and install `voquill-dev` instead.

Upgrade with `sudo apt-get update && sudo apt-get upgrade voquill`.

### RPM (Fedora, RHEL, openSUSE)

**Fedora / RHEL:**

```sh
sudo tee /etc/yum.repos.d/voquill.repo <<'EOF'
[voquill-stable]
name=Voquill (stable)
baseurl=https://voquill.github.io/rpm/packages/stable
enabled=1
gpgcheck=1
gpgkey=https://voquill.github.io/rpm/gpg-key.asc
EOF

sudo dnf install voquill
```

**openSUSE:**

```sh
sudo zypper addrepo --gpgcheck https://voquill.github.io/rpm/packages/stable voquill-stable
sudo rpm --import https://voquill.github.io/rpm/gpg-key.asc
sudo zypper install voquill
```

For the dev build, swap the `stable` path for `dev` (`baseurl=https://voquill.github.io/rpm/packages/dev`) and install `voquill-dev` instead.

### Direct download

Every release also posts tarballs, zips, `.deb`, and `.rpm` artifacts at
<https://github.com/voquill/voquill/releases>. Prod releases are tagged `cli-v<version>`, dev releases are tagged `cli-dev-v<version>` and marked as pre-release.

### Upgrading from the CLI itself

Once installed, you can re-run the install script through the binary:

```sh
voquill upgrade
```

This re-executes the appropriate installer for the channel you're on.

## Release channels and publishing

The [`release-cli.yml`](../.github/workflows/release-cli.yml) workflow drives every publish target:

- **Trigger** — every push to `main` that touches `cli/**` cuts a new **dev** release (auto-bumps patch, tagged `cli-dev-v<version>`, marked pre-release). Prod releases are cut via `workflow_dispatch` and promote the most recent (or specified) dev tag to `cli-v<version>`.
- **GitHub Releases** — uploads `voquill[-dev]-<target>.tar.gz` / `.zip`, plus `.deb` and `.rpm` packages for Linux.
- **Homebrew tap** — regenerates the formula in [`voquill/homebrew-voquill`](https://github.com/voquill/homebrew-voquill).
- **APT repository** — adds the new `.deb` to [`voquill/apt`](https://github.com/voquill/apt) (`stable` codename for prod, `dev` for dev).
- **RPM repository** — adds the new `.rpm` to [`voquill/rpm`](https://github.com/voquill/rpm) under `packages/stable` or `packages/dev`.
- **Install scripts** — `apps/web/public/install.sh` and `apps/web/public/install.ps1` are served from `voquill.com` and resolve the latest matching tag on each channel.

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

Each session gets a random name (e.g. `brave-octopus`) — pass `--slug my-name` to set your own (it's kebab-cased for you). The session is written to the Realtime Database under `session/<uid>/<sessionId>`. The wrapped command runs inside a pty, so interactive TUIs like `claude` work. Exiting the wrapped command deletes the session.

You need to `login` first so the CLI has a token to talk to RTDB. `voquill-emulator agent` talks to the RTDB emulator on `127.0.0.1:9000` — start it with `firebase emulators:start --only auth,database --project voquill-dev`.

## One-time Firebase setup

Do this once for `voquill-prod` and once for `voquill-dev` in the Firebase Console:

1. Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorized domains → add wherever the authorize page is hosted (`voquill.com` for prod). `localhost` is allowed by default.
