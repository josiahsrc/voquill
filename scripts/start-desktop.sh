#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FLAVOR=${1:-prod}

case "${FLAVOR}" in
  dev|prod|emulators)
    ;;
  *)
    echo "Unknown flavor: ${FLAVOR}" >&2
    exit 1
    ;;
esac

export FLAVOR
export VITE_FLAVOR="${FLAVOR}"

if [ "${FLAVOR}" = "emulators" ]; then
  if ! lsof -iTCP:9099 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: Firebase emulators are not running (nothing listening on port 9099)." >&2
    echo "Start the emulators first, then re-run this script." >&2
    exit 1
  fi
  export VITE_USE_EMULATORS="true"
  ./scripts/clear-desktop-db.sh local
  export PS1="[emulators] \$ "
  pnpm exec turbo run dev --filter=desktop...
else
  export VITE_USE_EMULATORS="false"
  pnpm --filter desktop run dev
fi
