#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
cargo build --quiet 2>&1

(
  sleep 0.5
  echo '{"type":"phase","phase":"recording"}'

  # Simulate audio levels for 6 seconds
  for i in $(seq 1 90); do
    a=$(awk "BEGIN{printf \"%.2f\", 0.3 + 0.5 * sin($i * 0.15)}")
    b=$(awk "BEGIN{printf \"%.2f\", 0.5 + 0.4 * sin($i * 0.2 + 1)}")
    c=$(awk "BEGIN{printf \"%.2f\", 0.4 + 0.3 * sin($i * 0.25 + 2)}")
    echo "{\"type\":\"levels\",\"levels\":[$a,$b,$c]}"
    sleep 0.066
  done

  # Switch to loading for 5 seconds
  echo '{"type":"phase","phase":"loading"}'
  sleep 5

  # Back to idle for 4 seconds
  echo '{"type":"phase","phase":"idle"}'
  sleep 4

  # Second burst of recording for 4 seconds
  echo '{"type":"phase","phase":"recording"}'
  for i in $(seq 1 60); do
    a=$(awk "BEGIN{printf \"%.2f\", 0.2 + 0.7 * sin($i * 0.3)}")
    b=$(awk "BEGIN{printf \"%.2f\", 0.6 + 0.3 * sin($i * 0.4 + 0.5)}")
    echo "{\"type\":\"levels\",\"levels\":[$a,$b]}"
    sleep 0.066
  done

  echo '{"type":"phase","phase":"idle"}'
  sleep 1
  echo '{"type":"quit"}'
) | cargo run --quiet
