#!/usr/bin/env bash
set -euo pipefail

if [[ "${VOQUILL_DEBUG_SETUP:-}" == "1" ]]; then
  set -x
fi

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ensure_prereq() {
  local name=$1
  local install_hint=$2
  if ! command_exists "$name"; then
    echo "[ERROR] Missing prerequisite: $name" >&2
    echo "        Install hint: $install_hint" >&2
    exit 1
  fi
}

ensure_prereq "node" "https://nodejs.org/en/download/package-manager"
ensure_prereq "npm" "https://nodejs.org/en/download/package-manager"
ensure_prereq "cargo" "https://rustup.rs/"

install_with_apt() {
  sudo apt-get update
  sudo apt-get install -y \
    build-essential \
    pkg-config \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libasound2-dev \
    libxkbcommon-dev \
    dbus \
    dbus-x11
}

install_with_pacman() {
  sudo pacman -Syu --needed \
    base-devel \
    pkgconf \
    gtk3 \
    webkit2gtk-4.1 \
    libappindicator-gtk3 \
    librsvg \
    alsa-lib \
    libxkbcommon \
    dbus
}

install_with_dnf() {
  sudo dnf groupinstall -y "Development Tools"
  sudo dnf install -y \
    gtk3-devel \
    webkit2gtk4.1-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    alsa-lib-devel \
    libxkbcommon-devel \
    dbus-x11
}

install_with_zypper() {
  sudo zypper refresh
  sudo zypper install -y \
    gcc \
    gcc-c++ \
    make \
    pkg-config \
    gtk3-devel \
    webkit2gtk4.1-devel \
    libappindicator3-devel \
    librsvg-devel \
    alsa-devel \
    libxkbcommon-devel \
    dbus-1
}

if command_exists apt-get; then
  install_with_apt
elif command_exists pacman; then
  install_with_pacman
elif command_exists dnf; then
  install_with_dnf
elif command_exists zypper; then
  install_with_zypper
else
  echo "[WARN] Unsupported package manager. Please install the build prerequisites manually:" >&2
  cat >&2 <<'EOF'
  - C/C++ build tools (gcc, make, pkg-config)
  - GTK 3 development headers (libgtk-3-dev / gtk3-devel)
  - webkit2gtk 4.1 development headers
  - AppIndicator3 development headers
  - librsvg development headers
  - ALSA development headers
  - libxkbcommon development headers
EOF
  exit 1
fi

echo "[OK] Linux dependencies installed. You can now run the desktop app with:"
echo "   npm run dev --workspace apps/desktop"
