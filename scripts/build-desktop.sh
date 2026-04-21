#!/usr/bin/env bash
set -uo pipefail

FLAVOR="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

case "$FLAVOR" in
    dev|prod|local|enterprise|enterprise-dev) ;;
    *) echo "Unknown flavor: $FLAVOR. Must be one of: dev, prod, local, enterprise, enterprise-dev" >&2; exit 1 ;;
esac

export FLAVOR
export VITE_FLAVOR="$FLAVOR"

case "$FLAVOR" in
    prod|enterprise)
        export VOQUILL_GOOGLE_CLIENT_ID="777461284594-dhgao2eek53ppl4o188ik2i9cigdcmnp.apps.googleusercontent.com"
        export VOQUILL_GOOGLE_CLIENT_SECRET="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"
        ;;
    *)
        export VOQUILL_GOOGLE_CLIENT_ID="778214168359-nbgt0dedeol36gl425o5nqt5kaksh38u.apps.googleusercontent.com"
        export VOQUILL_GOOGLE_CLIENT_SECRET="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"
        ;;
esac

echo "Building desktop app (flavor=$FLAVOR)..."

# Run the build - ignore exit code since bundling/signing may fail even though the exe builds fine
pnpm --filter desktop run tauri -- build --no-bundle --config "src-tauri/tauri.${FLAVOR}.conf.json" || true

# Find the built executable
EXE=""
for dir in \
    "apps/desktop/src-tauri/target/release" \
    "apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release" \
    "apps/desktop/src-tauri/target/x86_64-unknown-linux-gnu/release" \
    "apps/desktop/src-tauri/target/aarch64-apple-darwin/release" \
    "apps/desktop/src-tauri/target/x86_64-apple-darwin/release" \
    "apps/desktop/src-tauri/target/universal-apple-darwin/release"
do
    if [ -d "$dir" ]; then
        found=$(find "$dir" -maxdepth 1 -type f \( -name "Voquill*" -o -name "voquill*" \) \
            ! -name "*transcription*" -perm -u+x 2>/dev/null | head -1)
        if [ -n "$found" ]; then
            EXE="$found"
            break
        fi
    fi
done

echo ""
if [ -n "$EXE" ]; then
    EXE_ABS="$(cd "$(dirname "$EXE")" && pwd)/$(basename "$EXE")"
    echo "Build complete!"
    echo ""
    echo "  EXE: $EXE_ABS"
    echo ""
    echo "  Run: \"$EXE_ABS\""
else
    echo "Build failed - no exe found" >&2
    exit 1
fi
