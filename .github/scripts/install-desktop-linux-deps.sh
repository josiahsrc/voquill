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
  libgtk-4-dev \
  libgraphene-1.0-dev \
  meson \
  ninja-build \
  patchelf \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  libfuse2 \
  wtype \
  rpm

# Build gtk4-layer-shell from source (not packaged on Ubuntu 22.04/24.04)
GTK4_LAYER_SHELL_DIR="$(mktemp -d)"
git clone --depth 1 https://github.com/wmww/gtk4-layer-shell.git "$GTK4_LAYER_SHELL_DIR"
cd "$GTK4_LAYER_SHELL_DIR"
meson setup build -Dvapi=false -Dtests=false -Dexamples=false -Ddocs=false -Dintrospection=false
ninja -C build
sudo ninja -C build install
sudo ldconfig
cd -
rm -rf "$GTK4_LAYER_SHELL_DIR"
echo "Built and installed gtk4-layer-shell from source"
