#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Dependencies are missing. Run setup-live-ai-mac.command first."
  read -p "Press Enter to close..."
  exit 1
fi
if [ ! -f .env ]; then
  echo ".env is missing. Run setup-live-ai-mac.command first."
  read -p "Press Enter to close..."
  exit 1
fi
PORT_VALUE=$(grep '^PORT=' .env | tail -1 | cut -d= -f2)
PORT_VALUE=${PORT_VALUE:-8765}
(sleep 1; open "http://localhost:${PORT_VALUE}" 2>/dev/null || true) &
npm start
