#!/bin/bash

EXPORT_DIR=./data/$SAVE_ID

loopPid=0
firebasePid=0
functionsPid=0

sigterm_handler() {
  # firebase export on exit doesn't work, so we do it manually
  echo "exporting data"
  firebase emulators:export $EXPORT_DIR --project $EMULATED_PROJECT_ID
  
  # kill firebase emulators
  pkill -P "$functionsPid"
  pkill -P "$firebasePid"
  wait "$functionsPid"
  wait "$firebasePid"
  echo "sigterm handled gracefully"
  exit 0;
}
trap 'sigterm_handler' SIGTERM

sigint_handler() {
  wait "$functionsPid"
  wait "$firebasePid"
  wait "$loopPid"
  echo "sigint handled gracefully"
  exit 0;
}
trap 'sigint_handler' SIGINT

echo "searching for functions endpoint"
echo "using NGROK_ENDPOINT: $NGROK_ENDPOINT"
SILENT="false" ./get-ngrok-endpoint.sh
export FUNCTIONS_ENDPOINT=$(./get-ngrok-endpoint.sh)
echo "found FUNCTIONS_ENDPOINT: $FUNCTIONS_ENDPOINT"

exec firebase emulators:start \
  --project $EMULATED_PROJECT_ID \
  --import $EXPORT_DIR \
  --export-on-exit &
firebasePid="$!"

cd functions
exec npm run watch &
functionsPid="$!"
cd ../

# wait on the loop forever
tail -f /dev/null &
loopPid="$!"
wait "$loopPid"

echo "Not a gracefully shutdown"
exit 1;
