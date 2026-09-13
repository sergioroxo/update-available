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

# ── ⚑ ERA 4, THE SECOND ACT (2026-09-13) — the sounds of a system being refused ──
# Sérgio: "have you already added all the sound design?" No: the whole second
# act (the session, Junie's link, the fight for the glass, the intrusions, the
# termination, the screens dying, the Close) played silent. Same doctrine as
# above — synthesized, ours, auditable; no voice anywhere (TransJesus has none,
# the "recorded" testimonial plays as a recording with the voice missing).
# Two registers, and the ear must tell them apart before any line does:
#   THE SYSTEM — sines, clean, green: chimes that resolve, tones that insist
#   THE ROOM   — warmer, rounder, a third apart: Junie's card, the crowd's push

# 2026 · the search being finished FOR her: soft key ticks, 6 s, uneven.
q -f lavfi -i "anoisesrc=d=6:c=pink:a=0.6" \
  -af "highpass=f=1200,lowpass=f=4200,aeval='val(0)*(gt(sin(2*PI*t*7.3+sin(t*3.1)*2),0.93)*1+gt(sin(2*PI*t*11.1),0.985)*0.6)':c=same,volume=0.9,afade=t=out:st=5.5:d=0.5" \
  "$OUT/type_2026.wav"

# 2026 · the agent comes online: three rising sines, resolved — pleased with itself.
q -f lavfi -i "sine=f=523.25:d=0.11" -f lavfi -i "sine=f=659.25:d=0.11" -f lavfi -i "sine=f=783.99:d=0.5" \
  -filter_complex "[0][1][2]concat=n=3:v=0:a=1,volume=0.22,lowpass=f=6500,afade=t=out:st=0.4:d=0.32,aecho=0.9:0.3:90:0.18" \
  "$OUT/agent_2026.wav"

# 2026 · a step done: one short resolving pair. The tick of a box being ticked for you.
q -f lavfi -i "sine=f=987.77:d=0.06" -f lavfi -i "sine=f=1318.51:d=0.22" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.18,lowpass=f=7000,afade=t=out:st=0.1:d=0.18" \
  "$OUT/step_done_2026.wav"

# 2026 · the Restoration working: 3.2 s of a process — filtered noise with a slow
# rising resonance, the sound of something being computed on her face.
q -f lavfi -i "anoisesrc=d=3.2:c=pink:a=0.7" \
  -af "lowpass=f=2400,equalizer=f=400:t=q:w=1.5:g=9,tremolo=f=9:d=0.35,afade=t=in:st=0:d=0.3,afade=t=out:st=2.7:d=0.5,volume=0.28" \
  "$OUT/restore_2026.wav"

# 2026 · the device going on: the seal — a short brown-noise swell and the room
# closing off, then the ready tone's pair an octave down, inside.
q -f lavfi -i "anoisesrc=d=0.9:c=brown:a=0.8" -f lavfi -i "sine=f=261.63:d=0.5" -f lavfi -i "sine=f=392:d=0.7" \
  -filter_complex "[0]lowpass=f=600,afade=t=in:st=0:d=0.3,afade=t=out:st=0.4:d=0.5,volume=0.5[n];[1][2]concat=n=2:v=0:a=1,adelay=500|500,volume=0.14,lowpass=f=3000,afade=t=out:st=0.9:d=0.3[t];[n][t]amix=inputs=2:normalize=0" \
  "$OUT/wear_2026.wav"

# 2026 · grounding: the breathing ring. 8 s, in for four, out for four — a sine
# swell and filtered air, loopable. The calm the system sells.
q -f lavfi -i "sine=f=196:d=8" -f lavfi -i "anoisesrc=d=8:c=pink:a=0.5" \
  -filter_complex "[0]volume=0.16,tremolo=f=0.125:d=0.95[s];[1]lowpass=f=900,volume=0.12,tremolo=f=0.125:d=0.95[a];[s][a]amix=inputs=2:normalize=0,lowpass=f=1800" \
  "$OUT/session_breath.wav"

# 2026 · the "recorded" voice: a recording PLAYING, with nobody in it. Tape floor,
# a room's hum, the odd mouth-click-shaped tick — the voice itself is refused.
q -f lavfi -i "anoisesrc=d=12:c=pink:a=0.35" \
  -af "highpass=f=180,lowpass=f=3400,equalizer=f=110:t=q:w=1.2:g=6,volume=0.5,aeval='val(0)*(1+gt(sin(2*PI*t*0.9+sin(t*1.7)),0.995)*4)':c=same,afade=t=in:st=0:d=0.4,afade=t=out:st=11.4:d=0.6,volume=0.35" \
  "$OUT/playback_hiss.wav"

# 2026 · JUNIE'S CARD — the room's register: two warm notes a third apart,
# rounder than anything the system plays, with a little air behind them.
q -f lavfi -i "sine=f=440:d=0.16" -f lavfi -i "sine=f=554.37:d=0.6" -f lavfi -i "anoisesrc=d=0.76:c=pink:a=0.3" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.2,lowpass=f=3800,afade=t=out:st=0.45:d=0.3,aecho=0.85:0.4:70:0.22[t];[2]lowpass=f=1200,afade=t=out:st=0.2:d=0.5,volume=0.06[a];[t][a]amix=inputs=2:normalize=0" \
  "$OUT/card_junie.wav"

# 2026 · the filter refusing: a low, flat deny — one buzzing tone, cut short.
q -f lavfi -i "sine=f=146.83:d=0.42" -f lavfi -i "sine=f=155.56:d=0.42" \
  -filter_complex "[0][1]amix=inputs=2:normalize=0,volume=0.34,lowpass=f=2500,afade=t=in:st=0:d=0.01,afade=t=out:st=0.3:d=0.12" \
  "$OUT/filter_deny.wav"

# 2026 · reconnecting: three rising sines that never resolve, repeating — 2.4 s,
# loopable; the system insisting. Stopped by the room (ui_refuse), never by her.
q -f lavfi -i "sine=f=523.25:d=0.14" -f lavfi -i "sine=f=622.25:d=0.14" -f lavfi -i "sine=f=739.99:d=0.32" -f lavfi -i "anullsrc=d=1.8:r=44100:cl=mono" \
  -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1,volume=0.16,lowpass=f=6000,aecho=0.8:0.3:110:0.15" \
  "$OUT/reconnect_2026.wav"

# 2026 · SESSION TERMINATED: a hard descending pair and a cut — the one sound in
# the era with an edge on it. Tone dial +1, not +2: a stop, not an alarm.
q -f lavfi -i "sine=f=659.25:d=0.18" -f lavfi -i "sine=f=311.13:d=0.7" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.3,lowpass=f=5000,afade=t=out:st=0.6:d=0.28" \
  "$OUT/terminate_2026.wav"

# 2026 · the bands tearing two screens: 3 s of filtered static that stutters.
q -f lavfi -i "anoisesrc=d=3:c=white:a=0.5" \
  -af "bandpass=f=1800:w=1400,aeval='val(0)*(gt(sin(2*PI*t*13+sin(t*23)*3),0.2)*1)':c=same,afade=t=out:st=2.4:d=0.6,volume=0.22" \
  "$OUT/static_2026.wav"

# 2026 · both screens going off: a low thunk and the hum dropping out.
q -f lavfi -i "anoisesrc=d=0.18:c=brown:a=0.9" -f lavfi -i "sine=f=120:d=1.4" \
  -filter_complex "[0]lowpass=f=500,afade=t=out:st=0.03:d=0.15,volume=0.6[k];[1]volume=0.2,afade=t=out:st=0.2:d=1.2,lowpass=f=400[h];[k][h]amix=inputs=2:normalize=0" \
  "$OUT/power_down_2026.wav"

# THE CLOSE · the sky. 60 s, seamless, quieter than any room: a sub and a filtered
# breath — the sound of a place with no walls.
bed close_sky_bed.wav "lowpass=f=420,equalizer=f=48:t=q:w=1:g=12,equalizer=f=96:t=q:w=2:g=5,tremolo=f=0.1:d=0.12,volume=0.8"

# ── LEVEL THE SECOND ACT to the family's targets (one-shots -20..-26 dBFS RMS,
# the session's two loops -34 under the room bed), measured, not guessed.
level() { # $1 stem  $2 target mean dB
  local mean; mean=$(ffmpeg -i "$OUT/$1.wav" -af volumedetect -f null - 2>&1 | sed -n 's/.*mean_volume: \(-*[0-9.]*\) dB.*/\1/p')
  local gain; gain=$(python3 -c "print(round($2 - ($mean), 1))")
  q -i "$OUT/$1.wav" -af "volume=${gain}dB,alimiter=limit=0.7" "$OUT/$1.tmp.wav" && mv "$OUT/$1.tmp.wav" "$OUT/$1.wav"
}
level type_2026 -30;      level agent_2026 -24;    level step_done_2026 -26; level restore_2026 -28
level wear_2026 -26;      level session_breath -34; level playback_hiss -36; level card_junie -23
level filter_deny -22;    level reconnect_2026 -26; level terminate_2026 -20; level static_2026 -26
level power_down_2026 -24
