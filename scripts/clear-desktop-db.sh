#!/usr/bin/env bash
set -euo pipefail

FLAVOR=${1:-local}
if [ "${FLAVOR}" = "local" ]; then
  export IDENTIFIER="com.voquill.desktop.local"
elif [ "${FLAVOR}" = "prod" ]; then
  export IDENTIFIER="com.voquill.desktop"
elif [ "${FLAVOR}" = "dev" ]; then
  export IDENTIFIER="com.voquill.desktop.dev"
else
  echo "Unknown flavor: ${FLAVOR}" >&2
  exit 1
fi

DB_FILENAME="voquill.db"

resolve_config_dir() {
  case "$(uname -s)" in
    Darwin)
      printf "%s\n" "${HOME}/Library/Application Support/${IDENTIFIER}"
      ;;
    Linux)
      printf "%s\n" "${XDG_CONFIG_HOME:-${HOME}/.config}/${IDENTIFIER}"
      ;;
    CYGWIN*|MINGW*|MSYS*)
      if [ -z "${APPDATA:-}" ]; then
        echo "APPDATA is not set; cannot locate database." >&2
        exit 1
      fi
      if command -v cygpath >/dev/null 2>&1; then
        printf "%s\n" "$(cygpath "$APPDATA")/${IDENTIFIER}"
      else
        appdata_unix="${APPDATA//\\//}"
        printf "%s\n" "${appdata_unix}/${IDENTIFIER}"
      fi
      ;;
    *)
      echo "Unsupported operating system: $(uname -s)" >&2
      exit 1
      ;;
  esac
}

main() {
  local config_dir
  config_dir="$(resolve_config_dir)"
  local db_path="${config_dir}/${DB_FILENAME}"
  local removed=0

  for suffix in "" "-wal" "-shm"; do
    local target="${db_path}${suffix}"
    if [ -f "${target}" ]; then
      rm -- "${target}"
      echo "Removed ${target}"
      removed=1
    fi
  done

  if [ "${removed}" -eq 0 ]; then
    echo "No database files found under ${config_dir}"
  else
    echo "Voquill desktop SQLite data cleared."
  fi
}

main "$@"
