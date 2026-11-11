#!/usr/bin/env python3
"""tools/make_close_song.py — THE CLOSE'S SONG (S361, UiB job 13 Part B, H50).

His headset session, 10 Nov 2026, in the Close: "Music for the Close is missing" (said twice), and his order ends with
"a song behind it all". What played there was `close_score` (tools/make_tones.sh, R3-110): four sine tones held for a
minute over brown noise — a chord, not a song, and nothing in it moves. This is a song: a melody over a progression,
in the same instruments as the era change's music that he loves (tools/make_era_change_audio.py — the water-marimba
bloops, the detuned pad through a low-pass, the granular shimmer, the gliding lead, the sub, the synthetic hall), but
its own key and pace, so that it is the frame's ending and not Lamby's transition:

  · E♭ major, 60 BPM, 24 bars of four (96 s), and it LOOPS SEAMLESSLY (the hall's tail is folded onto its head);
  · bars 1–8: the pad and the bloops alone (one per beat) — the flight out of Maya's room and up to the stars;
  · bars 9–16: the lead comes in with the tune, the bloops go to two per beat, the shimmer opens;
  · bars 17–24: the tune climbs and comes home (A♭ · B♭ · Gm · Cm · A♭ · B♭ · E♭), then thins out for the loop;
  · each tune note is doubled an octave up by a soft long bloop, so the melody is heard as notes, not only a glide.

The Close is long (the flight, the rise, eight cards at the visitor's pace, the panels, the machine): the song plays
under all of it (src/engine/app.ts CLOSE_SONG), through the Lexicon and the receipt.

⚑ tools/make_tones.sh's law holds: no found sound, no sample, no imitation of any real piece — every partial is written
out. Deterministic (seeded).

Usage: python3 tools/make_close_song.py
       (writes assets/audio/close_song.wav, publishes public/assets/audio/close_song.mp3 with lame -V4)
"""
import os
import sys

import numpy as np
from scipy.signal import butter, lfilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_era_change_audio import (  # noqa: E402  (the era change's own voices)
    SR, TAU, hz, smooth, place, bloop, grain, saw, resonant_lowpass, hall, pan_gains, write,
)

BPM = 60.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 24
L = BARS * BAR          # the loop: 96 s
TAIL = 7.0              # rendered past the loop, then folded onto its head
OFF = 2.0               # a pre-roll: what starts before 0 (the first chord's crossfade) is folded onto the end

# (sub root, pad voicing, the upper tones the bloops arpeggiate)
CH = {
    'Eb':   (39, [51, 55, 58, 62, 65], [63, 67, 70, 74, 75, 77]),   # E♭maj9
    'Cm':   (36, [48, 51, 55, 58, 62], [60, 63, 67, 70, 72, 74]),   # Cm9
    'Ab':   (44, [48, 51, 55, 56, 58], [60, 63, 67, 68, 70, 72]),   # A♭maj9
    'Bb':   (46, [50, 53, 58, 60, 65], [62, 65, 70, 72, 74, 77]),   # B♭add9
    'Bbs':  (46, [51, 53, 58, 60, 65], [63, 65, 70, 72, 75, 77]),   # B♭sus4
    'Gm':   (43, [50, 53, 55, 58, 62], [62, 65, 67, 70, 74, 79]),   # Gm7
}
PROG = (['Eb', 'Cm', 'Ab', 'Bbs', 'Eb', 'Cm', 'Ab', 'Bb'] +
        ['Eb', 'Cm', 'Ab', 'Bb', 'Eb', 'Cm', 'Ab', 'Bb'] +
        ['Ab', 'Bb', 'Gm', 'Cm', 'Ab', 'Bb', 'Eb', 'Eb'])

# the tune: (bar index from 0, beat in the bar, MIDI note, beats held)
TUNE = [
    (8, 0, 67, 2), (8, 2, 70, 2),
    (9, 0, 72, 3), (9, 3, 70, 1),
    (10, 0, 68, 2), (10, 2, 67, 1), (10, 3, 65, 1),
    (11, 0, 65, 4),
    (12, 0, 67, 2), (12, 2, 70, 2),
    (13, 0, 75, 3), (13, 3, 74, 1),
    (14, 0, 72, 2), (14, 2, 70, 2),
    (15, 0, 70, 3), (15, 3, 74, 1),
    (16, 0, 75, 2), (16, 2, 72, 2),
    (17, 0, 74, 3), (17, 3, 70, 1),
    (18, 0, 70, 2), (18, 2, 74, 2),
    (19, 0, 72, 4),
    (20, 0, 72, 2), (20, 2, 68, 2),
    (21, 0, 70, 2), (21, 2, 65, 2),
    (22, 0, 67, 4),
    (23, 0, 63, 3),
]


def chord_at(t):
    b = int((t % L) // BAR)
    return CH[PROG[b]]


def song():
    rng = np.random.default_rng(2026)
    total = OFF + L + TAIL
    n = int(total * SR)
    bus = np.zeros((2, n))

    # ── the PAD: each bar's chord, crossfaded over the bar line; the last bar runs on into the tail (→ the head) ──
    pad = np.zeros(n)
    for b, name in enumerate(PROG):
        s0 = OFF + b * BAR
        a0, a1 = s0 - 0.8, min(total, s0 + BAR + 1.2)
        i0, i1 = int(a0 * SR), int(a1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        env = smooth(tt / 1.4) * (1 - smooth((tt - (m / SR - 1.6)) / 1.6))
        for note in CH[name][1]:
            for det in (-0.06, 0.06):
                f = np.full(m, hz(note) * 2 ** (det / 12))
                pad[i0:i1] += env * saw(f, m, rng) * 0.024

    def cutoff(t):
        t = (t - OFF) % L
        if t < 8 * BAR:
            return 700 + 300 * np.sin(TAU * t / (8 * BAR)) ** 2       # closed, breathing
        if t < 20 * BAR:
            return 1000 + 900 * smooth((t - 8 * BAR) / (4 * BAR))     # opens with the tune
        return 1900 - 1200 * smooth((t - 20 * BAR) / (4 * BAR))       # and closes for the loop
    pad = resonant_lowpass(pad, cutoff, q=1.6)
    hb, ha = butter(2, 140 / (SR / 2), btype='high')
    pad = lfilter(hb, ha, pad)
    bus[0] += pad * 0.95
    bus[1] += pad

    # ── the BLOOPS: the chord's upper tones, ping-ponging; one per beat, two per beat under the tune ──
    t = 0.0
    k = 0
    while t < L:
        per = 2 if 8 * BAR <= t < 22 * BAR else 1
        up = chord_at(t)[2]
        note = up[(k * 2 + k // 4) % len(up)]
        vel = 0.11 if per == 1 else 0.075
        if t >= 22 * BAR:
            vel *= max(0.35, 1 - (t - 22 * BAR) / (2 * BAR))
        place(bus, bloop(hz(note), vel, dur=0.5), OFF + t, 0.5 if k % 2 else -0.5)
        k += 1
        t += BEAT / per

    # ── the TUNE: a gliding lead (legato, the era change's voice) + a long soft bloop an octave up on each note ──
    lead_t0, lead_t1 = 8 * BAR - 0.5, 24 * BAR - 0.2
    i0, i1 = int((OFF + lead_t0) * SR), int((OFF + lead_t1) * SR)
    m = i1 - i0
    tt = np.arange(m) / SR
    step_f = np.full(m, hz(TUNE[0][2]))
    accent = np.zeros(m)
    for bar, beat, note, held in TUNE:
        on = bar * BAR + beat * BEAT
        j = int((on - lead_t0) * SR)
        if 0 <= j < m:
            step_f[j:] = hz(note)
            a = np.zeros(m)
            seg = np.arange(m - j) / SR
            a[j:] = np.exp(-seg / 0.35)
            accent += a
        place(bus, bloop(hz(note + 12), 0.05, dur=1.2), OFF + on, 0.15)
    g = 1 - np.exp(-1 / (0.09 * SR))
    f, _ = lfilter([g], [1, -(1 - g)], step_f, zi=[step_f[0] * (1 - g)])
    f *= 2 ** ((12 * np.sin(TAU * 4.8 * tt) * smooth(tt / 3.0)) / 1200.0)
    ph = TAU * np.cumsum(f) / SR
    env = smooth(tt / 1.8) * (1 - smooth((tt - (m / SR - 3.0)) / 3.0)) * (0.75 + 0.25 * np.clip(accent, 0, 1))
    lead = env * (np.sin(ph) + 0.1 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)) * 0.06
    lead_l = np.zeros(n)
    lead_l[i0:i1] = lead
    gl, gr = pan_gains(-0.1)
    bus[0] += lead_l * gl
    bus[1] += np.roll(lead_l, int(0.011 * SR)) * gr

    # ── the SHIMMER: sparse, opening with the tune ──
    t = 0.5
    while t < L - 0.5:
        dens = 1.5 if t < 8 * BAR else (6.0 if t < 20 * BAR else 2.5)
        t += rng.exponential(1.0 / dens)
        up = chord_at(t)[2]
        note = up[rng.integers(len(up))] + 12
        place(bus, grain(hz(note), rng.uniform(0.012, 0.03), rng.uniform(0.05, 0.14), rng.uniform(-25, 25), rng),
              OFF + t, rng.uniform(-0.9, 0.9))

    # ── the SUB, on the roots ──
    sub = np.zeros(n)
    for b, name in enumerate(PROG):
        s0 = OFF + b * BAR
        j0, j1 = int(s0 * SR), int(min(total, s0 + BAR + 0.3) * SR)
        mm = j1 - j0
        tt2 = np.arange(mm) / SR
        e = smooth(tt2 / 0.6) * (1 - smooth((tt2 - (mm / SR - 0.5)) / 0.5))
        sub[j0:j1] += e * np.sin(TAU * hz(CH[name][0] + 12) * tt2) * 0.03
    bus[0] += sub
    bus[1] += sub

    bus = hall(bus, 3.4, 0.34, seed=13)

    # ── the seam: what rang on past the loop is folded onto its head, so the loop never clicks or drops out ──
    o, nl = int(OFF * SR), int(L * SR)
    out = bus[:, o:o + nl].copy()
    tail = bus[:, o + nl:]
    out[:, :tail.shape[1]] += tail          # the hall's tail onto the head
    out[:, nl - o:] += bus[:, :o]           # the pre-roll onto the end
    return out


if __name__ == '__main__':
    write('close_song', song(), 0.8)
