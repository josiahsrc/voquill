# Wayland Hotkeys

Wayland compositors block app-level global key capture by design.
Use compositor bindings to call Voquill's local hotkey REST endpoint via the helper script.

## Trigger command

```bash
<repo>/scripts/trigger-dictation.sh
```

This script reads the server port from:

- `$XDG_CONFIG_HOME/com.voquill.desktop.local/bridge-server.json`
- or `~/.config/com.voquill.desktop.local/bridge-server.json`

Then it calls:

`POST http://127.0.0.1:<port>/hotkey/dictation`

If Voquill is not running, the script exits with an error.

## Detect your compositor

```bash
echo $XDG_CURRENT_DESKTOP
```

Or check running processes:

```bash
ps -e -o comm= | grep -iE 'sway|hyprland|gnome-shell|kwin|mutter'
```

Then follow the section below that matches your environment.

## GNOME

**Register:**

```bash
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
  "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/voquill-dictation/']"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:\
/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/voquill-dictation/ \
  name 'Voquill Dictation'

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:\
/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/voquill-dictation/ \
  command '<repo>/scripts/trigger-dictation.sh'

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:\
/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/voquill-dictation/ \
  binding '<Alt>d'
```

If you already have custom keybindings, append the path to the existing list rather than replacing it.

**Unregister:**

Remove the `/voquill-dictation/` entry from the `custom-keybindings` list:

```bash
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "[]"
```

Or use **Settings > Keyboard > Custom Shortcuts** to manage bindings via the GUI.

## Sway

**Register** — add to `~/.config/sway/config`:

```bash
bindsym $mod+d exec <repo>/scripts/trigger-dictation.sh
```

Then reload:

```bash
swaymsg reload
```

**Unregister** — remove the `bindsym` line, then `swaymsg reload`.

## Hyprland

**Register** — add to `~/.config/hypr/hyprland.conf`:

```bash
bind = SUPER, D, exec, <repo>/scripts/trigger-dictation.sh
```

Then reload:

```bash
hyprctl reload
```

**Unregister** — remove the `bind` line, then `hyprctl reload`.
