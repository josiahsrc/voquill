#!/bin/bash
set -euo pipefail

BUMP_TYPE="${1:-patch}"

if [[ "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch] (default: patch)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for pkg in "$SCRIPT_DIR"/*/package.json; do
  dir="$(dirname "$pkg")"
  name="$(basename "$dir")"
  current="$(grep -o '"version": "[^"]*"' "$pkg" | head -1 | cut -d'"' -f4)"

  IFS='.' read -r major minor patch <<< "$current"

  case "$BUMP_TYPE" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
  esac

  new_version="$major.$minor.$patch"
  sed -i '' "s/\"version\": \"$current\"/\"version\": \"$new_version\"/" "$pkg"
  echo "$name: $current -> $new_version"
done
