#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENVIRONMENT=${1:-"dev"}
echo "Deploying to environment: $ENVIRONMENT"

PRUNED_FIREBASE_DIR=$(node "$SCRIPT_DIR/scripts/prepare-functions-deploy.mjs")
PRUNED_FUNCTIONS_DIR="$PRUNED_FIREBASE_DIR/functions"

echo "Installing workspace dependencies in pruned functions directory..."
(cd "$PRUNED_FUNCTIONS_DIR" && pnpm install)

echo "Linting functions..."
(cd "$PRUNED_FUNCTIONS_DIR" && pnpm run lint)

echo "Building functions bundle..."
(cd "$PRUNED_FUNCTIONS_DIR" && pnpm run build)

LOCAL_FIREBASE_BIN="$PRUNED_FUNCTIONS_DIR/node_modules/.bin/firebase"
FIREBASE_BIN=""

if command -v firebase >/dev/null 2>&1; then
  FIREBASE_BIN="$(command -v firebase)"
elif [[ -x "$LOCAL_FIREBASE_BIN" ]]; then
  FIREBASE_BIN="$LOCAL_FIREBASE_BIN"
fi

if [[ -z "$FIREBASE_BIN" ]]; then
  echo "firebase CLI not found. Install firebase-tools globally or add it to apps/firebase/functions." >&2
  exit 1
fi

FIREBASE_VERSION="$("$FIREBASE_BIN" --version | head -n 1)"
FIREBASE_MAJOR="${FIREBASE_VERSION%%.*}"
REQUIRED_FIREBASE_MAJOR=15

if [[ "$FIREBASE_MAJOR" -lt "$REQUIRED_FIREBASE_MAJOR" ]]; then
  echo "firebase-tools ${REQUIRED_FIREBASE_MAJOR}.x+ is required, found ${FIREBASE_VERSION} at ${FIREBASE_BIN}." >&2
  exit 1
fi

echo "Using Firebase CLI ${FIREBASE_VERSION} from ${FIREBASE_BIN}"

echo "Deploying from pruned workspace at $PRUNED_FIREBASE_DIR"
DEPLOY_FLAGS=()

# CI runs without an interactive terminal, so explicit flags are required for
# firestore index deletions when remote state drifts from the tracked json file.
if [[ "${CI:-}" == "true" || ! -t 0 ]]; then
  DEPLOY_FLAGS+=(--non-interactive --force)
fi

(cd "$PRUNED_FIREBASE_DIR" && "$FIREBASE_BIN" deploy --only functions,firestore,storage --project "$ENVIRONMENT" "${DEPLOY_FLAGS[@]}")
