#!/bin/bash
set -euo pipefail

PART="${1:-patch}"
PUBSPEC="$(dirname "$0")/pubspec.yaml"

CURRENT=$(grep '^version:' "$PUBSPEC" | awk '{print $2}')
VERSION="${CURRENT%%+*}"
BUILD="${CURRENT#*+}"

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

case "$PART" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]"; exit 1 ;;
esac

BUILD=$((BUILD + 1))
NEW="${MAJOR}.${MINOR}.${PATCH}+${BUILD}"

sed -i '' "s/^version: .*/version: ${NEW}/" "$PUBSPEC"
echo "${CURRENT} -> ${NEW}"
