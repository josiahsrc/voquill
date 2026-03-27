#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
cargo build --quiet 2>&1
cargo run --quiet
