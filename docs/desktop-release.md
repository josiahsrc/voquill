# Desktop Release Configuration

## Release Flow Summary
- Pushes to the `main` branch always run the **Release Desktop** workflow in the **dev** channel.
  - The workflow bumps the previous `desktop-dev-v*` tag by one patch, tags the current `main` commit, and builds all platforms.
  - Build outputs are published to a GitHub release with the matching tag (for example `desktop-dev-v1.2.3`).
  - A `latest.json` updater manifest is generated that references the versioned release assets and is uploaded to the channel release with the constant tag `desktop-dev`.
- Production promotions are manual (`workflow_dispatch`) runs of the same workflow.
  - Choose `environment: prod` (default) and optionally supply a `version` to promote a specific `desktop-dev-v<version>` tag; otherwise the newest dev tag is promoted.
  - Assets are published to a GitHub release tagged `desktop-v<version>` and the channel release tagged `desktop-prod` is updated with the fresh manifest.
- During each build the Tauri config is patched so the updater reads the correct channel-specific manifest:
  - Desktop dev channel → `https://github.com/josiahsrc/voquill/releases/download/desktop-dev/latest.json`
  - Desktop prod channel → `https://github.com/josiahsrc/voquill/releases/download/desktop-prod/latest.json`

## GitHub Release Layout
- **Versioned releases** (`desktop-dev-v*` and `desktop-v*`) contain the platform-specific updater archives, installers, and metadata for a specific build.
- **Channel releases** (`desktop-dev` and `desktop-prod`) always expose the latest manifest for that track (`latest.json`). The manifest points back to the correct versioned assets, so the updater downloads the exact build produced in the corresponding workflow run.
- Tags `desktop-dev` and `desktop-prod` are moved forward on each publish so they always reference the commit that produced the release.

## Required GitHub Actions Secrets
| Secret | Description | How to obtain |
| --- | --- | --- |
| `TAURI_PRIVATE_KEY` | Tauri signing key used for bundle signing. | Generate with `npx tauri signer generate` (store the private key PEM output). |
| `TAURI_PRIVATE_KEY_PASSWORD` | Optional password for the signing key. Leave blank if the key is unencrypted. | Use the password you set when generating the key. |
| `TAURI_UPDATER_PUBLIC_KEY` | Public key that the desktop app uses to verify update signatures. | Output from `tauri signer generate` (the `public key` line). |
| `APPLE_API_KEY_BASE64` | Base64-encoded App Store Connect API key (`.p8`) used for notarization. | Create an API key in App Store Connect → Users and Access → Keys, download the `.p8`, and encode it with `base64`. |
| `APPLE_API_KEY_ID` | 10-character identifier for the API key. | Displayed alongside the key in App Store Connect. |
| `APPLE_API_ISSUER` | App Store Connect issuer ID (UUID). | Available in App Store Connect → Users and Access → Keys. |
| `APPLE_TEAM_ID` | Ten-character Apple Developer Team ID. | Found in App Store Connect → Membership details. |
| `APPLE_CERTIFICATE` | Base64-encoded `Developer ID Application` certificate (`.p12`). | Export the certificate from Keychain Access and encode with `base64 < certificate.p12`. |
| `APPLE_CERTIFICATE_PASSWORD` | Password that protects the exported certificate. | Set during the Keychain export; store the same value as a secret. |
| `APPLE_SIGNING_IDENTITY` | Full signing identity string (for example `Developer ID Application: Example Corp (ABCDE12345)`). | Visible in Keychain Access after importing the Developer ID certificate. |
| `KEYCHAIN_PASSWORD` | Throwaway password for the temporary CI keychain that stores the signing cert. | Create a strong random string and add it as a secret. |

No additional storage credentials are required—the workflow publishes directly to GitHub releases using the provided `GITHUB_TOKEN`.

## macOS Signing & Permissions
- The desktop bundle enables Hardened Runtime with custom entitlements at `apps/desktop/src-tauri/macos/Voquill.entitlements`. Keep the Developer ID certificate in sync with these capabilities if you adjust microphone or keyboard monitoring features.
- macOS now prompts for microphone access (`NSMicrophoneUsageDescription`) and accessibility (`NSAccessibilityUsageDescription`) the first time the app runs. These strings live in `apps/desktop/src-tauri/Info.plist`.

## Windows Installer & VC++ Redistributable
- The Windows installer (NSIS) automatically installs the Visual C++ 2015-2022 Redistributable (x64) if not present on the target system.
- The redistributable is required because native dependencies (whisper-rs, cpal, rdev) link against the MSVC runtime.
- The NSIS installer hooks are defined in `apps/desktop/src-tauri/nsis/installer-hooks.nsi`.
- During CI, the workflow downloads `vc_redist.x64.exe` from Microsoft and bundles it with the installer.
- Installation runs silently (`/install /quiet /norestart`) and is non-blocking if the runtime is already installed or if the setup returns a non-fatal error.

## Verifying a Dev Release
1. Push to `main` and wait for the **Release Desktop** workflow to finish.
2. Check the `metadata` job output for the new `desktop-dev-v*` tag.
3. Inspect the GitHub release for that tag to confirm platform bundles and metadata uploaded successfully.
4. Confirm the dev manifest is accessible at `https://github.com/josiahsrc/voquill/releases/download/desktop-dev/latest.json`.
5. Launch the dev desktop app; the updater should point at the dev manifest URL injected during CI.

## Dev → Prod Promotion Checklist
1. Optionally verify that the desired dev tag exists (`git tag -l 'desktop-dev-v*' --sort=-v:refname`).
2. Trigger the **Release Desktop** workflow manually:
   - Leave `version` blank to promote the most recent dev tag, or set it to an explicit `x.y.z`.
   - Ensure `environment` is `prod`.
3. Inspect the `desktop-v<version>` GitHub release to validate the uploaded assets.
4. Confirm the production manifest: `https://github.com/josiahsrc/voquill/releases/download/desktop-prod/latest.json`.
