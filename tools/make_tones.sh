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

# ── ⚑ ERAS 1–3 AND THE UPDATES (2026-09-13, S141) — the sounds the piece was missing ──
# 1997 · DIAL-UP. The era's defining sound, never made: a dial tone, eleven
# DTMF digits, the modem's answer tone and the handshake's noise, 7 s. Ours —
# a real V.90 negotiation is a copyrighted recording on every site that hosts one.
q -f lavfi -i "sine=f=350:d=0.8" -f lavfi -i "sine=f=440:d=0.8" \
  -f lavfi -i "sine=f=697:d=0.09" -f lavfi -i "sine=f=1209:d=0.09" \
  -f lavfi -i "sine=f=770:d=0.09" -f lavfi -i "sine=f=1336:d=0.09" \
  -f lavfi -i "sine=f=852:d=0.09" -f lavfi -i "sine=f=1477:d=0.09" \
  -f lavfi -i "sine=f=941:d=0.09" -f lavfi -i "sine=f=1209:d=0.09" \
  -f lavfi -i "sine=f=2100:d=1.1" -f lavfi -i "anoisesrc=d=2.6:c=white:a=0.5" \
  -filter_complex "[0][1]amix=inputs=2:normalize=0,volume=0.5[dial];
    [2][3]amix=inputs=2:normalize=0[d1];[4][5]amix=inputs=2:normalize=0[d2];[6][7]amix=inputs=2:normalize=0[d3];[8][9]amix=inputs=2:normalize=0[d4];
    [d1][d2][d3][d4][d1][d3][d2][d4][d3][d1][d2]concat=n=11:v=0:a=1,volume=0.5[digits];
    [10]volume=0.35,afade=t=in:st=0:d=0.05,afade=t=out:st=1.0:d=0.1[ans];
    [11]bandpass=f=1400:w=1800,aeval='val(0)*(0.6+0.4*gt(sin(2*PI*t*17+sin(t*40)*4),0))':c=same,volume=0.5,afade=t=out:st=2.1:d=0.5[hs];
    [dial][digits][ans][hs]concat=n=4:v=0:a=1,lowpass=f=3400,highpass=f=300" \
  "$OUT/dialup_1997.wav"

# 1997 · a key, a press: the PC speaker's click — square, 12 ms.
q -f lavfi -i "sine=f=1000:d=0.012" -af "aeval='sgn(val(0))*0.3':c=same,afade=t=out:st=0.006:d=0.006" "$OUT/key_1997.wav"

# 1997 · IRC — a line arriving: one square blip, the speaker's only voice.
q -f lavfi -i "sine=f=1318.51:d=0.07" -af "aeval='sgn(val(0))*0.22':c=same,afade=t=out:st=0.04:d=0.03,lowpass=f=6000" "$OUT/irc_1997.wav"

# 1997 · the floppy going in and the drive reading it: a click, the motor, two seeks.
q -f lavfi -i "anoisesrc=d=0.05:c=brown:a=0.9" -f lavfi -i "sine=f=300:d=2.2" -f lavfi -i "anoisesrc=d=2.2:c=pink:a=0.4" \
  -filter_complex "[0]lowpass=f=1200,volume=0.6[click];[1]volume=0.05,tremolo=f=60:d=0.5,afade=t=in:st=0:d=0.1,afade=t=out:st=1.8:d=0.4[motor];
    [2]bandpass=f=2200:w=900,aeval='val(0)*(gt(sin(2*PI*t*1.4+1),0.6)+gt(sin(2*PI*t*9.5),0.9)*0.7)':c=same,volume=0.3,afade=t=out:st=1.8:d=0.4[seek];
    [motor][seek]amix=inputs=2:normalize=0[drive];[click][drive]concat=n=2:v=0:a=1" \
  "$OUT/floppy_1997.wav"

# EVERY UPDATE · installing: the machine working — a 4 s loopable churn, era-neutral,
# filtered noise with a slow pulse. Under the changelog as it types itself.
q -f lavfi -i "anoisesrc=d=4:c=pink:a=0.6" -af "lowpass=f=1600,equalizer=f=250:t=q:w=1.5:g=8,tremolo=f=2.5:d=0.4,volume=0.25" "$OUT/install_work.wav"

# EVERY UPDATE · "Restarting…": the screen going dark — a soft power cycle, the
# hum dropping, and a single low tick as the machine comes back. Not a thud:
# an update restarts you, it does not hit you.
q -f lavfi -i "sine=f=100:d=1.2" -f lavfi -i "anoisesrc=d=0.03:c=brown:a=0.8" \
  -filter_complex "[0]volume=0.18,afade=t=out:st=0.1:d=1.1,lowpass=f=300[h];[1]lowpass=f=900,adelay=1500|1500,volume=0.4[t];[h][t]amix=inputs=2:normalize=0" \
  "$OUT/restart_dark.wav"

q -i "$OUT/dialup_1997.wav" -af "atrim=0:7.4,afade=t=out:st=6.9:d=0.5" "$OUT/dialup_1997.tmp.wav" && mv "$OUT/dialup_1997.tmp.wav" "$OUT/dialup_1997.wav"
level dialup_1997 -24; level key_1997 -22; level irc_1997 -22; level floppy_1997 -26; level install_work -32; level restart_dark -26

# ── ⚑ S143 · THE SONG CALEB SENDS — a STAND-IN, until Sérgio's generation lands.
# s2_caleb.json `c05s`. A 2003 bedroom keyboard: four chords a bar each at 78 BPM
# (C · Am · F · G), sine triads under a slow tremolo, a kick and a hat from noise,
# tape hiss and one wobble; ~25 s, loop-safe. INSTRUMENTAL — no voice, ever.
# Replace the file, keep the name; the beat does not change.
BEAT=0.769   # 60/78
BAR=$(python3 -c "print(4*$BEAT)")
chord() { # $1 f1 $2 f2 $3 f3 → one bar
  q -f lavfi -i "sine=f=$1:d=$BAR" -f lavfi -i "sine=f=$2:d=$BAR" -f lavfi -i "sine=f=$3:d=$BAR" \
    -filter_complex "[0][1][2]amix=inputs=3:normalize=0,volume=0.16,tremolo=f=5.2:d=0.25,lowpass=f=2400,afade=t=in:st=0:d=0.05,afade=t=out:st=$(python3 -c "print($BAR-0.12)"):d=0.12" "$OUT/_c_$4.wav"
}
chord 261.63 329.63 392.00 1   # C
chord 220.00 261.63 329.63 2   # Am
chord 174.61 220.00 261.63 3   # F
chord 196.00 246.94 293.66 4   # G
q -i "$OUT/_c_1.wav" -i "$OUT/_c_2.wav" -i "$OUT/_c_3.wav" -i "$OUT/_c_4.wav" -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1" "$OUT/_prog.wav"
q -i "$OUT/_prog.wav" -i "$OUT/_prog.wav" -filter_complex "[0][1]concat=n=2:v=0:a=1" "$OUT/_keys.wav"
LEN=$(python3 -c "print(8*$BAR)")
# the drum machine: a kick on 1 and 3, a hat on every beat, from the same recipe as the ticks above
q -f lavfi -i "sine=f=55:d=$LEN" -f lavfi -i "anoisesrc=d=$LEN:c=white:a=0.5" \
  -filter_complex "[0]aeval='val(0)*gt(sin(2*PI*t/(2*$BEAT)+PI/2),0.985)*2':c=same,lowpass=f=160,volume=0.7[k];
    [1]highpass=f=6000,aeval='val(0)*gt(sin(2*PI*t/$BEAT+PI/2),0.992)':c=same,volume=0.12[h];[k][h]amix=inputs=2:normalize=0" "$OUT/_drums.wav"
q -i "$OUT/_keys.wav" -i "$OUT/_drums.wav" -f lavfi -i "anoisesrc=d=$LEN:c=pink:a=0.3" \
  -filter_complex "[2]highpass=f=2000,volume=0.05[hiss];[0][1][hiss]amix=inputs=3:normalize=0,vibrato=f=0.4:d=0.02,lowpass=f=4200,highpass=f=90" "$OUT/caleb_last_night_2003.wav"
rm -f "$OUT"/_c_*.wav "$OUT/_prog.wav" "$OUT/_keys.wav" "$OUT/_drums.wav"
level caleb_last_night_2003 -26

# ── ⚑ S144 · THE STAMP — a filing, heard. One short cold thock, a relay closing
# and a rubber stamp's fall in the same 90 ms: the witness side answering an act.
# The same sound in every era, because the file never changed.
q -f lavfi -i "anoisesrc=d=0.09:c=brown:a=0.9" -f lavfi -i "sine=f=180:d=0.09" \
  -filter_complex "[0]lowpass=f=700,afade=t=out:st=0.01:d=0.08,volume=0.6[k];[1]volume=0.25,afade=t=out:st=0.0:d=0.09[t];[k][t]amix=inputs=2:normalize=0" \
  "$OUT/stamp_witness.wav"
level stamp_witness -24

# ── ⚑ S151 · THE UN-WALK PROGRAMME LOOP (R3-17, 2026-09-20) ──────────────────
# Sérgio: "this needs a song of the programmes of the time to fill the void." A
# soundcard organ playing a hymn's accompaniment with nobody singing, 32 s,
# seamless — synthesized in tools/make_hymn.py (deterministic, stdlib only).
python3 tools/make_hymn.py "$OUT/unwalk_loop_1997.wav"
q -i "$OUT/unwalk_loop_1997.wav" -af "lowpass=f=3200,highpass=f=70" "$OUT/unwalk_loop_1997.tmp.wav" && mv "$OUT/unwalk_loop_1997.tmp.wav" "$OUT/unwalk_loop_1997.wav"
level unwalk_loop_1997 -27
q -i "$OUT/unwalk_loop_1997.wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/unwalk_loop_1997.mp3"

# ── ⚑ S155 · THE SOUND REDO, THE PART THAT NEEDS NO EAR (2026-09-20, OPEN_ITEMS Priority 3) ──
# His rows, in order: the button too thumpy (R3-08) · the floppy not good (R3-14) · the IRC
# stringy, like radar, on every message (R3-25) · the diary silent (R3-36) · the flying sound
# terrible (R3-43/63) · the boots (R3-48/64) · the platform needs system sound (R3-68) · the
# update sound horrible (R3-85) · the typing horrible (R3-88) · Lamby needs a sound (W-G1) ·
# the descent and the Close need a score (R3-02, R3-110). Everything below is ours and
# deterministic; the two scores are marked HIS TO HEAR in the register.

# R3-08 · the press: 14 ms of filtered noise, a fingertip on plastic — not a thud.
# ⚑ replaces the Freesound cut (619835); data/audio/ingest.tsv's row is retired.
q -f lavfi -i "anoisesrc=d=0.014:c=pink:a=0.6" -af "highpass=f=700,lowpass=f=3200,afade=t=out:st=0.004:d=0.010,volume=0.5" "$OUT/ui_press.wav"
level ui_press -28

# R3-14 · the floppy, as a drive: the motor spinning up (a low hum with a wobble), two head
# seeks a second apart (brown-noise knocks), the motor winding down. 3.4 s, lower than before.
q -f lavfi -i "sine=f=140:d=3.4" -f lavfi -i "anoisesrc=d=3.4:c=brown:a=0.9" -f lavfi -i "anoisesrc=d=3.4:c=pink:a=0.5" \
  -filter_complex "[0]volume=0.12,tremolo=f=25:d=0.35,afade=t=in:st=0:d=0.35,afade=t=out:st=2.6:d=0.8,lowpass=f=400[motor];
    [1]lowpass=f=900,aeval='val(0)*(gt(sin(2*PI*(t-0.9)*40),0.97)*lt(abs(t-0.95),0.06)+gt(sin(2*PI*(t-1.9)*40),0.97)*lt(abs(t-1.95),0.06))':c=same,volume=1.2[knock];
    [2]bandpass=f=1800:w=800,aeval='val(0)*(lt(abs(t-1.0),0.12)+lt(abs(t-2.0),0.12))':c=same,volume=0.25[seek];
    [motor][knock][seek]amix=inputs=3:normalize=0" "$OUT/floppy_1997.wav"
level floppy_1997 -28

# R3-25 · the IRC's tick: one soft short tick — no longer a radar beep, and (irc.ts) no
# longer on every line: only his own, and the request's arrival.
q -f lavfi -i "sine=f=740:d=0.045" -af "afade=t=in:st=0:d=0.004,afade=t=out:st=0.015:d=0.03,lowpass=f=2400,volume=0.3" "$OUT/irc_1997.wav"
level irc_1997 -30

# R3-36 · the diary: a soft key per character (quieter than the era's speaker click), the
# FLAG (a two-note fall, low — the system noticing), the ERASE (a scrub sweeping down).
q -f lavfi -i "anoisesrc=d=0.02:c=pink:a=0.6" -af "highpass=f=500,lowpass=f=2600,afade=t=out:st=0.006:d=0.014,volume=0.4" "$OUT/diary_key.wav"
q -f lavfi -i "sine=f=330:d=0.14" -f lavfi -i "sine=f=247:d=0.26" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,aeval=sgn(val(0))*0.22,lowpass=f=2200,afade=t=out:st=0.28:d=0.12" "$OUT/diary_flag.wav"
q -f lavfi -i "anoisesrc=d=0.7:c=pink:a=0.6" -af "bandpass=f=1400:w=700,aeval='val(0)*(1-0.8*t/0.7)':c=same,lowpass=f=2500,afade=t=out:st=0.5:d=0.2,volume=0.35" "$OUT/diary_erase.wav"
level diary_key -32; level diary_flag -26; level diary_erase -30

# R3-43/63 · the passage: LOW WIND, no whoosh — brown noise through a slow open-and-close, 60 s,
# seamless. Replaces the building's rumble for the flight (the building bed stays on disk).
bed passage_wind.wav "lowpass=f=380,equalizer=f=90:t=q:w=1.2:g=8,tremolo=f=0.1:d=0.55,highpass=f=30"

# R3-48/64 · the boots. 2003: a POST beep, then a hard drive seeking under a splash (1.6 s).
# 2016: no beep — a soft rising pair, the sound of a machine that no longer clicks (0.9 s).
q -f lavfi -i "sine=f=1000:d=0.16" -f lavfi -i "anoisesrc=d=1.6:c=pink:a=0.5" \
  -filter_complex "[0]aeval=sgn(val(0))*0.3,lowpass=f=6000,afade=t=out:st=0.13:d=0.03[beep];
    [1]bandpass=f=1600:w=900,aeval='val(0)*(gt(sin(2*PI*t*6.3+sin(t*17)*3),0.9))':c=same,adelay=350|350,volume=0.35,afade=t=out:st=1.2:d=0.4[hdd];
    [beep][hdd]amix=inputs=2:normalize=0" "$OUT/boot_2003.wav"
q -f lavfi -i "sine=f=392:d=0.5" -f lavfi -i "sine=f=587.33:d=0.7" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.2,lowpass=f=5000,afade=t=in:st=0:d=0.1,afade=t=out:st=0.7:d=0.5,aecho=0.85:0.3:90:0.18" "$OUT/boot_2016.wav"
level boot_2003 -22; level boot_2016 -26

# R3-68 · Lambient's chime: the 2016 ting's family, two notes, softer — the platform's lane
# speaking. (The 2016 bed already exists: bed_2016.)
q -f lavfi -i "sine=f=1046.5:d=0.18" -f lavfi -i "sine=f=1318.5:d=0.42" \
  -filter_complex "[0][1]concat=n=2:v=0:a=1,volume=0.16,lowpass=f=6000,afade=t=out:st=0.3:d=0.3,aecho=0.9:0.35:60:0.2" "$OUT/lambient_chime.wav"
level lambient_chime -27

# R3-85/63 · the update: the install as a hard drive WORKING (gated pink noise, low, 4 s loop),
# not a churn; the restart as the hum dropping and one soft tick as it comes back.
q -f lavfi -i "anoisesrc=d=4:c=pink:a=0.5" -af "lowpass=f=700,equalizer=f=180:t=q:w=1.4:g=6,aeval='val(0)*(0.35+0.65*gt(sin(2*PI*t*2.5+sin(t*9)*1.5),0.55))':c=same,volume=0.3" "$OUT/install_work.wav"
q -f lavfi -i "sine=f=90:d=1.4" -f lavfi -i "anoisesrc=d=0.02:c=brown:a=0.7" \
  -filter_complex "[0]volume=0.14,afade=t=out:st=0.2:d=1.2,lowpass=f=260[h];[1]lowpass=f=1200,adelay=1700|1700,volume=0.3[t];[h][t]amix=inputs=2:normalize=0" "$OUT/restart_dark.wav"
level install_work -36; level restart_dark -30

# R3-88 · the search being typed: sparser, softer, not a character each — a hand that pauses.
q -f lavfi -i "anoisesrc=d=6:c=pink:a=0.6" \
  -af "highpass=f=1200,lowpass=f=3600,aeval='val(0)*(gt(sin(2*PI*t*4.1+sin(t*2.3)*2.5),0.965)*1)':c=same,volume=0.8,afade=t=out:st=5.4:d=0.6" \
  "$OUT/type_2026.wav"
level type_2026 -36

# W-G1 · Lamby's sound: a small upward pop — a sine sweep, 240 → 720 Hz in 160 ms, the way a
# desk assistant announced itself. Once, on his appear; never in a felt scene (os.ts).
q -f lavfi -i "aevalsrc='0.3*sin(2*PI*(240*t+ (720-240)*t*t/(2*0.16)))':d=0.16" -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.1:d=0.06,lowpass=f=4000" "$OUT/lamby_pop.wav"
level lamby_pop -26

# R3-02 · THE DESCENT'S SCORE — ⚑ HIS TO HEAR. 40 s: a slow pad falling an octave (three
# partials, detuned), the room's bed already under it; it fades as the seat is reached.
# (the phase is the INTEGRAL of the falling frequency — 2π·f0·T/ln2·(1−2^(−t/T)) — so the
#  glide is a true octave and not a chirp that folds through zero)
q -f lavfi -i "aevalsrc='0.22*(sin(2*PI*220*40/log(2)*(1-pow(2,-t/40))) + 0.5*sin(2*PI*330*40/log(2)*(1-pow(2,-t/40))) + 0.25*sin(2*PI*440*40/log(2)*(1-pow(2,-t/40))+0.3))':d=40" \
  -af "lowpass=f=2200,tremolo=f=0.15:d=0.2,afade=t=in:st=0:d=4,afade=t=out:st=30:d=10" "$OUT/descent_score.wav"
level descent_score -30

# R3-110 · THE CLOSE'S SCORE — ⚑ HIS TO HEAR. 60 s, seamless: the four beds resolving into one
# chord — a warm C-major pad (C3 · G3 · C4 · E4), each voice with a slow separate swell, over
# the sky bed's own air. Louder than the sky alone, which he could not hear.
q -f lavfi -i "sine=f=130.81:d=60" -f lavfi -i "sine=f=196:d=60" -f lavfi -i "sine=f=261.63:d=60" -f lavfi -i "sine=f=329.63:d=60" -f lavfi -i "anoisesrc=d=60:c=brown:a=0.8" \
  -filter_complex "[0]volume=0.2,tremolo=f=0.1:d=0.5[a];[1]volume=0.14,tremolo=f=0.13:d=0.5[b];[2]volume=0.12,tremolo=f=0.11:d=0.5[c];[3]volume=0.08,tremolo=f=0.17:d=0.5[d];
    [4]lowpass=f=300,volume=0.25,tremolo=f=0.1:d=0.3[air];[a][b][c][d][air]amix=inputs=5:normalize=0,lowpass=f=2600" "$OUT/close_score.wav"
level close_score -27

for f in ui_press floppy_1997 irc_1997 diary_key diary_flag diary_erase passage_wind boot_2003 boot_2016 \
         lambient_chime install_work restart_dark type_2026 lamby_pop descent_score close_score; do
  q -i "$OUT/$f.wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/$f.mp3"
done

# ── ⚑ S156 · THE 1997 STARTUP CHIME (2026-09-20) ──────────────────────────────
# Sérgio: "we are missing the chime of the boot-up". Ours, not Microsoft's: four notes rising
# (E4 · G4 · B4 · E5) into a held chord with a soundcard's bright partials and a room's echo.
q -f lavfi -i "sine=f=329.63:d=2.6" -f lavfi -i "sine=f=392:d=2.6" -f lavfi -i "sine=f=493.88:d=2.6" -f lavfi -i "sine=f=659.25:d=2.6" \
  -filter_complex "[0]adelay=0|0,afade=t=in:st=0:d=0.05,volume=0.22[a];[1]adelay=350|350,afade=t=in:st=0.35:d=0.05,volume=0.2[b];[2]adelay=700|700,afade=t=in:st=0.7:d=0.05,volume=0.18[c];[3]adelay=1050|1050,afade=t=in:st=1.05:d=0.05,volume=0.16[d];
    [a][b][c][d]amix=inputs=4:normalize=0,aeval='val(0)*(1+0.35*sin(2*PI*2*t))':c=same,lowpass=f=5200,afade=t=out:st=1.6:d=1.0,aecho=0.85:0.4:110:0.22" \
  "$OUT/startup_1997.wav"
level startup_1997 -24
q -i "$OUT/startup_1997.wav" -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$PUB/startup_1997.mp3"
