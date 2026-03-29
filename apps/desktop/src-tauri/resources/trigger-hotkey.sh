#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:?Usage: trigger-hotkey.sh <action-name>}"
CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}"

read_port_from_file() {
  local info_file="$1"
  if [[ ! -f "$info_file" ]]; then
    return 1
  fi
  sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$info_file" | head -n 1
}

try_trigger() {
  local port="$1"
  curl --silent --show-error --fail --max-time 1 \
    -X POST "http://127.0.0.1:${port}/hotkey/${ACTION}" >/dev/null
}

DEV_INFO_FILE="$CONFIG_ROOT/com.voquill.desktop.dev/bridge-server.json"
LOCAL_INFO_FILE="$CONFIG_ROOT/com.voquill.desktop.local/bridge-server.json"
PROD_INFO_FILE="$CONFIG_ROOT/com.voquill.desktop/bridge-server.json"

for info_file in "$DEV_INFO_FILE" "$LOCAL_INFO_FILE" "$PROD_INFO_FILE"; do
  port="$(read_port_from_file "$info_file" || true)"
  if [[ -n "${port:-}" ]] && try_trigger "$port"; then
    exit 0
  fi
done

exit 1
