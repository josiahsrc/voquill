#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Generating @voquill/desktop-native-apis bindings..."

cargo run --manifest-path apps/desktop/src-tauri/Cargo.toml --bin gen_bindings
