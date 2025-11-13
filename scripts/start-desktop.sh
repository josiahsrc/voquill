#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FLAVOR=${1:-dev}

case "${FLAVOR}" in
  dev|prod)
    ;;
  *)
    echo "Unknown flavor: ${FLAVOR}" >&2
    exit 1
    ;;
esac

export FLAVOR
export VITE_FLAVOR="${FLAVOR}"
export VITE_USE_EMULATORS="false"

npm run dev --workspace=apps/desktop
