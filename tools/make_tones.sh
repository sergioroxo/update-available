#!/usr/bin/env bash
# tools/make_tones.sh — THE SOUNDS THIS PIECE MAKES ITSELF.
#
# ⚑ WHY SYNTHESIZE RATHER THAN SOURCE. Two reasons, and neither is convenience.
#   1. LICENCE. Every found sound needs a row in assets/LICENSES.md and, if
#      CC-BY, an attributions entry. A sound we generate needs neither, and it
#      cannot be withdrawn, relicensed, or turn out to be someone's uploaded rip.
#   2. ⚑ AND THE LAW: no real OS sounds. Microsoft's chords and Apple's chime are
#      copyrighted works, and "an error ding" is exactly the kind of thing that
#      gets lifted by accident. Every ding, chime and tick below is a sine pair
#      this file describes in full — it is OURS, and it is auditable as ours.
#
# The room tones are here for the same reason: filtered noise with a couple of
# resonant peaks IS a fan, an HVAC duct, a fridge through a wall. What it does
# not give you is a bird, a door, a photocopier — those are real recordings and
# the shortlist doc covers them. What is here is the FLOOR each era stands on.
#
# ⚑ Every file lands in assets/audio/ as a WAV master. Publishing to mp3 and
# registering the name is a separate, deliberate step (tools/tts/publish_mp3.sh
# and src/audio/tapeAudio.ts) — because a file on disk whose name is not in that
# registry is never requested, and sounds exactly like a file nobody made.
#
# Usage: bash tools/make_tones.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/audio
mkdir -p "$OUT"
q() { ffmpeg -v error -y "$@"; }

# ── ONE-SHOTS ───────────────────────────────────────────────────────────────
# 1997 · the POST beep. A PC speaker is a square wave and nothing else.
q -f lavfi -i "sine=f=1000:d=0.18" -af "aeval=sgn(val(0))*0.35,lowpass=f=6000,afade=t=out:st=0.15:d=0.03" "$OUT/post_beep_1997.wav"

# 1997 · the error ding. A two-note FALL — the era's dialogs are bad news, and a
# fall is the shape of bad news. Played once per cascade window, 420 ms apart,
# so seven of them pile up into the collapse.
q -f lavfi -i "sine=f=660:d=0.11" -f lavfi -i "sine=f=523.25:d=0.17" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,aeval=sgn(val(0))*0.30,lowpass=f=5200,afade=t=out:st=0.20:d=0.08" \
  "$OUT/err_ding_1997.wav"

# 2003 · the soundcard chime. A RISE, brighter than 1997 — the machine has a
# sound card now and it is pleased about it.
q -f lavfi -i "sine=f=880:d=0.09" -f lavfi -i "sine=f=1174.66:d=0.22" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.32,lowpass=f=9000,aecho=0.8:0.5:22:0.18,afade=t=out:st=0.16:d=0.15" \
  "$OUT/chime_2003.wav"

# 2003 · the accountability alert — ⚑ THE SAME CHIME, LOWER. Care and
# surveillance share a voice in this era; the sound design says so before any
# line does. Do not make this one uglier: that would editorialise.
q -f lavfi -i "sine=f=659.25:d=0.09" -f lavfi -i "sine=f=880:d=0.22" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.30,lowpass=f=9000,aecho=0.8:0.5:22:0.18,afade=t=out:st=0.16:d=0.15" \
  "$OUT/alert_2003.wav"

# 2016 · the polished ting. Glass, short, expensive-sounding: the era where the
# apparatus rebrands as gentleness.
q -f lavfi -i "sine=f=1567.98:d=0.5" -f lavfi -i "sine=f=2349.32:d=0.5" \
  -filter_complex "[0]volume=0.22[a];[1]volume=0.08[b];[a][b]amix=inputs=2,afade=t=out:st=0.04:d=0.44,aecho=0.9:0.4:47:0.22" \
  "$OUT/ting_2016.wav"

# 2016 · APPLY and SKIP share ONE tick. ⚑ The record files both symmetrically;
# the sound must not be warmer for the one the system prefers.
q -f lavfi -i "anoisesrc=d=0.04:c=pink:a=0.5" -af "highpass=f=900,lowpass=f=3800,afade=t=out:st=0.012:d=0.028,volume=0.5" "$OUT/tick_task.wav"

# 2026 · the headset's ready tone. One soft ascending pair, tone dial ≤ +1.
q -f lavfi -i "sine=f=523.25:d=0.28" -f lavfi -i "sine=f=783.99:d=0.42" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.20,lowpass=f=7000,afade=t=in:st=0:d=0.08,afade=t=out:st=0.42:d=0.28,aecho=0.9:0.35:120:0.2" \
  "$OUT/ready_e4.wav"

# 2026 · the device settling back on the desk. ⚑ The sound is the DESK, not the
# device — it stops, nobody takes it off her.
q -f lavfi -i "anoisesrc=d=0.14:c=brown:a=0.6" -af "lowpass=f=900,equalizer=f=180:t=q:w=1.2:g=8,afade=t=out:st=0.02:d=0.12,volume=0.55" "$OUT/set_down_e4.wav"

# ── ROOM TONE, ONE BED PER ERA — the floor each year stands on ──────────────
# 60 s, seamless by construction (steady-state noise has no seam), quiet.
bed() { # $1 out  $2 filter chain
  q -f lavfi -i "anoisesrc=d=60:c=brown:a=1" -ac 1 -ar 44100 -af "$2,loudnorm=I=-34:TP=-6" "$OUT/$1"
}
# 1997 · a beige PC at night: PSU fan (two resonances), a room asleep above it
bed bed_1997.wav "lowpass=f=1100,equalizer=f=120:t=q:w=1.4:g=10,equalizer=f=240:t=q:w=2:g=6,equalizer=f=52:t=q:w=1:g=7,tremolo=f=0.13:d=0.06"
# 2003 · the same room by day: a bigger fan, more air, less night
bed bed_2003.wav "lowpass=f=1500,equalizer=f=98:t=q:w=1.2:g=9,equalizer=f=320:t=q:w=2:g=5,highpass=f=38,tremolo=f=0.2:d=0.05"
# 2016 · open-plan HVAC: broad duct rumble, ⚑ and it is the bed that STOPS at
#   Malta — the only cue in the piece that is a silence
bed bed_2016.wav "lowpass=f=800,equalizer=f=74:t=q:w=0.9:g=12,equalizer=f=155:t=q:w=1.6:g=6,tremolo=f=0.11:d=0.09"
# 2026 · almost nothing: a laptop fan at idle, a fridge through a wall
bed bed_2026.wav "lowpass=f=700,equalizer=f=88:t=q:w=1.6:g=8,equalizer=f=1400:t=q:w=3:g=-6,highpass=f=44,tremolo=f=0.11:d=0.04"
# the PASSAGES · the building itself. ⚑ The same in every era, because the
#   building never changed — only the tenants did. That is the thesis, heard.
bed passage_building.wav "lowpass=f=520,equalizer=f=58:t=q:w=0.8:g=13,equalizer=f=116:t=q:w=1.4:g=5,tremolo=f=0.10:d=0.07"

# ── THE MIX ─────────────────────────────────────────────────────────────────
# ⚑ WRITTEN DOWN RATHER THAN EYEBALLED, because the first pass of this file made
# a family whose levels ranged over 44 dB: the 2016 ting came out at -54 dBFS
# RMS, which is 22 dB UNDER its own room tone — inaudible, and indistinguishable
# from a sound nobody made. Synthesis gives you no level for free; each chain's
# gain is whatever its filters happened to leave behind.
#
#   room tone beds ....... -32 dBFS RMS  (the floor; the bus's own quiet level)
#   one-shots ............ -18 to -26    (10-14 dB over the bed: present, not loud)
#     1997 loudest and rudest (a PC speaker IS rude); 2026 softest (tone dial <= +1)
#
# The synthesis above is deterministic, so these are measured constants, not
# guesses: re-run this script and the numbers reproduce exactly. Peaks all land
# under -11 dBFS, so nothing clips against a bed or a voice.
gain() { # $1 file  $2 dB
  q -i "$OUT/$1" -af "volume=$2dB" "$OUT/.g_$1" && mv "$OUT/.g_$1" "$OUT/$1"
}
gain post_beep_1997.wav  -8.2   # -9.8  -> -18
gain err_ding_1997.wav   -7.5   # -11.5 -> -19
gain chime_2003.wav      18.7   # -40.7 -> -22
gain alert_2003.wav      20.6   # -42.6 -> -22  ⚑ lands level with the chime: same voice
gain ting_2016.wav       30.0   # -54.0 -> -24  (polished = quieter, not absent)
gain tick_task.wav       11.2   # -36.4 -> -25
gain ready_e4.wav        20.8   # -46.8 -> -26
gain set_down_e4.wav      0.5   # -24.5 -> -24

# ── PUBLISH ─────────────────────────────────────────────────────────────────
# The WAV in assets/audio/ is the master; public/assets/audio/ gets 96 kbps mono,
# same split as tools/tts/publish_mp3.sh keeps for the voice. ⚑ A file here is
# still SILENT until its name is in src/audio/tapeAudio.ts's REGISTRY — the
# registry law means an unregistered name is never requested, with no error and
# no 404, which is indistinguishable from a file nobody made.
PUB=public/assets/audio
mkdir -p "$PUB"
for f in post_beep_1997 err_ding_1997 chime_2003 alert_2003 ting_2016 tick_task \
         ready_e4 set_down_e4 bed_1997 bed_2003 bed_2016 bed_2026 passage_building; do
  q -i "$OUT/$f.wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/$f.mp3"
done

echo "── made:"
for f in "$OUT"/post_beep_1997.wav "$OUT"/err_ding_1997.wav "$OUT"/chime_2003.wav "$OUT"/alert_2003.wav \
         "$OUT"/ting_2016.wav "$OUT"/tick_task.wav "$OUT"/ready_e4.wav "$OUT"/set_down_e4.wav \
         "$OUT"/bed_*.wav "$OUT"/passage_building.wav; do
  printf '   %-28s %6ss\n' "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -c1-5)"
done
