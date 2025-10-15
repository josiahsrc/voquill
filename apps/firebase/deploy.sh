#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

ENVIRONMENT=${1:-"prod"}
echo "Deploying to environment: $ENVIRONMENT"

cd functions
npm run build
cd ..

firebase deploy --only functions,firestore,storage --project "$ENVIRONMENT"

cd ..
./party.sh "Deployment complete"
