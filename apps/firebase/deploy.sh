#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENVIRONMENT=${1:-"dev"}
echo "Deploying to environment: $ENVIRONMENT"

PRUNED_FIREBASE_DIR=$(node "$SCRIPT_DIR/scripts/prepare-functions-deploy.mjs")
PRUNED_FUNCTIONS_DIR="$PRUNED_FIREBASE_DIR/functions"

echo "Installing workspace dependencies in pruned functions directory..."
(cd "$PRUNED_FUNCTIONS_DIR" && npm install)

echo "Linting functions..."
(cd "$PRUNED_FUNCTIONS_DIR" && npm run lint)

echo "Building functions bundle..."
(cd "$PRUNED_FUNCTIONS_DIR" && npm run build)

PATH="$PRUNED_FUNCTIONS_DIR/node_modules/.bin:$PATH"
export PATH

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found after installing workspace dependencies." >&2
  exit 1
fi

echo "Deploying from pruned workspace at $PRUNED_FIREBASE_DIR"
(cd "$PRUNED_FIREBASE_DIR" && firebase deploy --only functions,firestore,storage --project "$ENVIRONMENT")
