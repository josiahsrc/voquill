# Windows Installer Bootstrapper

A modern, sleek installer UI for Voquill on Windows. This bootstrapper wraps the NSIS installer with a beautiful custom interface.

## How It Works

1. User downloads and runs `Voquill-Installer.exe` (the bootstrapper)
2. Bootstrapper shows a modern UI with the Voquill logo and progress bar
3. It extracts and runs the bundled NSIS installer silently (`/S` flag)
4. Once complete, user can launch Voquill directly from the installer

## Build Process

### Prerequisites

- Node.js 18+
- Rust toolchain
- Tauri CLI (`npm install -g @tauri-apps/cli`)

### Step 1: Build the Main Desktop App

First, build the main Voquill NSIS installer:

```bash
cd apps/desktop
npm run tauri build -- --target x86_64-pc-windows-msvc
```

This produces `Voquill_0.1.0_x64-setup.exe` in `src-tauri/target/release/bundle/nsis/`.

### Step 2: Bundle the NSIS Installer

Copy the NSIS installer to the bootstrapper's resources:

```bash
cp apps/desktop/src-tauri/target/release/bundle/nsis/Voquill_*-setup.exe \
   apps/windows-installer/src-tauri/installer/Voquill_Setup.exe
```

### Step 3: Build the Bootstrapper

```bash
cd apps/windows-installer
npm install
npm run tauri build
```

This produces `Voquill Installer_0.1.0_x64-setup.exe` - the final distributable.

## CI Integration

Add these steps to your GitHub Actions workflow:

```yaml
# After building the main desktop app...
- name: Build Windows Bootstrapper
  if: matrix.platform == 'windows-latest'
  run: |
    # Copy NSIS installer to bootstrapper resources
    cp apps/desktop/src-tauri/target/release/bundle/nsis/Voquill_*-setup.exe \
       apps/windows-installer/src-tauri/installer/Voquill_Setup.exe

    # Build bootstrapper
    cd apps/windows-installer
    npm install
    npm run tauri build

    # The final installer is at:
    # apps/windows-installer/src-tauri/target/release/bundle/nsis/
```

## Customization

### UI Theming

Edit `src/styles.css` to customize colors:

```css
:root {
  --bg-primary: #0a0a0f;      /* Main background */
  --accent: #6366f1;           /* Progress bar, buttons */
  --success: #22c55e;          /* Completion state */
}
```

### Window Size

Edit `src-tauri/tauri.conf.json`:

```json
"windows": [{
  "width": 480,
  "height": 320
}]
```

## Notes

- The bootstrapper is ~5-8MB (Tauri + WebView2)
- WebView2 is bundled as an offline installer for reliability
- Updates still work normally via Tauri's updater (the bootstrapper is only for first install)
