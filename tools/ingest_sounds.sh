#!/usr/bin/env bash
# tools/ingest_sounds.sh — turn Freesound candidates into assets this piece can play.
#
# ⚑ WHY A MANIFEST AND NOT SIXTY ffmpeg LINES IN A COMMIT MESSAGE. Every sound
# here is trimmed, levelled and renamed, and every one of those numbers is a
# judgement that will need revisiting when somebody listens. `data/audio/ingest.tsv`
# holds them where they can be read and argued with; this script is just the
# machine that applies them. Change a number, re-run, done.
#
# ⚑ AND IT RE-RUNS AGAINST BETTER SOURCES. A Freesound API token gives only the
# lossy ~128 kbps PREVIEW (originals need OAuth2). Everything produced from
# `.audition/` is therefore provisional: good enough to place a sound in a beat
# and hear whether it belongs, not good enough to ship a 60 s bed. When the
# originals are downloaded into `.originals/<id>.<ext>`, this script prefers them
# automatically and the same manifest yields the shipping masters.
#
# THE THREE NUMBERS PER ROW, and why each exists:
#   trim_start/dur  — most of these files are mostly silence. 553093 is a 5.0 s
#                     file with 1.08 s of sound in it; 209362 does not begin until
#                     0.63 s. Untrimmed, a "notification" is a notification
#                     followed by four seconds of nothing, and the beat waits.
#   target_rms      — the family has to sit at ONE level or the quiet ones are
#                     inaudible and the loud ones are the loudest thing in the
#                     piece. Targets match tools/make_tones.sh: one-shots -18..-26
#                     dBFS RMS over a -32 dBFS bed. Several previews also CLIP
#                     (476526 peaks at +6 dBFS), so every row gets headroom.
#
# Usage: bash tools/ingest_sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/audio; PUB=public/assets/audio; mkdir -p "$OUT" "$PUB"
made=0
while IFS=$'\t' read -r id name start dur rms extra note; do
  [[ "$id" =~ ^# ]] && continue
  [[ -z "${id:-}" ]] && continue
  src=""
  for cand in .originals/$id.*; do [[ -e "$cand" ]] && src="$cand"; done
  prov="ORIGINAL"
  if [[ -z "$src" ]]; then
    src=$(ls .audition/${id}_*.mp3 2>/dev/null | head -1 || true)
    prov="preview"
  fi
  if [[ -z "$src" ]]; then echo "⚑ MISSING source for $id ($name) — run: node tools/freesound.mjs audition $id"; continue; fi
  # ⚑ printf, not bare bc: bc prints ".54" for 0.54 and ffmpeg refuses a duration
  #   with no leading digit. One character, one failed ingest.
  fade_at=$(printf '%.3f' "$(echo "$dur - 0.06" | bc -l)")
  chain="afade=t=in:st=0:d=0.01,afade=t=out:st=${fade_at}:d=0.06"
  [[ "$extra" != "-" ]] && chain="$extra,$chain"
  # two passes: trim+filter, then measure and hit the target level exactly
  ffmpeg -v error -y -ss "$start" -t "$dur" -i "$src" -ac 1 -ar 44100 -af "$chain" "$OUT/.tmp_$name.wav"
  # ⚑ measured, not parsed out of astats. ffmpeg reports RMS on stderr at info
  #   level and in a format that has moved between releases; decoding the file
  #   and taking the number ourselves is three lines and cannot drift.
  cur=$(ffmpeg -v error -i "$OUT/.tmp_$name.wav" -ac 1 -ar 22050 -f f32le - 2>/dev/null | .venv/bin/python -c "
import sys,numpy as np
x=np.frombuffer(sys.stdin.buffer.read(),dtype=np.float32)
print(f'{20*np.log10(np.sqrt((x**2).mean())+1e-12):.2f}')")
  gain=$(echo "$rms - ($cur)" | bc -l)
  ffmpeg -v error -y -i "$OUT/.tmp_$name.wav" -af "volume=${gain}dB,alimiter=limit=0.7:level=disabled" "$OUT/$name.wav"
  rm -f "$OUT/.tmp_$name.wav"
  ffmpeg -v error -y -i "$OUT/$name.wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/$name.mp3"
  printf '  %-22s %5ss  from #%-7s %-8s  %s\n' "$name" "$dur" "$id" "$prov" "$note"
  made=$((made+1))
done < data/audio/ingest.tsv
echo "$made ingested. ⚑ Anything marked 'preview' is provisional — see this file's header."
