#!/usr/bin/env bash
# tools/tts/publish_mp3.sh — the step AFTER tools/tts/render.py.
#
# WHAT THIS IS. render.py writes 16-bit 44.1 kHz mono WAV, which is the right
# thing for it to write: it is the master, it is lossless, and it is what a
# re-master or a re-cut would want. It is NOT what should be fetched over a
# gallery's wifi at the moment a character starts talking. L's forty-seven lines
# are 23 MB as WAV and 2 MB as MP3, and every one of them is fetched on demand,
# mid-scene, while a caption is already on screen waiting for it.
#
# So: the WAV is the ARCHIVE and lives in assets/audio/ (this repo's established
# masters directory — the same split tools/degrade_audio.sh already keeps, where
# assets/audio/ holds the pristine file and only the shipped one goes to public/).
# The MP3 is what ships, in public/assets/audio/.
#
# ⚑ AFTER RUNNING THIS, THREE THINGS MUST AGREE or the clip is silent:
#   1. the `audio` names in data/dialog/*.json  →  .mp3
#   2. src/audio/tapeAudio.ts's REGISTRY        →  .mp3
#   3. the file in public/assets/audio/         →  .mp3
# An unregistered name is never requested — no error, no 404 — so a half-done
# rename looks exactly like having rendered nothing. (S102 learned this twice.)
#
# USAGE
#   bash tools/tts/publish_mp3.sh 'l_*'      # a glob of stems in public/assets/audio
#   bash tools/tts/publish_mp3.sh            # every .wav in public/assets/audio
#
# 96 kbps mono: speech from a 44.1 kHz mono master, well past transparent for a
# synthesized voice, and a tenth of the bytes.
set -euo pipefail
cd "$(dirname "$0")/../.."
PUB=public/assets/audio
ARCHIVE=assets/audio
PATTERN="${1:-*}"
mkdir -p "$ARCHIVE"
shopt -s nullglob
count=0
for wav in $PUB/$PATTERN.wav; do
  base=$(basename "$wav" .wav)
  ffmpeg -loglevel error -y -i "$wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/$base.mp3"
  mv "$wav" "$ARCHIVE/$base.wav"
  printf '%-24s %8s wav → %8s mp3\n' "$base" \
    "$(du -h "$ARCHIVE/$base.wav" | cut -f1)" "$(du -h "$PUB/$base.mp3" | cut -f1)"
  count=$((count + 1))
done
echo "$count file(s). Archive: $ARCHIVE  ·  shipped: $PUB"
echo "Now repoint the data names and the tapeAudio.ts registry to .mp3 — see the header."
