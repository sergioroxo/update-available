#!/usr/bin/env python3
"""tools/make_clip_music.py — THE GREAT BECOMING's MUSIC (S360, UiB job 13 Part A; his 11 Nov: "music and a narrator").

In the new 2026 the chat AI (Second Thoughts) MAKES the anti-"gender ideology" clip for Maya, out of her own week
(src/desktop/apps/contagionClip.ts, words in data/dialog/s4_v3.json `clip`). It is the SYSTEM's new media, so by his rule
it is OVER THE TOP: a trailer bed — a heartbeat that grows into a pounding pump, risers into every title card, a boom on
every card, the hush before "WHO IS TALKING TO YOU, MAYA?", and then the last card ("YOU CAN STILL COME BACK.") lifts
from D minor to a huge, glossy D major: the genre's alarm turned into the system's promise. It should sound like a
parody of inspirational-trailer music — grandiose, and wrong for what it is selling.

THE GRID IS THE CLIP'S: 120 BPM, 25 bars of four = 50 s = CLIP_LOOP_SECONDS (frameHolds 4.5 4 4.5 5 6 7 4 5 5 5,
read from data/dialog/s4_v3.json and checked against CARDS below). Each card starts on a beat (0, 4.5, 8.5, 13, 18, 24,
31, 35, 40, 45 s) and gets its boom there; the narrator's file starts 0.15 s later.
It loops SEAMLESSLY (the hall's tail is folded onto the head).

  card 0  (0–4.5)    IT STARTED WITH ONE FRIEND.   a low drone and a heartbeat, one pair of thuds per bar
  card 1  (4.5–8.5)  THEN A GROUP CHAT.            the pulse: sixteenth-note saw on the root, ducking pad
  card 2  (8.5–13)   18 TODAY…                     kick on every beat, hats, the arpeggio bells; the first pump
  card 3  (13–18)    SUDDEN. JUST LIKE HER…        THE SIGNS (S364): the pump goes on, the pad opens a notch per card,
  card 4  (18–24)    ALWAYS ONLINE…                a two-note "ding" on every tick the picture lands (the checklist's
  card 5  (24–31)    STRUGGLING BEFORE…            own confirmation sound), a half snare from card 5, a stamp-hit on 5/5
  card 6  (31–35)    4,815 AND RISING.             a riser that only goes up (a chromatic climb), snare on 2 and 4
  card 7  (35–40)    EVEN MERIDIAN SHUT THE DOOR.  everything cuts but the drone — and a door-slam boom
  card 8  (40–45)    WHO IS TALKING TO YOU…        the hush: sparse high bells, a heartbeat, a long riser into
  card 9  (45–50)    YOU CAN STILL COME BACK.      D MAJOR: the supersaw choir, the kick, the bells, the big hit

⚑ S364 (UiB job 14 Part B; his 11 Nov on the 32 s cut: "the music was great… maybe we can push to 45 seconds?"): the
same piece, LONGER — not a new style. The three "signs" cards were inserted after card 2, so everything from "4,815"
on moved by exactly 18 s = 9 bars and keeps its place in the bar; nine bars were written into the progression where
the cards went in (C, Dm Dm, Bb Bb, F F, Bb Bb — the opening's own shape, climbing into the C under "4,815"), and the
only new sound is the tick, made of the bells already here. Every voice, level, seed and the lift are S360's.

⚑ tools/make_tones.sh's law holds: no found sound, no sample, no imitation of any real piece — every partial is written
out (the era change's own voices are imported from tools/make_era_change_audio.py). Deterministic (seeded).

Usage: python3 tools/make_clip_music.py
       (writes assets/audio/clip_music.wav, publishes public/assets/audio/clip_music.mp3 with lame -V4)
"""
import json
import os
import sys

import numpy as np
from scipy.signal import butter, lfilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_era_change_audio import (  # noqa: E402  (the era change's own voices)
    SR, TAU, hz, smooth, place, bloop, saw, resonant_lowpass, hall, write,
)

BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 25
L = BARS * BAR           # 50 s: the clip's loop
TAIL = 6.0               # rendered past the loop, then folded onto its head
OFF = 2.0                # a pre-roll: what starts before 0 is folded onto the end
CARDS = [0.0, 4.5, 8.5, 13.0, 18.0, 24.0, 31.0, 35.0, 40.0, 45.0]      # the cards' onsets (== cumulative frameHolds)
SIGNS = (3, 4, 5)        # S364: the checklist's three cards
RISE, DOOR, HUSH, BACK = 6, 7, 8, 9                                    # S360's last four cards, by name

# the clip's own data: the holds must still add up to this grid, and the ticks land where the picture lands them
_V3 = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'dialog', 's4_v3.json'),
                     encoding='utf-8'))['clip']
_onsets = [sum(_V3['frameHolds'][:i]) for i in range(len(_V3['frameHolds']))]
assert _onsets == CARDS and sum(_V3['frameHolds']) == L, f'clip.frameHolds {_V3["frameHolds"]} no longer fit this grid'
TICKS = [CARDS[c['frame']] + t for c in _V3['signs']['cards'] for t in c['ticks']]
STAMP = [CARDS[c['frame']] + c['stampAt'] for c in _V3['signs']['cards'] if 'stampAt' in c]

# chord per bar: (sub root midi, pad voicing, arpeggio tones)
CH = {
    'Dm':  (38, [50, 53, 57, 62, 65], [62, 65, 69, 74, 77, 81]),
    'Bb':  (34, [46, 50, 53, 58, 62], [58, 62, 65, 70, 74, 77]),
    'F':   (41, [53, 57, 60, 65, 69], [65, 69, 72, 77, 81, 84]),
    'C':   (36, [48, 52, 55, 60, 64], [60, 64, 67, 72, 76, 79]),
    'A':   (33, [45, 49, 52, 57, 61], [57, 61, 64, 69, 73, 76]),     # the dominant, major third: unresolved
    'D':   (38, [50, 54, 57, 62, 66], [62, 66, 69, 74, 78, 81]),     # the lift
    'G':   (43, [55, 59, 62, 67, 71], [67, 71, 74, 79, 83, 86]),
    'Bm':  (35, [47, 50, 54, 59, 62], [59, 62, 66, 71, 74, 78]),
}
PROG = ['Dm', 'Dm', 'Bb', 'Bb',  'F', 'F',
        'C', 'Dm', 'Dm', 'Bb', 'Bb', 'F', 'F', 'Bb', 'Bb',      # S364: the nine bars under THE SIGNS (12–30 s)
        'C', 'C',
        'Dm', 'Bb', 'F', 'A',    'Dm', 'Dm', 'D', 'D']
assert len(PROG) == BARS
# the last bars are written out in clip(): Dm to the lift, D major for three seconds, then G (IV, which falls back onto
# the loop's Dm)
LIFT = CARDS[BACK]


def chord_at(t):
    t = t % L
    if t >= LIFT:
        return CH['G'] if t >= LIFT + 3.0 else CH['D']
    return CH[PROG[int(t // BAR)]]


def noise_burst(n, rng):
    return rng.standard_normal(n)


def kick(vel, f0=130.0, f1=42.0, dur=0.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = TAU * np.cumsum(f) / SR
    env = (1 - np.exp(-t / 0.001)) * np.exp(-t / 0.13)
    return vel * env * np.sin(ph)


def boom(vel, rng, dur=2.6):
    """the title-card impact: a sub dropping an octave and a half, a noise crack, a long dark tail"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t / 0.18)
    ph = TAU * np.cumsum(f) / SR
    body = np.sin(ph) * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.75)
    b, a = butter(2, [90 / (SR / 2), 2400 / (SR / 2)], btype='band')
    crack = lfilter(b, a, noise_burst(n, rng)) * np.exp(-t / 0.07)
    b2, a2 = butter(2, 420 / (SR / 2))
    rumble = lfilter(b2, a2, noise_burst(n, rng)) * np.exp(-t / 0.9) * (1 - np.exp(-t / 0.01))
    return vel * (body * 1.0 + crack * 0.55 + rumble * 0.9)


def snare(vel, rng):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    b, a = butter(2, [900 / (SR / 2), 7000 / (SR / 2)], btype='band')
    nz = lfilter(b, a, noise_burst(n, rng)) * np.exp(-t / 0.07)
    tone = np.sin(TAU * 190 * t) * np.exp(-t / 0.05)
    return vel * (nz + 0.5 * tone)


def hat(vel, rng):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    b, a = butter(2, 7500 / (SR / 2), btype='high')
    return vel * lfilter(b, a, noise_burst(n, rng)) * np.exp(-t / 0.018)


def riser(t0, t1, bus, rng, vel=0.2, f_lo=300.0, f_hi=7000.0, pitch=None):
    """a noise riser, its band opening upwards, swelling to the card (and an optional rising pitch under it)"""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    m = i1 - i0
    tt = np.arange(m) / SR
    x = rng.standard_normal(m)
    x = resonant_lowpass(x, lambda t: f_lo * (f_hi / f_lo) ** (t / max(1e-3, t1 - t0)), q=3.0)
    hb, ha = butter(2, 250 / (SR / 2), btype='high')
    x = lfilter(hb, ha, x)
    env = smooth(tt / (t1 - t0)) ** 2
    seg = x * env * vel
    if pitch:
        p0, p1 = pitch
        f = p0 * (p1 / p0) ** (tt / (t1 - t0))
        ph = TAU * np.cumsum(f) / SR
        seg = seg + env * (np.sin(ph) + 0.4 * np.sin(2 * ph)) * vel * 0.35
    bus[0, i0:i1] += seg
    bus[1, i0:i1] += np.roll(seg, int(0.007 * SR))


def duck(t, a=0.78, tau=0.16):
    """the pump: a gain that dips on every beat and swells back, applied to the pad"""
    ph = (t % BEAT)
    return 1 - a * np.exp(-ph / tau)


def clip():
    rng = np.random.default_rng(2611)
    total = OFF + L + TAIL
    n = int(total * SR)
    bus = np.zeros((2, n))
    tt = np.arange(n) / SR - OFF            # clip time of each sample

    def ev(t):                              # the intensity (0 … 1) the bed has reached at clip time t
        t = t % L
        if t < CARDS[1]:
            return 0.15
        if t < CARDS[2]:
            return 0.4
        if t < CARDS[SIGNS[0]]:
            return 0.7
        if t < CARDS[SIGNS[1]]:
            return 0.75                     # S364: THE SIGNS, a notch more open per card
        if t < CARDS[SIGNS[2]]:
            return 0.8
        if t < CARDS[RISE]:
            return 0.85
        if t < CARDS[DOOR]:
            return 0.9
        if t < CARDS[HUSH]:
            return 0.12                     # the door: everything cut
        if t < CARDS[BACK]:
            return 0.25                     # the hush
        return 1.0                          # the lift

    # ── the PAD (a supersaw: detuned saws, cutoff following the intensity), one chord per half-bar region ──
    pad = np.zeros(n)
    segs = [(b * BAR, (b + 1) * BAR, CH[PROG[b]]) for b in range(BARS - 3)]       # bars 0–21 (to 44 s)
    segs += [(LIFT - 1.0, LIFT, CH['Dm']), (LIFT, LIFT + 3.0, CH['D']), (LIFT + 3.0, L, CH['G'])]  # then the lift
    for s0, s1, ch in segs:
        a0, a1 = OFF + s0 - 0.35, min(total, OFF + s1 + 0.9)
        i0, i1 = int(a0 * SR), int(a1 * SR)
        m = i1 - i0
        t2 = np.arange(m) / SR
        env = smooth(t2 / 0.5) * (1 - smooth((t2 - (m / SR - 1.0)) / 1.0))
        for note in ch[1]:
            for det in (-0.14, -0.05, 0.05, 0.14):
                f = np.full(m, hz(note) * 2 ** (det / 12))
                pad[i0:i1] += env * saw(f, m, rng) * 0.0155
    pad = resonant_lowpass(pad, lambda t: 380 + 4200 * ev(t - OFF) ** 1.6, q=1.5)
    hb, ha = butter(2, 120 / (SR / 2), btype='high')
    pad = lfilter(hb, ha, pad)
    pump = np.where((tt % L >= CARDS[1]) & ((tt % L < CARDS[DOOR]) | (tt % L >= CARDS[BACK])), duck(np.maximum(tt, 0)), 1.0)
    pump = np.where((tt % L >= CARDS[HUSH]) & (tt % L < CARDS[BACK]), 1.0, pump)
    bus[0] += pad * pump * 0.95
    bus[1] += pad * pump

    # ── the DRONE: a low D, always there; it is all that is left under the door ──
    drone = np.zeros(n)
    for note, g in ((26, 0.075), (38, 0.045), (45, 0.02)):
        f = np.full(n, hz(note))
        drone += saw(f, n, rng) * g
    drone = resonant_lowpass(drone, lambda t: 160 + 340 * ev(t - OFF), q=1.2)
    bus[0] += drone
    bus[1] += drone

    # ── the PULSE: sixteenth-note saw on the root, from card 1, through to the door, and again for the lift ──
    t = 0.0
    k = 0
    while t < L:
        sixteenth = BEAT / 4
        on = (CARDS[1] <= t < CARDS[DOOR]) or t >= CARDS[BACK]
        if on:
            root = chord_at(t)[0] + 12
            vel = 0.05 + 0.05 * ev(t)
            if t >= CARDS[2]:
                root_n = root + (12 if (k % 8) == 7 else 0)
            else:
                root_n = root
            nn = int(0.13 * SR)
            tq = np.arange(nn) / SR
            wave = saw(np.full(nn, hz(root_n)), nn, rng) * np.exp(-tq / 0.07) * (1 - np.exp(-tq / 0.002))
            wave = resonant_lowpass(wave, lambda x: 500 + 2500 * ev(t), q=2.0, block=64)
            place(bus, wave * vel, OFF + t, -0.1 if k % 2 else 0.1)
        k += 1
        t += sixteenth

    # ── the BELLS: eighth-note arpeggio from card 2 (bright, glossy — the "inspirational" part), and the lift ──
    t = CARDS[2]
    j = 0
    while t < L:
        if t >= CARDS[DOOR] and t < CARDS[HUSH]:
            t = CARDS[HUSH]
            j = 0
        if CARDS[HUSH] <= t < CARDS[BACK]:
            # the hush: a sparse, high, lonely note every two beats
            up = CH['Dm'][2]
            note = up[(j * 3) % len(up)] + 12
            place(bus, bloop(hz(note), 0.09, dur=1.4), OFF + t, 0.4 if j % 2 else -0.4)
            j += 1
            t += BEAT * 2
            continue
        up = chord_at(t)[2]
        pat = (0, 2, 4, 3, 5, 4, 2, 3)
        note = up[pat[j % 8]] + (12 if t >= LIFT else 0)
        place(bus, bloop(hz(note), 0.095 if t >= LIFT else 0.07, dur=0.5), OFF + t, 0.55 if j % 2 else -0.55)
        j += 1
        t += BEAT / 2

    # ── the HEARTBEAT: two soft thuds a bar under cards 0–1; and again, slower, in the hush ──
    for bar in range(BARS):
        s0 = bar * BAR
        if s0 < CARDS[2] or (CARDS[HUSH] <= s0 < CARDS[BACK]):
            place(bus, kick(0.5, 90, 38, 0.3), OFF + s0, 0.0)
            place(bus, kick(0.34, 90, 38, 0.3), OFF + s0 + 0.28 * BEAT * 2, 0.0)
    for s0 in [CARDS[HUSH] + i for i in range(5)]:
        place(bus, kick(0.5, 90, 38, 0.3), OFF + s0, 0.0)
        place(bus, kick(0.34, 90, 38, 0.3), OFF + s0 + 0.3, 0.0)

    # ── the DRUMS: kick on every beat from card 2 (to the door), again for the lift; snare on 2 and 4 from "4,815" (a
    #    half one under the last sign); hats ──
    t = 0.0
    bi = 0
    while t < L:
        in_a = CARDS[2] <= t < CARDS[DOOR]
        in_b = t >= CARDS[BACK]
        if in_a or in_b:
            place(bus, kick(0.62 if in_b else 0.5), OFF + t, 0.0)
            if (CARDS[SIGNS[2]] <= t < CARDS[DOOR] or in_b) and (round(t / BEAT) % 2 == 1):
                place(bus, snare(0.33 if in_b else (0.26 if t >= CARDS[RISE] else 0.18), rng), OFF + t, 0.05)
            # hats on the offbeat eighth, and a doubled-up roll in the lift
            place(bus, hat(0.07, rng), OFF + t + BEAT / 2, 0.3)
            if in_b:
                place(bus, hat(0.04, rng), OFF + t + BEAT / 4, -0.3)
                place(bus, hat(0.04, rng), OFF + t + 3 * BEAT / 4, 0.3)
        t += BEAT

    # ── the BOOMS: a title-card impact on every card; the door's and the lift's are the biggest ──
    for ci, t0 in enumerate(CARDS):
        vel = {0: 0.9, 1: 0.55, 2: 0.6, 3: 0.6, 4: 0.62, 5: 0.66, RISE: 0.7, DOOR: 1.0, HUSH: 0.5, BACK: 1.15}[ci]
        place(bus, boom(vel, rng), OFF + t0, 0.0)
    # the lift also gets a bright crash: a long shimmer of high bloops
    for q in range(14):
        place(bus, bloop(hz(CH['D'][2][q % 6] + 12), 0.05, dur=1.6), OFF + LIFT + 0.04 * q, -0.8 + 1.6 * (q % 7) / 6)

    # ── S364: THE TICKS — each sign the picture ticks gets the bells' own two-note "ding" (the chord's top, then a
    #    fifth above it: a confirmation sound, pleased with itself); the 5 / 5 stamp gets a half boom and a short shimmer ──
    for i, t0 in enumerate(TICKS):
        top = chord_at(t0)[2][3] + 12
        place(bus, bloop(hz(top), 0.11, dur=0.45), OFF + t0, -0.25 if i % 2 else 0.25)
        place(bus, bloop(hz(top + 7), 0.1, dur=0.6), OFF + t0 + 0.07, 0.25 if i % 2 else -0.25)
    for t0 in STAMP:
        place(bus, boom(0.75, rng, dur=1.8), OFF + t0, 0.0)
        for q in range(8):
            up = chord_at(t0)[2]
            place(bus, bloop(hz(up[q % 6] + 12), 0.045, dur=1.0), OFF + t0 + 0.035 * q, -0.7 + 1.4 * (q % 5) / 4)

    # ── the RISERS into the cards (a long one into the lift; the one that only goes up before the door) ──
    riser(OFF + CARDS[1] - 1.2, OFF + CARDS[1], bus, rng, 0.12)
    riser(OFF + CARDS[2] - 1.0, OFF + CARDS[2], bus, rng, 0.14)
    for ci, v in zip(SIGNS, (0.13, 0.14, 0.15)):                                          # S364: into each sign
        riser(OFF + CARDS[ci] - 1.0, OFF + CARDS[ci], bus, rng, v)
    riser(OFF + CARDS[RISE] - 1.3, OFF + CARDS[RISE], bus, rng, 0.17, pitch=(110.0, 330.0))
    riser(OFF + CARDS[DOOR] - 2.2, OFF + CARDS[DOOR], bus, rng, 0.2, pitch=(165.0, 880.0))    # "4,815 AND RISING": up and up
    riser(OFF + CARDS[BACK] - 3.6, OFF + CARDS[BACK], bus, rng, 0.2, f_lo=250.0, f_hi=9000.0, pitch=(110.0, 660.0))

    # ── the SUB, on the roots (not under the door) ──
    sub = np.zeros(n)
    for s0, s1, ch in segs:
        if CARDS[DOOR] <= s0 < CARDS[BACK]:
            continue
        j0, j1 = int((OFF + s0) * SR), int(min(total, OFF + s1 + 0.25) * SR)
        mm = j1 - j0
        t2 = np.arange(mm) / SR
        e = smooth(t2 / 0.15) * (1 - smooth((t2 - (mm / SR - 0.25)) / 0.25))
        sub[j0:j1] += e * np.sin(TAU * hz(ch[0]) * t2) * 0.07
    bus[0] += sub
    bus[1] += sub

    bus = hall(bus, 2.9, 0.3, seed=29)

    # ── the seam: fold the tail onto the head and the pre-roll onto the end ──
    o, nl = int(OFF * SR), int(L * SR)
    out = bus[:, o:o + nl].copy()
    tail = bus[:, o + nl:]
    out[:, :tail.shape[1]] += tail
    out[:, nl - o:] += bus[:, :o]
    return out


if __name__ == '__main__':
    write('clip_music', clip(), 0.9)
