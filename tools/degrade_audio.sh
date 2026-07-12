#!/usr/bin/env bash
#
# degrade_audio.sh — the VHS/cassette degradation pass (R28-2 audio production
# guide §4: "the great equalizer"). PRODUCTION TOOL ONLY — this never runs at
# runtime; it is a local, offline ffmpeg pass you run once per source file and
# commit the result. No network calls, nothing invoked by the app.
#
# Doctrine (binding, per docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md §4
# and the Session 32 brief): SYSTEM audio (jingles/VO as heard on-screen at
# their native era) stays clean; HUMAN/TAPE audio (anything heard as coming
# off a physical cassette — the Era-1 tape system, src/narrative/tapes.ts)
# ALWAYS goes through this pass first. Two presets, tuned to read as two
# different eras of consumer tape:
#
#   --tape97   1990s cassette recorder: narrow band (~80 Hz–8 kHz), a touch of
#              cassette wow (slow pitch wobble), a soft hiss floor mixed
#              under, gentle saturation/compression ("volume ride").
#   --vhs03    slightly later consumer tape deck, wider band (~40 Hz–10 kHz),
#              less wow, plus a faint 50 Hz mains-hum tinge (this project's
#              home institution is European — 50 Hz, not 60 Hz) alongside its
#              own hiss floor.
#
# USAGE
#   tools/degrade_audio.sh --tape97 IN.mp3 OUT.mp3
#   tools/degrade_audio.sh --vhs03  IN.mp3 OUT.mp3
#   tools/degrade_audio.sh --tape97 IN.mp3 OUT.mp3 --wrap
#
#   --wrap   bookends the degraded audio with a short "tuning across the
#            dial" static burst at the head and tail — for anything that
#            should read as TAPED OFF A BROADCAST (e.g. Tape B, the '97
#            radio spot) rather than a direct room recording. Adds ~1.3s at
#            the head and ~1.0s at the tail (both band-matched to the chosen
#            preset), so downstream caption timings should shift by the
#            head amount (see the tool's stdout, which prints the exact
#            offset applied).
#
# OUTPUT is always a 128kbps mono-safe MP3 (libmp3lame). Re-run any time a
# source file changes — this is idempotent and cheap; never hand-edit the
# output.
#
# Examples used in Session 32 (R28-2b-ii):
#   tools/degrade_audio.sh --tape97 assets/audio/family_design_solutions.mp3 \
#     assets/audio/family_design_solutions_tape97.mp3
#   tools/degrade_audio.sh --tape97 assets/audio/discover_the_new_you.mp3 \
#     assets/audio/discover_the_new_you_tape97_radio.mp3 --wrap
#   tools/degrade_audio.sh --tape97 assets/audio/fold_my_hands.mp3 \
#     assets/audio/fold_my_hands_tape97.mp3

set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: $0 --tape97|--vhs03 IN OUT [--wrap]" >&2
  exit 1
fi

PRESET="$1"
IN="$2"
OUT="$3"
WRAP=0
if [[ "${4:-}" == "--wrap" ]]; then
  WRAP=1
fi

if [[ ! -f "$IN" ]]; then
  echo "error: input file not found: $IN" >&2
  exit 1
fi

command -v ffmpeg >/dev/null 2>&1 || { echo "error: ffmpeg not found on PATH" >&2; exit 1; }

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

case "$PRESET" in
  --tape97)
    HP=80; LP=8000
    VIBRATO="vibrato=f=0.6:d=0.012"
    SATURATE="asoftclip=type=tanh:param=0.7"
    HISS_COLOR="pink"; HISS_AMP=0.022; HISS_WEIGHT=0.40
    HUM_WEIGHT=0
    ;;
  --vhs03)
    HP=40; LP=10000
    VIBRATO="vibrato=f=0.35:d=0.006"
    SATURATE="asoftclip=type=tanh:param=0.45"
    HISS_COLOR="white"; HISS_AMP=0.012; HISS_WEIGHT=0.30
    HUM_WEIGHT=0.5
    ;;
  *)
    echo "error: unknown preset $PRESET (use --tape97 or --vhs03)" >&2
    exit 1
    ;;
esac

COMPAND="compand=attacks=0.01:decays=0.2:points=-80/-80|-40/-30|-20/-15|-5/-8|0/-6:soft-knee=6"
VOICE_CHAIN="highpass=f=${HP},lowpass=f=${LP},${VIBRATO},${COMPAND},${SATURATE}"

degrade_core() {
  local in="$1" out="$2"
  if [[ "$HUM_WEIGHT" == "0" ]]; then
    ffmpeg -y -loglevel error -i "$in" \
      -f lavfi -i "anoisesrc=color=${HISS_COLOR}:amplitude=${HISS_AMP}" \
      -filter_complex "[0:a]${VOICE_CHAIN}[voice];[1:a]highpass=f=${HP},lowpass=f=${LP}[hiss];[voice][hiss]amix=inputs=2:duration=first:weights=1 ${HISS_WEIGHT}:normalize=0,alimiter=limit=0.95[out]" \
      -map "[out]" -c:a libmp3lame -q:a 3 "$out"
  else
    ffmpeg -y -loglevel error -i "$in" \
      -f lavfi -i "anoisesrc=color=${HISS_COLOR}:amplitude=${HISS_AMP}" \
      -f lavfi -i "sine=frequency=50:sample_rate=44100" \
      -filter_complex "[0:a]${VOICE_CHAIN}[voice];[1:a]highpass=f=${HP},lowpass=f=${LP}[hiss];[2:a]volume=0.05[hum];[voice][hiss][hum]amix=inputs=3:duration=first:weights=1 ${HISS_WEIGHT} ${HUM_WEIGHT}:normalize=0,alimiter=limit=0.95[out]" \
      -map "[out]" -c:a libmp3lame -q:a 3 "$out"
  fi
}

if [[ "$WRAP" -eq 0 ]]; then
  degrade_core "$IN" "$OUT"
  echo "degraded ($PRESET): $OUT"
else
  CORE="$TMPDIR/core.mp3"
  degrade_core "$IN" "$CORE"

  TUNE_IN_DUR=1.3
  TUNE_OUT_DUR=1.0
  TUNE_IN="$TMPDIR/tune_in.mp3"
  TUNE_OUT="$TMPDIR/tune_out.mp3"

  # "tuning across the dial": banded noise with a fast tremolo (station
  # seeking chatter), fading in/out at its own edges so the concat seam
  # is click-free.
  TUNE_IN_FADE_ST="$(awk "BEGIN { printf \"%.3f\", ${TUNE_IN_DUR} - 0.25 }")"
  TUNE_OUT_FADE_ST="$(awk "BEGIN { printf \"%.3f\", ${TUNE_OUT_DUR} - 0.25 }")"

  ffmpeg -y -loglevel error \
    -f lavfi -i "anoisesrc=color=white:amplitude=0.55:duration=${TUNE_IN_DUR}" \
    -filter_complex "tremolo=f=9:d=0.85,highpass=f=${HP},lowpass=f=${LP},afade=t=in:st=0:d=0.08,afade=t=out:st=${TUNE_IN_FADE_ST}:d=0.25" \
    -c:a libmp3lame -q:a 3 "$TUNE_IN"

  ffmpeg -y -loglevel error \
    -f lavfi -i "anoisesrc=color=white:amplitude=0.55:duration=${TUNE_OUT_DUR}" \
    -filter_complex "tremolo=f=9:d=0.85,highpass=f=${HP},lowpass=f=${LP},afade=t=in:st=0:d=0.08,afade=t=out:st=${TUNE_OUT_FADE_ST}:d=0.25" \
    -c:a libmp3lame -q:a 3 "$TUNE_OUT"

  ffmpeg -y -loglevel error -i "$TUNE_IN" -i "$CORE" -i "$TUNE_OUT" \
    -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]" \
    -map "[out]" -c:a libmp3lame -q:a 3 "$OUT"

  echo "degraded+wrapped ($PRESET): $OUT (head offset ${TUNE_IN_DUR}s, tail static ${TUNE_OUT_DUR}s)"
fi
