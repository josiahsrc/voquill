#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm exec turbo run dev $@
