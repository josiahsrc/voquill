#!/usr/bin/env bash
set -euo pipefail

# Try common terminal emulators in order of preference
for term in foot alacritty kitty wezterm gnome-terminal konsole xterm; do
  if command -v "$term" >/dev/null 2>&1; then
    case "$term" in
      foot)           exec foot -e bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      alacritty)      exec alacritty -e bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      kitty)          exec kitty bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      wezterm)        exec wezterm start -- bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      gnome-terminal) exec gnome-terminal -- bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      konsole)        exec konsole -e bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
      xterm)          exec xterm -e bash -c 'echo "Hello, World!"; read -rp "Press Enter to close..."' ;;
    esac
  fi
done

echo "No supported terminal emulator found." >&2
exit 1
