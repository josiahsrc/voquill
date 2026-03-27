# Wayland Setup

Wayland compositors block app-level global key capture and input simulation by design.
Voquill handles this with compositor-level keybindings and kernel-level input simulation.

## Prerequisites

### ydotool (required for text pasting)

Voquill uses `ydotool` to simulate Ctrl+V after placing transcribed text on the clipboard.
ydotool works on all Wayland compositors (GNOME, Sway, Hyprland, etc.) by writing directly
to `/dev/uinput` at the kernel level, bypassing Wayland's input restrictions.

**Install:**

```bash
# Debian / Ubuntu
sudo apt install ydotool

# Fedora / RHEL
sudo dnf install ydotool

# openSUSE
sudo zypper install ydotool
```

**Grant your user access to /dev/uinput:**

The uinput device must be readable/writable by your user. Two approaches:

*Quick (non-persistent):*

```bash
sudo chmod 666 /dev/uinput
```

*Persistent (survives reboot):*

```bash
# Add your user to the input group
sudo usermod -aG input $USER

# Create a udev rule so /dev/uinput is group-accessible
echo 'KERNEL=="uinput", GROUP="input", MODE="0660"' | sudo tee /etc/udev/rules.d/99-uinput.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Log out and back in for the group change to take effect.

**Daemon startup:**

Voquill now tries to start `ydotoold` automatically on Wayland when `ydotoold` is installed but
its socket is missing. You should not need to run `ydotoold &` manually.

Some distros package a systemd unit for `ydotoold`, but Voquill does not rely on it. If automatic
startup fails, the remaining causes are usually outside the app:

- your user still cannot open `/dev/uinput`
- `XDG_RUNTIME_DIR` is missing or invalid
- another stale `.ydotool_socket` is blocking startup

To check your version: `ydotoold --version` or your distro package manager.

**Verify it works:**

```bash
# Open a text editor, click into it, then run:
ydotool type "hello"
```

If "hello" appears in the editor, ydotool is working.

**Known issues:**

- ydotool 0.1.x accepts `modifier+key` syntax (for example `ctrl+v`). Version 1.0+
  documents raw keycode press/release syntax instead (for example `29:1 47:1 47:0 29:0`).
  Voquill prefers raw keycodes for known paste/copy combos so it works across both styles.
- Without `/dev/uinput` access, ydotool will fail with `failed to open uinput device`.
  Make sure the permissions are set as described above.
- If Voquill logs that it could not start `ydotoold` automatically, remove any stale
  `$XDG_RUNTIME_DIR/.ydotool_socket` file and re-check your `/dev/uinput` permissions.

### wtype (fallback for Sway/Hyprland)

On Sway and Hyprland, `wtype` is an alternative that uses the `virtual-keyboard-unstable-v1`
Wayland protocol. Voquill bundles wtype in production builds. For development, install it separately:

```bash
# Debian / Ubuntu
sudo apt install wtype

# Fedora / RHEL
sudo dnf install wtype

# openSUSE
sudo zypper install wtype
```

Note: wtype does **not** work on GNOME. GNOME does not implement the virtual-keyboard
protocol, so wtype will fail with "Compositor does not support the virtual keyboard protocol".
Use ydotool on GNOME instead.

## Hotkey registration

### How it works

1. Voquill starts a local HTTP bridge server on a random port at launch.
2. The port is written to `<app_config_dir>/bridge-server.json`.
3. A trigger script (`trigger-hotkey.sh`) is deployed to the config dir. If the packaged resource is unavailable, Voquill falls back to an embedded copy.
4. Compositor keybindings call the trigger script, which POSTs to the bridge server.
5. The bridge server emits a Tauri event that the TypeScript layer handles.

### Automatic sync

When you configure hotkeys in Voquill's settings on Linux, the app automatically registers them with your compositor:

- **GNOME**: Registers via `gsettings` custom keybindings (dconf paths prefixed `voquill-`).
- **Sway**: Writes `~/.config/sway/voquill-hotkeys` and reloads.
- **Hyprland**: Writes `~/.config/hypr/voquill-hotkeys.conf` and reloads.

Old bindings are cleaned up automatically on each sync.

### One-time setup for Sway/Hyprland

Voquill manages a dedicated include file for your hotkeys, but you need to source it once.

**Sway** — add to `~/.config/sway/config`:

```
include ~/.config/sway/voquill-hotkeys
```

Then reload: `swaymsg reload`

**Hyprland** — add to `~/.config/hypr/hyprland.conf`:

```
source = ~/.config/hypr/voquill-hotkeys.conf
```

Then reload: `hyprctl reload`

**GNOME** — no manual setup needed.

## Text pasting

Voquill pastes transcribed text by:

1. Saving the current clipboard contents
2. Setting the clipboard to the transcribed text (prefer `wl-copy`, fall back to `arboard`)
3. Simulating a paste keystroke (Ctrl+V or Ctrl+Shift+V for terminals)
4. Restoring the previous clipboard contents after a short delay

The keystroke simulation tries these tools in order:

1. **ydotool** — works on all compositors via `/dev/uinput` (recommended)
2. **wtype** — works on Sway/Hyprland via virtual-keyboard protocol (bundled in production)
3. **wtype text** — types the text directly as a last resort (no clipboard)

If `ydotool` is installed but its daemon is not ready, Voquill first tries to launch `ydotoold`
automatically and then falls back to `wtype` where the compositor supports it.

If no keystroke simulation tool is available, pasting will fail. Install ydotool as described above.

## Manual trigger (development/debugging)

Use the deployed trigger script directly:

```bash
~/.config/com.voquill.desktop/trigger-hotkey.sh dictate
~/.config/com.voquill.desktop/trigger-hotkey.sh agent-dictate
~/.config/com.voquill.desktop/trigger-hotkey.sh cancel-transcription
```

The script first checks `bridge-server.json` next to itself, then falls back to scanning matching `~/.config/com.voquill.desktop*` directories. This lets production, development, and GPU flavors share the same trigger logic.

## Bridge server details

The bridge server accepts `POST /hotkey/<action-name>` on `127.0.0.1`.

- `200 OK` — hotkey triggered successfully
- `404 Not Found` — unknown path
- `405 Method Not Allowed` — non-POST request

The port file is written to the app's config directory, for example:
- Local/dev: `$XDG_CONFIG_HOME/com.voquill.desktop.local/bridge-server.json`
- Dev: `$XDG_CONFIG_HOME/com.voquill.desktop.dev/bridge-server.json`
- Prod: `$XDG_CONFIG_HOME/com.voquill.desktop/bridge-server.json`
- GPU variants: matching `$XDG_CONFIG_HOME/com.voquill.desktop.gpu*` directories
