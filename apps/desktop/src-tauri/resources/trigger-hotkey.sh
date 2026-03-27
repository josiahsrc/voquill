#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:?Usage: trigger-hotkey.sh <action-name>}"
CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

try_info_file() {
  local info_file="$1"
  local port

  port="$(read_port_from_file "$info_file" || true)"
  [[ -n "${port:-}" ]] || return 1

  try_trigger "$port"
}

if try_info_file "$SCRIPT_DIR/bridge-server.json"; then
  exit 0
fi

for config_dir in "$CONFIG_ROOT"/com.voquill.desktop*; do
  if [[ -d "$config_dir" ]] && [[ "$config_dir" != "$SCRIPT_DIR" ]]; then
    if try_info_file "$config_dir/bridge-server.json"; then
      exit 0
    fi
  fi
done

exit 1
