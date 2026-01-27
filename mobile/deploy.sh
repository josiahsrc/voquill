#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

# Bump the build number in pubspec.yaml
current_version=$(grep '^version:' pubspec.yaml | sed 's/version: //')
base_version=$(echo "$current_version" | cut -d'+' -f1)
build_number=$(echo "$current_version" | cut -d'+' -f2)

# Parse major.minor.patch
major=$(echo "$base_version" | cut -d'.' -f1)
minor=$(echo "$base_version" | cut -d'.' -f2)
patch=$(echo "$base_version" | cut -d'.' -f3)

# Increment patch and build number
new_patch=$((patch + 1))
new_build_number=$((build_number + 1))
new_version="${major}.${minor}.${new_patch}+${new_build_number}"
sed -i '' "s/^version: .*/version: ${new_version}/" pubspec.yaml
echo "Bumped version from $current_version to $new_version"

fvm flutter pub get
fvm flutter build ipa
cd ./build/ios/archive/

xcodebuild -exportArchive \
  -archivePath Runner.xcarchive \
  -exportOptionsPlist ../../../ios/ExportOptions.plist \
  -exportPath ./export \
  -allowProvisioningUpdates
