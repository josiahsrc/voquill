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
  patchelf \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  libfuse2
