#!/usr/bin/env python3
"""tools/make_restorify_media_songs.py — RESTORIFY MEDIA'S TWO SONGS (S362, UiB job 13 Part C, H37).

His headset session, 10 Nov 2026, 20:45–20:46, in 2003's "Your story": "the opening song should belong to Restorify
itself; the story media needs a new song … Testimony of Daniel needs a song." What played there was not Restorify
Media's: the programme's menu loop (restorify_loop_2003, tools/make_restorify_loop.py) is the *wellness software's*,
and the only 2003 tune with a name is Lamby's boot jingle (chase_the_clouds). Restorify Media is the programme's media
arm — the people who turn a person into a testimony — and it needs a brand of its own. Two songs, both ours, both the
system's (OPERABLE register: system media may charm; the satire is theirs):

  restorify_media_theme_2003   — THE BRAND'S OPENING SONG. Upbeat, glossy, a little over the top: a corporate-
      inspirational dance-pop sting of 2003, 126 BPM, D major, 16 bars (30.5 s, seamless loop): a four-on-the-floor
      kick, a clap, an off-beat open hat, off-beat supersaw stabs and a pumping bass (all ducked by the kick: the
      "sidechain" that made everything of the period breathe), a glassy arpeggio through a dotted-eighth echo, a
      riser and a crash into the second half, a big gliding lead with the tune, and — because the brand is sure
      it is uplifting — a KEY LIFT a whole step up for the last four bars (E major) that swings back to D through an
      A7sus. Plays under the Restorify Media window while he fills in its forms (the prep, the release, the tapes'
      folder, the editor); never under the footage itself.

  restorify_testimony_bed_2003 — THE BED UNDER DANIEL'S STORY (the cut Restorify Media makes of him). The sound
      "uplifting testimony" video bed had in 2003: a soft piano arpeggio, a slow string pad that swells for four
      bars, one warm flute-like voice with the tune climbing to the top, a cello root, a big hall; C major, 80 BPM,
      C · Am · F · G · C. SINCERE-SOUNDING ON PURPOSE and never mocking Daniel: the manipulation is in the swell
      (the programme knows exactly where the tears go), not in any wink. 17 s, one shot, shaped to the cut: the
      story is 13.3 s (7 blocks × 1.9 s), so the climax is the fourth bar (9–12 s), the resolution lands at 12 s
      and rings out under the end of the picture and the page after it.

⚑ S408 (UiB job 32 Part C, his headset run of 20 Nov): the bed is 32 s now, the picture having grown to 28 s (03-9; its
section below says how), and two more: restorify_media_calm_2003, the calm loop that plays where the theme did (03-7; the
theme's file is kept, unused, for a place he will choose), and restorify_teaser_bed_2003, Caleb's teaser's quiet piano in
place of the infomercial song and the hall's tone (03-10). `python3 tools/make_restorify_media_songs.py bed teaser calm`
renders only those.

⚑ tools/make_tones.sh's law holds: no found sound, no sample, no imitation of any real piece — every partial is
written out here. Deterministic (seeded): the same bytes every run. Voices are imported from the era change's own
(make_era_change_audio.py), as make_close_song.py does.

Usage: python3 tools/make_restorify_media_songs.py
       (writes assets/audio/<stem>.wav and publishes public/assets/audio/<stem>.mp3 with lame -V4)
"""
import os
import sys

import numpy as np
from scipy.signal import butter, lfilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_era_change_audio import (  # noqa: E402
    SR, TAU, hz, smooth, place, saw, hall, write,
)


def lp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), btype='low')
    return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), btype='high')
    return lfilter(b, a, x)


def bp(x, f0, f1):
    b, a = butter(2, [f0 / (SR / 2), f1 / (SR / 2)], btype='band')
    return lfilter(b, a, x)


# ════════════════════════════════════════ 1 · THE THEME ════════════════════════════════════════

BPM = 126.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 16
L = BARS * BAR            # 30.48 s
TAIL = 4.0
OFF = 1.0

# (bass root, the stab/pad voicing, the arpeggio's tones)
CH = {
    'D':    (38, [62, 66, 69, 76], [74, 78, 81, 86, 78, 81]),
    'A':    (33, [61, 64, 69, 71], [73, 76, 81, 83, 76, 81]),
    'Bm':   (35, [59, 62, 66, 69], [71, 74, 78, 81, 74, 78]),
    'G':    (31, [59, 62, 67, 69], [71, 74, 79, 81, 74, 79]),
    'Asus': (33, [62, 64, 69, 74], [74, 76, 81, 86, 76, 81]),
    'E':    (40, [64, 68, 71, 78], [76, 80, 83, 90, 80, 83]),
    'C#m':  (37, [61, 64, 68, 71], [73, 76, 80, 83, 76, 80]),
    'A7s':  (33, [62, 64, 67, 69], [74, 76, 79, 81, 76, 79]),
}
PROG = ['D', 'A', 'Bm', 'G',  'D', 'A', 'Bm', 'Asus',
        'G', 'A', 'Bm', 'A',  'E', 'C#m', 'A', 'A7s']
# the tune (bars 9–16): (bar index from 0, beat, MIDI, beats)
TUNE = [
    (8, 0, 71, 1), (8, 1, 74, 1), (8, 2, 79, 2),
    (9, 0, 78, 1), (9, 1, 76, 1), (9, 2, 73, 2),
    (10, 0, 74, 1), (10, 1, 78, 1), (10, 2, 81, 1), (10, 3, 78, 1),
    (11, 0, 76, 1.5), (11, 1.5, 78, 0.5), (11, 2, 80, 2),
    (12, 0, 83, 2), (12, 2, 81, 1), (12, 3, 80, 1),
    (13, 0, 81, 1), (13, 1, 80, 1), (13, 2, 76, 2),
    (14, 0, 81, 1), (14, 1, 85, 1), (14, 2, 88, 2),
    (15, 0, 86, 2), (15, 2, 83, 2),
]
# the head's bell motif (bars 1 and 5): the brand's "ding" and its answer
BELLS = [(0, 0, 86), (0, 1.5, 90), (4, 0, 86), (4, 1.5, 81), (4, 2.5, 90)]


def kick():
    n = int(0.34 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.028)
    ph = TAU * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.13) * np.minimum(1, t / 0.002)
            + 0.25 * np.exp(-t / 0.004) * np.sin(TAU * 1900 * t))


def clap(rng):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 3800)
    env = sum(np.exp(-np.maximum(0, t - d) / 0.011) * (t >= d) for d in (0, 0.011, 0.023)) * 0.5
    env += 0.5 * np.exp(-t / 0.09) * (t >= 0.023)
    return nz * env


def hat(rng, length, decay):
    n = int(length * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t / decay)


def crash(rng, length=1.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 3800) * np.exp(-t / 0.42) * np.minimum(1, t / 0.003)


def riser(rng, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    k = t / length
    nz = hp(rng.standard_normal(n), 1800) * (k ** 2.2)
    f = 300 * 2 ** (3.0 * k)
    ph = TAU * np.cumsum(f) / SR
    return nz * 0.45 + np.sin(ph) * (k ** 2.6) * 0.5


def glass(freq, vel, dur=0.5):
    """a glassy pluck for the arpeggio: sine and two bright partials, a quick decay"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.002) * np.exp(-t / 0.075)
    return vel * env * (np.sin(TAU * freq * t) + 0.45 * np.sin(TAU * 2 * freq * t) * np.exp(-t / 0.04)
                        + 0.2 * np.sin(TAU * 3.01 * freq * t) * np.exp(-t / 0.03))


def bell(freq, vel, dur=2.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, a, dec in ((1.0, 1.0, 1.1), (2.76, 0.5, 0.6), (5.4, 0.28, 0.35), (8.9, 0.12, 0.2)):
        out += a * np.sin(TAU * freq * ratio * t) * np.exp(-t / dec)
    return vel * out * np.minimum(1, t / 0.002)


def theme():
    rng = np.random.default_rng(2003)
    total = OFF + L + TAIL
    n = int(total * SR)
    bus = np.zeros((2, n))
    tt_all = np.arange(n) / SR

    # the sidechain: every beat ducks the tonal layers, then they swell back — the period's "breathing"
    ph = ((tt_all - OFF) % BEAT) / BEAT
    pump = 1 - 0.62 * np.exp(-ph * BEAT / 0.12)
    pump = np.where(tt_all < OFF, 1.0, pump)

    # ── drums ──
    K, C, HO, HC = kick(), clap(rng), hat(rng, 0.14, 0.04), hat(rng, 0.05, 0.012)
    for b in range(BARS):
        t0 = b * BAR
        for beat in range(4):
            place(bus, K * 0.34, OFF + t0 + beat * BEAT, 0.0)
            if b >= 1:
                place(bus, HO * 0.10, OFF + t0 + beat * BEAT + BEAT / 2, 0.25)      # the off-beat open hat
            if b >= 2 and beat in (1, 3):
                place(bus, C * 0.26, OFF + t0 + beat * BEAT, 0.0)
            if b >= 3:
                for s in (BEAT / 4, 3 * BEAT / 4):
                    place(bus, HC * 0.04, OFF + t0 + beat * BEAT + s, -0.25)

    # ── the bass, on the off-beat 8ths ──
    bass = np.zeros(n)
    for b, name in enumerate(PROG):
        root = CH[name][0]
        for e in range(8):
            if e % 2 == 0 and b >= 1:
                continue                                            # the kick has the on-beats after the first bar
            t0 = OFF + b * BAR + e * BEAT / 2
            m = int(0.30 * SR)
            tt = np.arange(m) / SR
            f = np.full(m, hz(root + (12 if e in (3, 7) else 0)))
            note = (np.sin(TAU * np.cumsum(f) / SR) + 0.35 * saw(f, m, rng)) * np.exp(-tt / 0.17) * np.minimum(1, tt / 0.004)
            i = int(t0 * SR)
            if i + m <= n:
                bass[i:i + m] += note * 0.10
    bass = lp(bass, 520) * pump
    bus[0] += bass
    bus[1] += bass

    # ── the stabs: off-beat supersaw chords (bars 3 onward), with a held pad under bars 5 onward ──
    stab = np.zeros(n)
    for b, name in enumerate(PROG):
        if b < 2:
            continue
        for e in (1, 3, 5, 7):
            t0 = OFF + b * BAR + e * BEAT / 2
            m = int(0.28 * SR)
            tt = np.arange(m) / SR
            env = np.minimum(1, tt / 0.003) * np.exp(-tt / 0.11)
            seg = np.zeros(m)
            for note in CH[name][1]:
                for det in (-0.13, 0.0, 0.13):
                    f = np.full(m, hz(note) * 2 ** (det / 12))
                    seg += saw(f, m, rng)
            i = int(t0 * SR)
            if i + m <= n:
                stab[i:i + m] += seg * env * 0.0185
    stab = lp(stab, 4200) * pump
    bus[0] += stab * 0.95
    bus[1] += stab

    pad = np.zeros(n)
    for b, name in enumerate(PROG):
        if b < 4:
            continue
        a0, a1 = OFF + b * BAR - 0.3, min(total, OFF + (b + 1) * BAR + 0.5)
        i0, i1 = int(a0 * SR), int(a1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        env = smooth(tt / 0.5) * (1 - smooth((tt - (m / SR - 0.8)) / 0.8))
        for note in CH[name][1]:
            for det in (-0.08, 0.08):
                f = np.full(m, hz(note - 12) * 2 ** (det / 12))
                pad[i0:i1] += env * saw(f, m, rng) * 0.024
    pad = lp(pad, 2400) * pump
    bus[0] += pad
    bus[1] += pad

    # ── the arpeggio: glass plucks on the 16ths from bar 5, through a ping-pong dotted-eighth echo ──
    arp = np.zeros((2, n))
    for b, name in enumerate(PROG):
        if b < 4:
            continue
        tones = CH[name][2]
        for s in range(16):
            note = tones[(s * 2 + (s // 4)) % len(tones)] + (12 if (b >= 8 and s % 8 == 7) else 0)
            vel = 0.062 if b < 8 else 0.052
            place(arp, glass(hz(note), vel), OFF + b * BAR + s * BEAT / 4, 0.55 if s % 2 else -0.55)
    d = int(0.75 * BEAT * SR)
    dry = arp.copy()
    for rep, g in ((1, 0.38), (2, 0.16)):
        arp[0, d * rep:] += dry[1, :n - d * rep] * g          # the echo crosses over
        arp[1, d * rep:] += dry[0, :n - d * rep] * g
    bus += arp

    # ── the bells: the brand's ding, bars 1 and 5 ──
    for bar, beat, note in BELLS:
        place(bus, bell(hz(note), 0.07), OFF + bar * BAR + beat * BEAT, 0.2 if bar == 0 else -0.2)

    # ── the lead: a big, gliding, slightly detuned voice with the tune (bars 9–16), vibrato once it holds ──
    lead_t0, lead_t1 = 8 * BAR - 0.05, 16 * BAR + 0.6
    i0, i1 = int((OFF + lead_t0) * SR), int((OFF + lead_t1) * SR)
    m = i1 - i0
    tt = np.arange(m) / SR
    step = np.full(m, hz(TUNE[0][2]))
    gate = np.zeros(m)
    for bar, beat, note, held in TUNE:
        on = bar * BAR + beat * BEAT - lead_t0
        off = on + held * BEAT
        j, jo = int(on * SR), int(min(m, off * SR))
        if 0 <= j < m:
            step[j:] = hz(note)
            gate[j:jo] = 1.0
    g = 1 - np.exp(-1 / (0.025 * SR))
    f, _ = lfilter([g], [1, -(1 - g)], step, zi=[step[0] * (1 - g)])
    f *= 2 ** ((9 * np.sin(TAU * 5.6 * tt) * smooth(tt / 1.5)) / 1200.0)
    ga = np.exp(-1 / (0.012 * SR))
    gs = lfilter([1 - ga], [1, -ga], gate)               # a soft gate: each note its own breath, no clicks
    voice = np.zeros(m)
    for det in (-0.09, 0.0, 0.09):
        voice += saw(f * 2 ** (det / 12), m, rng)
    voice += 0.5 * np.sin(TAU * np.cumsum(f * 2) / SR)
    voice = lp(voice, 5200) * gs * 0.066
    lead = np.zeros(n)
    lead[i0:i1] = voice
    bus[0] += lead * 0.9
    bus[1] += np.roll(lead, int(0.013 * SR))

    # ── the riser into bar 9 and the crash at its top; a second crash and a glitter on the key lift (bar 13) ──
    place(bus, riser(rng, 1.5 * BAR) * 0.12, OFF + 8 * BAR - 1.5 * BAR, 0.0)
    place(bus, crash(rng) * 0.20, OFF + 8 * BAR, 0.0)
    place(bus, crash(rng) * 0.17, OFF + 12 * BAR, 0.0)
    place(bus, bell(hz(88), 0.06, 2.2), OFF + 12 * BAR, 0.3)

    bus = hall(bus, 1.8, 0.2, seed=2003)

    # ── the seam: the tail and the pre-roll are folded so that the loop never clicks ──
    o, nl = int(OFF * SR), int(L * SR)
    out = bus[:, o:o + nl].copy()
    tail = bus[:, o + nl:]
    out[:, :tail.shape[1]] += tail
    out[:, nl - o:] += bus[:, :o]
    return out


# ════════════════════════════════════════ 2 · THE TESTIMONY BED ════════════════════════════════════════
# ⚑ S408 / 03-9 (his headset, 20 Nov 21:50: "the music is shorter than the actual video") — the bed was shaped to a
#   13.3 s cut (7 blocks × 1.9 s). S369's reading rule gave each block its reading time, so the story now runs 28.0 s
#   (BEFORE 2.4 · the first sentence 6.0 · THE PROGRAM 2.8 · the second 5.6 · AFTER 2.4 · the third 6.0 · CALL NOW 2.8)
#   and the music stopped 11 s before the picture, under AFTER. The bed is now the progression twice and its resolution:
#   C · Am · F · G, the piano alone, quiet, under BEFORE and the first sentence; C · Am · F · G again with the strings
#   and the voice climbing, the swell peaking under "I'm not who I was"; the resolution landing as CALL NOW comes up
#   (24 s), ringing out under it and the page after. 32 s in all. Same voices, same key, same tempo, same intent.

BPM2 = 80.0
BEAT2 = 60.0 / BPM2
BAR2 = 4 * BEAT2          # 3.0 s
SONG2 = 32.0              # the whole bed, tail included
PICTURE2 = 28.0           # the story's length (testimony.ts versionDur(2)); the resolution lands before it ends

C2, AM2, F2, G2 = (
    (36, [55, 60, 64, 67, 72], [60, 64, 67, 72, 67, 64, 67, 64]),     # C
    (33, [57, 60, 64, 69, 72], [57, 60, 64, 69, 64, 60, 64, 60]),     # Am
    (29, [57, 60, 65, 69, 72], [57, 60, 65, 69, 65, 60, 65, 60]),     # F
    (31, [55, 59, 62, 67, 74], [55, 59, 62, 67, 62, 59, 62, 59]),     # G
)
CRES2 = (36, [55, 60, 64, 67, 76], [60, 64, 67, 72, 76, 72, 67, 64])  # C (resolved, higher)
CH2 = [C2, AM2, F2, G2, C2, AM2, F2, G2, CRES2]
LAST2 = len(CH2) - 1      # the resolution's bar (24 s)
# the voice's tune, second time through: (bar, beat, MIDI, beats) — it climbs to the top and rests on the C
TUNE2 = [
    (4, 2, 76, 2),
    (5, 0, 76, 2), (5, 2, 74, 1), (5, 3, 72, 1),
    (6, 0, 77, 2), (6, 2, 81, 2),
    (7, 0, 83, 2), (7, 2, 81, 1), (7, 3, 79, 1),
    (8, 0, 84, 5),
]


def piano(freq, vel, dur=2.2):
    """a soft felt piano: three partials, the upper ones dying first, a gentle hammer"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.006) * np.exp(-t / 1.0)
    tone = (np.sin(TAU * freq * t) + 0.38 * np.sin(TAU * 2 * freq * t) * np.exp(-t / 0.5)
            + 0.14 * np.sin(TAU * 3.003 * freq * t) * np.exp(-t / 0.25))
    return vel * env * tone


def testimony():
    rng = np.random.default_rng(1998)
    n = int(SONG2 * SR)
    bus = np.zeros((2, n))
    tt_all = np.arange(n) / SR
    peak = LAST2 * BAR2   # 24 s: the resolution

    # the swell: a quiet floor through the first statement, rising bar by bar through the second, holding at the
    #   resolution, easing off as the picture ends
    swell = 0.12 + 0.88 * smooth((tt_all - 11.0) / (peak - 11.0)) * (1 - smooth((tt_all - (PICTURE2 - 1.0)) / 4.0))
    swell = swell * smooth(tt_all / 1.0)

    # ── the piano: an 8th-note arpeggio, each bar its chord; softer the first time through, firmer as the swell climbs ──
    for b, (_, _, tones) in enumerate(CH2):
        for e, note in enumerate(tones):
            vel = (0.048 + 0.042 * min(1, max(0, b - 3) / 4)) * (0.9 if e % 2 else 1.0)
            place(bus, piano(hz(note), vel), b * BAR2 + e * BEAT2 / 2, -0.15 + 0.3 * (e / 8))
    place(bus, piano(hz(48), 0.07, 4.5), LAST2 * BAR2, 0.0)       # the resolution: the low C once more, long

    # ── the strings: detuned saws through a low-pass that opens with the swell; in from the third bar ──
    pad = np.zeros(n)
    for b, (_, voicing, _) in enumerate(CH2):
        if b < 2:
            continue
        a0, a1 = b * BAR2 - 0.9, min(SONG2, (b + 1) * BAR2 + 1.4)
        if b == LAST2:
            a1 = SONG2
        i0, i1 = max(0, int(a0 * SR)), int(a1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        rel = 3.2 if b == LAST2 else 1.6
        env = smooth(tt / 1.3) * (1 - smooth((tt - (m / SR - rel)) / rel))
        for note in voicing:
            for det in (-0.07, 0.0, 0.07):
                f = np.full(m, hz(note) * 2 ** (det / 12))
                pad[i0:i1] += env * saw(f, m, rng) * 0.015
    pad = pad * swell
    open_k = smooth((tt_all - 17.0) / 6.0)
    strings = lp(pad, 1500) * (1 - open_k) + lp(pad, 3300) * open_k
    bus[0] += strings * 0.95
    bus[1] += strings

    # ── the cello root, from the second bar ──
    cello = np.zeros(n)
    for b, (root, _, _) in enumerate(CH2):
        if b < 1:
            continue
        a0, a1 = b * BAR2 - 0.25, min(SONG2, (b + 1) * BAR2 + 0.6)
        if b == LAST2:
            a1 = SONG2
        i0, i1 = int(a0 * SR), int(a1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        rel = 2.6 if b == LAST2 else 0.8
        env = smooth(tt / 0.6) * (1 - smooth((tt - (m / SR - rel)) / rel))
        f = np.full(m, hz(root + 12) * (1 + 0.0035 * np.sin(TAU * 4.8 * tt)))
        cello[i0:i1] += env * (np.sin(TAU * np.cumsum(f) / SR) + 0.3 * saw(f, m, rng)) * 0.05
    cello = lp(cello, 700) * swell
    bus[0] += cello
    bus[1] += cello

    # ── the voice: a warm flute-like line (sine + a little breath), entering in the second statement ──
    t0 = TUNE2[0][0] * BAR2 + TUNE2[0][1] * BEAT2
    t1 = LAST2 * BAR2 + 5 * BEAT2
    i0, i1 = int(t0 * SR), int(t1 * SR)
    m = i1 - i0
    tt = np.arange(m) / SR
    step = np.full(m, hz(TUNE2[0][2]))
    gate = np.zeros(m)
    for bar, beat, note, held in TUNE2:
        on = bar * BAR2 + beat * BEAT2 - t0
        j, jo = int(on * SR), int(min(m, (on + held * BEAT2 - 0.06) * SR))
        if 0 <= j < m:
            step[j:] = hz(note)
            gate[j:jo] = 1.0
    gl = 1 - np.exp(-1 / (0.05 * SR))
    f, _ = lfilter([gl], [1, -(1 - gl)], step, zi=[step[0] * (1 - gl)])
    f *= 2 ** ((14 * np.sin(TAU * 5.0 * tt) * smooth(tt / 2.0)) / 1200.0)
    ga = np.exp(-1 / (0.09 * SR))
    gs = lfilter([1 - ga], [1, -ga], gate)
    ph = TAU * np.cumsum(f) / SR
    breath = lp(rng.standard_normal(m), 3500) * 0.05
    voice = (np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph) + breath) * gs
    voice *= 0.075 * (0.55 + 0.45 * np.minimum(1, tt / 11.0))
    vox = np.zeros(n)
    vox[i0:i1] = voice
    bus[0] += vox * 0.9
    bus[1] += np.roll(vox, int(0.009 * SR))

    # ── a last sparkle on the resolution: one soft bell at the top ──
    place(bus, bell(hz(96), 0.020, 3.0), LAST2 * BAR2 + 0.25, 0.25)

    bus = hall(bus, 3.6, 0.38, seed=1998)
    # a gentle fade-out over the last 2.5 s: a one-shot that has finished, never a clip cut off
    bus *= 1 - smooth((tt_all - (SONG2 - 2.5)) / 2.5)
    return bus


# ════════════════════════════════════════ 3 · CALEB'S TEASER ════════════════════════════════════════
# ⚑ S408 / 03-10 (his headset, 20 Nov 21:51: "do not use the New You… and also the noise of a wind… it was just
#   distracting with unable to read the text… redo that audio from Caleb's testimony") — the teaser had the infomercial's
#   song under it and the hall's tone (the 'wind'). Now: the DVD's own quiet bed, a felt piano alone in F, 72 BPM,
#   F · Dm · B♭ · C, a little reverb, nothing under it. It sits beneath the two subtitles and asks for no attention;
#   testimony.ts stops it dead on the cut (on "Daniel—"), so the cut is still heard. 13 s, one shot.

BPM3 = 72.0
BEAT3 = 60.0 / BPM3
BAR3 = 4 * BEAT3          # 3.33 s
SONG3 = 13.0
CH3 = [
    [53, 57, 60, 65, 69, 65, 60, 57],     # F
    [50, 53, 57, 62, 65, 62, 57, 53],     # Dm
    [46, 50, 53, 58, 62, 58, 53, 50],     # B♭
    [48, 52, 55, 60, 64, 60, 55, 52],     # C
]


def teaser():
    n = int(SONG3 * SR)
    bus = np.zeros((2, n))
    tt_all = np.arange(n) / SR
    for b, tones in enumerate(CH3):
        for e, note in enumerate(tones):
            vel = 0.05 * (0.85 if e % 2 else 1.0) * (1.0 if e else 1.15)
            place(bus, piano(hz(note), vel, 2.6), b * BAR3 + e * BEAT3 / 2, -0.2 + 0.4 * (e / 8))
        place(bus, piano(hz(tones[0] - 12), 0.04, 3.2), b * BAR3, 0.0)   # the bass note of the bar, held
    bus = hall(bus, 2.4, 0.24, seed=2003)
    bus *= smooth(tt_all / 0.3) * (1 - smooth((tt_all - (SONG3 - 2.0)) / 2.0))
    return bus


# ════════════════════════════════════════ 4 · RESTORIFY MEDIA, CALM ════════════════════════════════════════
# ⚑ S408 / 03-7 (his headset, 20 Nov 21:49: "it's a bit too disco to be from this style… the song is really good, maybe
#   not for here because it's a little bit too hyped up"; his 21 Nov "Yes" to a quieter track, the theme's file kept for a
#   place he will choose) — what plays while he works in Restorify Media's window (the story's topics, the release, the
#   tapes, the editor, the saved file). The brand's music on hold: a soft electric piano comping on the off-beats, a warm
#   pad, a round bass, a brushed shaker, and the brand's bell motif once, quieter, every eight bars — G major, 88 BPM,
#   G · Em · C · D · G · Em · Am · D, 8 bars (21.8 s), a seamless loop. No kick, no clap, no sidechain, no supersaw.

BPM4 = 88.0
BEAT4 = 60.0 / BPM4
BAR4 = 4 * BEAT4          # 2.727 s
BARS4 = 8
L4 = BARS4 * BAR4
CH4 = {
    'G':  (43, [59, 62, 66, 71]),
    'Em': (40, [59, 62, 67, 71]),
    'C':  (36, [59, 64, 67, 71]),
    'D':  (38, [57, 62, 66, 69]),
    'Am': (45, [57, 60, 64, 67]),
}
PROG4 = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D']


def epiano(freq, vel, dur=1.6):
    """a soft electric piano: a sine with a bell-ish second partial that dies fast, and a slow tremolo"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.7)
    trem = 1 + 0.08 * np.sin(TAU * 4.6 * t)
    tone = np.sin(TAU * freq * t) + 0.22 * np.sin(TAU * 4.0 * freq * t) * np.exp(-t / 0.09) + 0.1 * np.sin(TAU * 2 * freq * t)
    return vel * env * tone * trem


def calm():
    rng = np.random.default_rng(2008)
    total = OFF + L4 + TAIL
    n = int(total * SR)
    bus = np.zeros((2, n))
    for b, name in enumerate(PROG4):
        root, voicing = CH4[name]
        t0 = OFF + b * BAR4
        # the piano's comping: the chord on beat 1, again on the "and" of 2, a soft echo on 4
        for at, v in ((0.0, 0.034), (1.5, 0.026), (3.0, 0.018)):
            for k, note in enumerate(voicing):
                place(bus, epiano(hz(note), v * (1.0 if k else 0.9)), t0 + at * BEAT4 + k * 0.006, -0.25 + 0.5 * k / 3)
        # the bass: the root on 1, the fifth on 3
        for at, note in ((0.0, root), (2.0, root + 7)):
            m = int(1.3 * SR)
            tt = np.arange(m) / SR
            place(bus, 0.07 * np.sin(TAU * hz(note) * tt) * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.55), t0 + at * BEAT4, 0.0)
        # the pad: the voicing, two sines a hair apart, swelling in and out over the bar
        m = int((BAR4 + 0.6) * SR)
        tt = np.arange(m) / SR
        env = smooth(tt / 0.8) * (1 - smooth((tt - (BAR4 - 0.4)) / 1.0))
        padseg = np.zeros(m)
        for note in voicing:
            for det in (-0.04, 0.04):
                padseg += np.sin(TAU * hz(note) * 2 ** (det / 12) * tt)
        place(bus, lp(padseg * env * 0.006, 1800), t0, 0.0)
        # the shaker: 8ths, very soft, the off-beats a little louder
        for e in range(8):
            m = int(0.09 * SR)
            tt = np.arange(m) / SR
            place(bus, hp(rng.standard_normal(m), 6000) * np.exp(-tt / 0.025) * (0.010 if e % 2 else 0.006),
                  t0 + e * BEAT4 / 2, 0.2)
    # the brand's ding, once, at the top of the loop — softer than the theme's
    for bar, beat, note in ((0, 0, 86), (0, 1.5, 90)):
        place(bus, bell(hz(note), 0.012, 2.0), OFF + bar * BAR4 + beat * BEAT4, 0.25)
    bus = hall(bus, 2.0, 0.22, seed=2008)
    # the seam (as the theme's): the tail and the pre-roll folded so the loop never clicks
    o, nl = int(OFF * SR), int(L4 * SR)
    out = bus[:, o:o + nl].copy()
    tail = bus[:, o + nl:]
    out[:, :tail.shape[1]] += tail
    out[:, nl - o:] += bus[:, :o]
    return out


if __name__ == '__main__':
    # ⚑ S408 — name what to render (`theme bed teaser calm`); with no names, all four. Deterministic either way.
    only = set(sys.argv[1:])
    if not only or 'theme' in only:
        write('restorify_media_theme_2003', theme(), 0.8)
    if not only or 'bed' in only:
        write('restorify_testimony_bed_2003', testimony(), 0.8)
    if not only or 'teaser' in only:
        write('restorify_teaser_bed_2003', teaser(), 0.8)
    if not only or 'calm' in only:
        write('restorify_media_calm_2003', calm(), 0.8)
