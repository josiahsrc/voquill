#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

TYPE=${1-build}

if [ "$TYPE" = "watch" ]; then
    echo "Starting build_runner watch mode with auto-retry..."
    while true; do
        if dart run build_runner $TYPE --delete-conflicting-outputs; then
            echo "build_runner exited successfully"
            break
        else
            echo "build_runner failed, retrying in 5 seconds..."
            sleep 5
        fi
    done
else
    dart run build_runner $TYPE --delete-conflicting-outputs
fi
