#!/usr/bin/env bash

# Kill all processes running on Firebase emulator ports

# Firebase emulator ports from firebase.json
PORTS=(9099 5001 8760 4000 9199 9000 1421)

echo "Killing processes on Firebase emulator ports..."

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti :$PORT)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "  ✓ Successfully killed process on port $PORT"
    else
      echo "  ✗ Failed to kill process on port $PORT"
    fi
  else
    echo "  - No process found on port $PORT"
  fi
done

echo "Done!"