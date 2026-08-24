#!/bin/bash
# Render web/public/live-fixture-header-cards-mobile.html and capture one PNG
# per variant into web/mockup-shots/. Portable across macOS + Linux.
exec > /tmp/shot-header-cards-mobile.log 2>&1
set +e

# Locate a Chrome/Chromium binary.
CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "$(command -v google-chrome)" \
  "$(command -v google-chrome-stable)" \
  "$(command -v chromium)" \
  "$(command -v chromium-browser)" \
  "$(command -v chrome)"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
done
[ -z "$CHROME" ] && { echo "No Chrome/Chromium found"; exit 9; }

# Resolve repo web/ dir from this script's location.
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WEB_DIR" || exit 9
mkdir -p mockup-shots
rm -f mockup-shots/header-cards-mobile-*.png
rm -rf /tmp/chrome-hc-prof /tmp/chrome-hc.log

FILE_URL="file://$WEB_DIR/public/live-fixture-header-cards-mobile.html"
PORT=9233

"$CHROME" --headless=new --remote-debugging-port=$PORT --hide-scrollbars --no-sandbox \
  --user-data-dir=/tmp/chrome-hc-prof --window-size=1700,1200 \
  --force-device-scale-factor=2 \
  "$FILE_URL" > /tmp/chrome-hc.log 2>&1 &
CHROME_PID=$!
echo "CHROME_PID=$CHROME_PID"

WS=""
for i in $(seq 1 40); do
  WS=$(grep -oE "ws://127.0.0.1:$PORT/devtools/browser/[A-Za-z0-9_-]+" /tmp/chrome-hc.log | tail -1)
  [ -n "$WS" ] && break
  sleep 0.3
done
echo "WS=$WS"

node mockup-shots/shoot-header-cards-mobile.mjs "$WS" "$FILE_URL" "$WEB_DIR/mockup-shots"
echo "NODE_EXIT=$?"
kill "$CHROME_PID" 2>/dev/null
ls -la mockup-shots/header-cards-mobile-*.png 2>/dev/null
echo "ALLDONE"
