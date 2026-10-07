#!/bin/bash
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:$PORT"
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) &
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  (sleep 1; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) &
  python -m http.server "$PORT"
else
  echo "Python is required. You can still open index.html directly."
  read -p "Press Enter to close..."
fi
