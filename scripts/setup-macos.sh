#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${VOQUILL_DEBUG_SETUP:-}" == "1" ]]; then
  set -x
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BOLD}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ERRORS=()

# --- Xcode Command Line Tools ---
info "Checking for Xcode Command Line Tools..."
if xcode-select -p >/dev/null 2>&1; then
  ok "Xcode Command Line Tools installed."
else
  info "Installing Xcode Command Line Tools..."
  xcode-select --install 2>/dev/null || true
  echo "    Please complete the Xcode CLT installation dialog, then re-run this script."
  exit 1
fi

# --- clang ---
if command_exists clang; then
  ok "clang found: $(clang --version | head -1)"
else
  ERRORS+=("clang is missing. It should be provided by Xcode Command Line Tools.")
fi

# --- Homebrew ---
info "Checking for Homebrew..."
if command_exists brew; then
  ok "Homebrew found."
else
  info "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  if ! command_exists brew; then
    ERRORS+=("Homebrew installation failed. Install manually: https://brew.sh")
  fi
fi

# --- cmake (needed by whisper-rs) ---
info "Checking for cmake..."
if command_exists cmake; then
  ok "cmake found: $(cmake --version | head -1)"
else
  if command_exists brew; then
    info "Installing cmake via Homebrew..."
    brew install cmake
    ok "cmake installed."
  else
    ERRORS+=("cmake is missing. Install it with: brew install cmake")
  fi
fi

# --- pkg-config ---
info "Checking for pkg-config..."
if command_exists pkg-config; then
  ok "pkg-config found."
else
  if command_exists brew; then
    info "Installing pkg-config via Homebrew..."
    brew install pkg-config
    ok "pkg-config installed."
  else
    ERRORS+=("pkg-config is missing. Install it with: brew install pkg-config")
  fi
fi

# --- Node.js ---
info "Checking for Node.js..."
if command_exists node; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node.js v${NODE_VERSION} found."
  else
    ERRORS+=("Node.js v${NODE_VERSION} found but v18+ is required. Update via https://nodejs.org or nvm.")
  fi
else
  ERRORS+=("Node.js is not installed. Install v18+ from https://nodejs.org or via nvm.")
fi

# --- pnpm ---
info "Checking for pnpm..."
if command_exists pnpm; then
  ok "pnpm found: $(pnpm --version)"
else
  if command_exists corepack; then
    info "Enabling pnpm via corepack..."
    corepack enable
    corepack prepare pnpm@latest --activate
    if command_exists pnpm; then
      ok "pnpm enabled via corepack."
    else
      ERRORS+=("Failed to enable pnpm via corepack. Install manually: https://pnpm.io/installation")
    fi
  else
    ERRORS+=("pnpm is not installed. Install it with: npm install -g pnpm")
  fi
fi

# --- Rust toolchain ---
info "Checking for Rust toolchain..."
if command_exists rustup && command_exists cargo; then
  ok "Rust toolchain found: $(rustc --version)"
else
  if command_exists rustup; then
    info "rustup found but cargo missing. Installing default toolchain..."
    rustup default stable
  else
    info "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "${HOME}/.cargo/env"
  fi
  if command_exists cargo; then
    ok "Rust toolchain installed: $(rustc --version)"
  else
    ERRORS+=("Rust installation failed. Install manually: https://rustup.rs")
  fi
fi

# --- Bail if any checks failed ---
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo ""
  error "Setup cannot continue. Please fix the following:"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}•${NC} $err"
  done
  exit 1
fi

echo ""
info "All prerequisites satisfied. Installing dependencies..."

# --- pnpm install ---
pnpm install

# --- Build all packages ---
info "Building all packages..."
pnpm run build

echo ""
ok "Setup complete! You can now start the desktop app with:"
echo "   ./scripts/start-desktop.sh"
