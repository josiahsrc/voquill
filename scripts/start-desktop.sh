#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FLAVOR=${1:-emulators}

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
  export VITE_USE_EMULATORS="true"
  ./scripts/kill-emulators.sh
  ./scripts/clear-desktop-db.sh local
  export PS1="[emulators] \$ "
  npm run dev
else
  export VITE_USE_EMULATORS="false"
  npm run dev --workspace=apps/desktop
fi
