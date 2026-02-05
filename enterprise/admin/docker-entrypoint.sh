#!/bin/sh
set -e

ENV_FILE="$1"

cat > "$ENV_FILE" << EOF
window.__VOQUILL__ = {
  VOQUILL_GATEWAY_URL: "${VOQUILL_GATEWAY_URL:-}",
  VOQUILL_APP_NAME: "${VOQUILL_APP_NAME:-}",
};
EOF

shift
exec "$@"
