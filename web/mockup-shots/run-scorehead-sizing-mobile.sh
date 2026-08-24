#!/bin/bash
exec > /tmp/shot-scorehead-sizing-mobile.log 2>&1
set +e

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

WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WEB_DIR" || exit 9
mkdir -p mockup-shots
rm -f mockup-shots/scorehead-sizing-*.png
rm -rf /tmp/chrome-sh-prof /tmp/chrome-sh.log

FILE_URL="file://$WEB_DIR/public/live-fixture-scorehead-sizing-mobile.html"
PORT=9236

"$CHROME" --headless=new --remote-debugging-port=$PORT --hide-scrollbars --no-sandbox \
  --user-data-dir=/tmp/chrome-sh-prof --window-size=1400,2400 \
  --force-device-scale-factor=2 \
  "$FILE_URL" > /tmp/chrome-sh.log 2>&1 &
CHROME_PID=$!

WS=""
for i in $(seq 1 40); do
  WS=$(grep -oE "ws://[^/]+/devtools/browser/[A-Za-z0-9_-]+" /tmp/chrome-sh.log | tail -1)
  [ -n "$WS" ] && break
  sleep 0.3
done
# DevTools may bind to IPv6 ([::1]); normalise so Node's WebSocket can connect.
WS="${WS/\[::1\]/127.0.0.1}"

node mockup-shots/shoot-scorehead-sizing-mobile.mjs "$WS" "$FILE_URL" "$WEB_DIR/mockup-shots"
kill "$CHROME_PID" 2>/dev/null
ls -la mockup-shots/scorehead-sizing-*.png 2>/dev/null
echo "ALLDONE"
