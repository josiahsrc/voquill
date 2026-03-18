# Wayland Hotkeys

Wayland compositors block app-level global key capture by design.
Voquill handles this with a bridge server and compositor-level keybindings.

## How it works

1. Voquill starts a local HTTP bridge server on a random port at launch.
2. The port is written to `<app_config_dir>/bridge-server.json`.
3. A bundled trigger script (`trigger-hotkey.sh`) is deployed to the config dir.
4. Compositor keybindings call the trigger script, which POSTs to the bridge server.
5. The bridge server emits a Tauri event that the TypeScript layer handles.

## Automatic sync

When you configure hotkeys in Voquill's settings on Linux, the app automatically registers them with your compositor:

- **GNOME**: Registers via `gsettings` custom keybindings (dconf paths prefixed `voquill-`).
- **Sway**: Writes `~/.config/sway/voquill-hotkeys` and reloads.
- **Hyprland**: Writes `~/.config/hypr/voquill-hotkeys.conf` and reloads.

Old bindings are cleaned up automatically on each sync.

## One-time setup for Sway/Hyprland

Voquill manages a dedicated include file for your hotkeys, but you need to source it once.

### Sway

Add to `~/.config/sway/config`:

```
include ~/.config/sway/voquill-hotkeys
```

Then reload: `swaymsg reload`

### Hyprland

Add to `~/.config/hypr/hyprland.conf`:

```
source = ~/.config/hypr/voquill-hotkeys.conf
```

Then reload: `hyprctl reload`

### GNOME

No manual setup needed. Hotkeys are registered automatically via `gsettings`.

## Manual trigger (development/debugging)

The standalone script at `scripts/trigger-dictation.sh` can be used for testing:

```bash
./scripts/trigger-dictation.sh
```

For other actions, use the deployed trigger script directly:

```bash
~/.config/com.voquill.desktop/trigger-hotkey.sh dictate
~/.config/com.voquill.desktop/trigger-hotkey.sh agent-dictate
~/.config/com.voquill.desktop/trigger-hotkey.sh cancel-transcription
```

## Bridge server details

The bridge server accepts `POST /hotkey/<action-name>` on `127.0.0.1`.

- `200 OK` — hotkey triggered successfully
- `404 Not Found` — unknown path
- `405 Method Not Allowed` — non-POST request

The port file is at:
- Dev: `$XDG_CONFIG_HOME/com.voquill.desktop.local/bridge-server.json`
- Prod: `$XDG_CONFIG_HOME/com.voquill.desktop/bridge-server.json`
