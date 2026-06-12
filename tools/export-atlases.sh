#!/usr/bin/env bash
# Aseprite → spritesheet+JSON pipeline (BUILDING_GUIDE §2.3).
# Author .aseprite files in assets/aseprite/ (committed — they are the
# design record); this exports PNG+JSON atlases into assets/atlases/.
set -euo pipefail
cd "$(dirname "$0")/.."

ASEPRITE_BIN="${ASEPRITE:-aseprite}"
if ! command -v "$ASEPRITE_BIN" >/dev/null 2>&1; then
  # Common macOS install location
  if [ -x "/Applications/Aseprite.app/Contents/MacOS/aseprite" ]; then
    ASEPRITE_BIN="/Applications/Aseprite.app/Contents/MacOS/aseprite"
  else
    echo "aseprite CLI not found — install Aseprite or set ASEPRITE=/path/to/aseprite" >&2
    exit 1
  fi
fi

mkdir -p assets/atlases
shopt -s nullglob
files=(assets/aseprite/*.aseprite)
if [ ${#files[@]} -eq 0 ]; then
  echo "no .aseprite files in assets/aseprite/ yet — nothing to export"
  exit 0
fi

for f in "${files[@]}"; do
  name="$(basename "$f" .aseprite)"
  "$ASEPRITE_BIN" -b "$f" \
    --sheet-pack \
    --data "assets/atlases/${name}.json" \
    --format json-array \
    --sheet "assets/atlases/${name}.png"
  echo "exported ${name}"
done
