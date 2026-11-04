#!/usr/bin/env bash
# Copies the bundle's files into the reinterp worktree. Never overwrites: existing files are reported.
# usage: ./install.sh /Users/sergiogalvaoroxo/update-available-reinterp
set -euo pipefail
TARGET="${1:?usage: ./install.sh /path/to/update-available-reinterp}"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -d "$TARGET/docs" ] || { echo "No docs/ folder in $TARGET - wrong path?"; exit 1; }
cd "$HERE/files"
find . -type f | sort | while read -r f; do
  dest="$TARGET/${f#./}"
  if [ -e "$dest" ]; then
    if cmp -s "$f" "$dest"; then echo "same:     ${f#./}"; else echo "SKIPPED (exists, differs): ${f#./}"; fi
  else
    mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"; echo "added:    ${f#./}"
  fi
done
echo "Done. Review with: git -C \"$TARGET\" status --short"
