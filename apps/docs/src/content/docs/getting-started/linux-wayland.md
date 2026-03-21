---
title: Linux (Wayland)
description: Install and configure Voquill on Linux with Wayland.
---

This guide is for Linux desktops running a Wayland session (GNOME, Sway, Hyprland, etc.). If you are using X11, see [Linux (X11)](/getting-started/linux-x11) instead.

To check which display server you are using:

```bash
echo $XDG_SESSION_TYPE
```

## Installation

There are multiple Linux installation options available on the [voquill.com/download](https://voquill.com/download) page. The easiest is via the APT package for automatic updates:

```bash
curl -fsSL https://voquill.github.io/apt/install.sh | bash
```

Or set up the repository manually:

```bash
# Add GPG key
curl -fsSL https://voquill.github.io/apt/gpg-key.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/voquill.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/voquill.gpg arch=amd64] https://voquill.github.io/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/voquill.list

# Install
sudo apt-get update
sudo apt-get install voquill-desktop
```

## Wayland Setup

Wayland compositors block app-level global key capture and input simulation by design. Voquill handles this with compositor-level keybindings and kernel-level input simulation, but some one-time setup is required.

### ydotool (required for text pasting)

Voquill uses `ydotool` to simulate paste keystrokes after placing transcribed text on the clipboard. It works on all Wayland compositors by writing directly to `/dev/uinput` at the kernel level.

**Install:**

```bash
sudo apt install ydotool
```

**Grant your user access to /dev/uinput:**

```bash
# Add your user to the input group
sudo usermod -aG input $USER

# Create a udev rule so /dev/uinput is group-accessible
echo 'KERNEL=="uinput", GROUP="input", MODE="0660"' | sudo tee /etc/udev/rules.d/99-uinput.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Log out and back in for the group change to take effect.

**Verify it works:**

```bash
# Open a text editor, click into it, then run:
ydotool type "hello"
```

If "hello" appears in the editor, ydotool is working.

### wtype (Sway/Hyprland only)

On Sway and Hyprland, Voquill uses `wtype` as a fallback for input simulation via the virtual-keyboard Wayland protocol. This is not needed on GNOME.

```bash
sudo apt install wtype
```

### Hotkey Registration

When you configure hotkeys in Voquill's settings, the app automatically registers them with your compositor. However, Sway and Hyprland require a one-time config change to source Voquill's keybinding file.

#### GNOME

No manual setup needed. Voquill registers hotkeys via `gsettings` automatically.

#### Sway

Add this line to `~/.config/sway/config`:

```
include ~/.config/sway/voquill-hotkeys
```

Then reload:

```bash
swaymsg reload
```

#### Hyprland

Add this line to `~/.config/hypr/hyprland.conf`:

```
source = ~/.config/hypr/voquill-hotkeys.conf
```

Then reload:

```bash
hyprctl reload
```

## Known Limitations

### Recording pill not visible on older GNOME versions

The recording pill overlay uses the `wlr-layer-shell` protocol to render on top of other windows. Older versions of GNOME (prior to GNOME 46) do not support this protocol, so the pill will not appear. Hotkeys and transcription still work normally — only the visual indicator is affected.

This is a compositor limitation and cannot be worked around by Voquill. Upgrading to GNOME 46 or later (Ubuntu 24.04+, Fedora 40+) will resolve this.
