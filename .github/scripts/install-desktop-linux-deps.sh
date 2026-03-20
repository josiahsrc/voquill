#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update

if apt-cache show libwebkit2gtk-4.1-dev >/dev/null 2>&1; then
  webkit_pkg="libwebkit2gtk-4.1-dev"
else
  webkit_pkg="libwebkit2gtk-4.0-dev"
fi

sudo apt-get install -y \
  build-essential \
  pkg-config \
  cmake \
  libgtk-3-dev \
  "${webkit_pkg}" \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libasound2-dev \
  libunwind-dev \
  libxdo-dev \
  libgtk-layer-shell-dev \
  patchelf \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  libfuse2 \
  wtype

# Bundle wtype binary for Tauri resources
WTYPE_BIN="$(which wtype)"
RESOURCES_DIR="$(dirname "$0")/../../apps/desktop/src-tauri/resources/linux"
mkdir -p "$RESOURCES_DIR"
cp "$WTYPE_BIN" "$RESOURCES_DIR/wtype"
chmod +x "$RESOURCES_DIR/wtype"
echo "Bundled wtype from ${WTYPE_BIN} to ${RESOURCES_DIR}/wtype"
