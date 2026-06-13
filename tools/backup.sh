#!/usr/bin/env bash
#
# backup.sh — make a compact, timestamped backup of the whole project.
#
# What it does:
#   • bundles the entire project folder (source, data, docs, AND git history)
#   • LEAVES OUT node_modules and dist (regenerable with `npm install` /
#     `npm run build`) so the file stays tiny — a few hundred KB, not 160 MB
#   • verifies the archive isn't corrupt before reporting success
#
# Usage (from anywhere):
#   bash /Users/sergiogalvaoroxo/update-available/tools/backup.sh
# or, if you're inside the project folder:
#   bash tools/backup.sh
#
# Backups land in:  ~/Backups/update-available/
# To restore one, see docs/BACKUP_AND_RESTORE.md
#
set -euo pipefail

# --- resolve paths (works no matter where you run it from) ---------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_NAME="$(basename "$REPO_DIR")"
PARENT_DIR="$(dirname "$REPO_DIR")"

DEST_DIR="${BACKUP_DIR:-$HOME/Backups/$REPO_NAME}"
STAMP="$(date +%Y-%m-%d_%H%M)"
ARCHIVE="$DEST_DIR/${REPO_NAME}_${STAMP}.tar.gz"

mkdir -p "$DEST_DIR"

echo "Backing up: $REPO_DIR"
echo "        →   $ARCHIVE"
echo

# --- create the archive (run from the parent so paths are tidy) ----------
tar \
  --exclude="$REPO_NAME/node_modules" \
  --exclude="$REPO_NAME/dist" \
  --exclude=".DS_Store" \
  -czf "$ARCHIVE" \
  -C "$PARENT_DIR" "$REPO_NAME"

# --- verify it isn't corrupt ---------------------------------------------
if gzip -t "$ARCHIVE"; then
  SIZE="$(du -h "$ARCHIVE" | cut -f1)"
  FILES="$(tar -tzf "$ARCHIVE" | wc -l | tr -d ' ')"
  echo
  echo "✓ Backup OK — $SIZE, $FILES files."
  echo
  echo "Recent backups:"
  ls -1t "$DEST_DIR" | head -5 | sed 's/^/    /'
else
  echo "✗ Archive failed its integrity check — do NOT trust it." >&2
  exit 1
fi
