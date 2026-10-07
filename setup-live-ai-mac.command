#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the current LTS version from nodejs.org, then run this file again."
  read -p "Press Enter to close..."
  exit 1
fi

npm install

if [ ! -f .env ]; then
  cp .env.example .env
fi

open -e .env 2>/dev/null || true

echo
echo "Setup complete. Add your OpenAI and/or Twilio settings to .env, save it, then run the relevant start file."
read -p "Press Enter to close..."
