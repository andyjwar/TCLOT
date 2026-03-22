#!/usr/bin/env bash
# Push main to every league-site remote (canonical TCLOT + satellites).
set -euo pipefail
cd "$(dirname "$0")/.."
git push origin main
git push exfos main
git push my-league main
git push spoons main
