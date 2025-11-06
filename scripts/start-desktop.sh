#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FLAVOR=${1:-dev}
if [ "${FLAVOR}" = "dev" ]; then
  VITE_FIREBASE_API_KEY="AIzaSyCJ8C3ZW2bHjerneg5i0fr-b5uwuy7uULM" \
  VITE_FIREBASE_AUTH_DOMAIN="voquill-dev.firebaseapp.com" \
  VITE_FIREBASE_PROJECT_ID="voquill-dev" \
  VITE_FIREBASE_STORAGE_BUCKET="voquill-dev.firebasestorage.app" \
  VITE_FIREBASE_MESSAGING_SENDER_ID="778214168359" \
  VITE_FIREBASE_APP_ID="1:778214168359:web:66ee2ce5df76c8c2d77b02" \
  VITE_FIREBASE_MEASUREMENT_ID="G-V6Y1RSFBQX" \
  VITE_USE_EMULATORS=false \
  VITE_FLAVOR=dev \
  VITE_STRIPE_PUBLIC_KEY="pk_test_51RlrUuIp7DaYKUgM2NNrnSAXoGGRljxaaVKOUnfMnSWaa0SaBBMn4Ix5HOygKgmDbOYTKImqvEf4k1IB8snpDcWn0006igeOH9" \
  npm run dev --workspace=apps/desktop
elif [ "${FLAVOR}" = "prod" ]; then
  VITE_FIREBASE_API_KEY="AIzaSyDlPI-o5piDSNIG39EvJZJEz0gXCGEGk-w" \
  VITE_FIREBASE_AUTH_DOMAIN="voquill-prod.firebaseapp.com" \
  VITE_FIREBASE_PROJECT_ID="voquill-prod" \
  VITE_FIREBASE_STORAGE_BUCKET="voquill-prod.firebasestorage.app" \
  VITE_FIREBASE_MESSAGING_SENDER_ID="777461284594" \
  VITE_FIREBASE_APP_ID="1:777461284594:web:d431c9557d3e02395e5a6b" \
  VITE_FIREBASE_MEASUREMENT_ID="G-LKHEH0DPND" \
  VITE_USE_EMULATORS=false \
  VITE_FLAVOR=prod \
  VITE_STRIPE_PUBLIC_KEY="pk_live_51RlrUuIp7DaYKUgM8imeVxfuYKM9ukKXYc4I4tbj465hfAF7CnIFxiKRknUK5jEhpwWulDWUWNY4pyICZBLvrAP700EuGSiz9V" \
  npm run dev --workspace=apps/desktop
else
  echo "Unknown flavor: ${FLAVOR}" >&2
  exit 1
fi
