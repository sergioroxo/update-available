#!/usr/bin/env python3
"""tools/make_restorify_loop.py — RESTORIFY'S OWN MUSIC (S339, his TODO T34).

Restorify is 2003's "restoration" self-help programme: cheerful-clinical wellness software on a CD-ROM, the kind
whose menu screen played a General-MIDI loop while you decided whether to begin. So: a soft electric piano comping
a light bossa shuffle, a fingered bass, a side-stick, closed hats and a shaker, and a vibraphone tune that is
pleasant and goes nowhere. Upbeat and bland on purpose — the sound of a programme that is sure it is helping.

Kept apart from the other two programme loops by register: unwalk_loop_1997 (tools/make_hymn.py) is a church organ
with no rhythm; grace_loop_2016 (tools/make_graceloop.py) is slow pads at 90 BPM. This one has a drum machine and
a groove: 112 BPM, F major, 24 bars (~51 s).

Ours, synthesized (tools/make_tones.sh's law: no found sound, no real OS or app sound), deterministic (the noise
comes from a seeded generator): the same bytes every run. Seamless: the last bar is the dominant (C7sus), the first
the tonic, and every tail, echo and filter state wraps from the end onto the start.

Usage: python3 tools/make_restorify_loop.py assets/audio/restorify_loop_2003.wav
       lame --quiet -V5 assets/audio/restorify_loop_2003.wav public/assets/audio/restorify_loop_2003.mp3
"""
import math
import sys
import wave

import numpy as np
from scipy.signal import lfilter

SR = 22050
BPM = 112.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT

# electric-piano voicings (close, mid-register, the way a GM file voiced them) and the bass root
CHORDS = {
    'Fmaj7': (41, [57, 60, 64, 67]), 'Dm7': (38, [57, 60, 62, 65]), 'Gm7': (43, [58, 62, 65, 69]),
    'C7': (36, [58, 62, 64, 67]), 'C7sus': (36, [58, 62, 65, 67]), 'Am7': (45, [55, 60, 64, 67]),
    'Bbmaj7': (46, [57, 62, 65, 69]),
}
PROGRESSION = (['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Dm7', 'Gm7', 'C7sus']        # A: the groove alone
               + ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Am7', 'Dm7', 'Gm7', 'C7']          # A': the tune comes in
               + ['Bbmaj7', 'Am7', 'Gm7', 'C7', 'Bbmaj7', 'Am7', 'Gm7', 'C7sus'])  # B: the tune goes up, comes home
# the vibraphone tune: bar -> [(beat, beats, midi)]
MELODY = {
    0: [(0, 2.5, 77)], 7: [(2, 1, 74), (3, 1, 72)],
    8: [(0, 1.5, 77), (1.5, 0.5, 76), (2, 2, 72)], 9: [(0, 1, 74), (1, 1, 72), (2, 2, 69)],
    10: [(0, 1.5, 70), (1.5, 0.5, 72), (2, 2, 74)], 11: [(0, 1, 76), (1, 1, 74), (2, 1, 72), (3, 1, 70)],
    12: [(0, 1.5, 72), (1.5, 0.5, 76), (2, 2, 79)], 13: [(0, 1, 77), (1, 1, 76), (2, 2, 74)],
    14: [(0, 1, 74), (1, 0.5, 72), (1.5, 2.5, 70)], 15: [(0, 2, 72), (2, 2, 67)],
    16: [(0.5, 1, 74), (1.5, 0.5, 77), (2, 2, 81)], 17: [(0, 1, 79), (1, 1, 76), (2, 2, 72)],
    18: [(0.5, 1, 70), (1.5, 0.5, 74), (2, 2, 77)], 19: [(0, 1.5, 76), (1.5, 0.5, 74), (2, 2, 72)],
    20: [(0.5, 1, 74), (1.5, 0.5, 77), (2, 1, 81), (3, 1, 79)], 21: [(0, 2, 76), (2, 2, 72)],
    22: [(0, 1, 74), (1, 1, 72), (2, 2, 70)], 23: [(0, 3, 72)],
}
# bossa comping over two bars, in eighths; the last hit anticipates the next bar's chord
EP_HITS = [0, 3, 6, 10, 12, 15]
CLAVE = [0, 3, 6, 10, 12]   # the side-stick, 3-2 over the same two bars

N_TOTAL = int(round(SR * BAR * len(PROGRESSION)))
LOOP_SEC = N_TOTAL / SR
rng = np.random.default_rng(2003)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(bus, seg, t0):
    idx = (np.arange(len(seg)) + int(round(t0 * SR))) % N_TOTAL   # wraps every tail onto the start
    np.add.at(bus, idx, seg)


def env(n_on, n_tail, decay, attack=0.003):
    t = np.arange(n_on + n_tail) / SR
    e = np.exp(-t * decay) * np.minimum(1, t / attack)
    rel = np.ones_like(t)
    rel[n_on:] = np.linspace(1, 0, n_tail)
    return t, e * rel


def ep_note(midi, dur, vel):
    """a General-MIDI electric piano: two-operator FM, the bark of the index decaying, a short bell on top"""
    f = hz(midi)
    t, e = env(int(dur * SR), int(0.09 * SR), 1.6)
    index = 1.6 * np.exp(-t * 7) + 0.22
    tone = np.sin(2 * math.pi * f * t + index * np.sin(2 * math.pi * f * t))
    tone += 0.10 * np.sin(2 * math.pi * 4 * f * t) * np.exp(-t * 28)
    return tone * e * vel


def bass_note(midi, dur, vel):
    f = hz(midi)
    t, e = env(int(dur * SR), int(0.05 * SR), 3.2, 0.006)
    tone = np.sin(2 * math.pi * f * t) + 0.35 * np.sin(4 * math.pi * f * t) + 0.12 * np.sin(6 * math.pi * f * t)
    return tone * e * vel


def vibes_note(midi, dur, vel):
    f = hz(midi)
    t, e = env(int(dur * SR), int(0.35 * SR), 1.9, 0.002)
    tone = np.sin(2 * math.pi * f * t) + 0.22 * np.sin(2 * math.pi * 4 * f * t) * np.exp(-t * 9)
    return tone * e * vel


def kick():
    t = np.arange(int(0.25 * SR)) / SR
    phase = 2 * math.pi * (48 * t + 62 * (1 - np.exp(-25 * t)) / 25)   # 110 Hz falling to 48: the soft GM kick
    return np.sin(phase) * np.exp(-t * 16) * np.minimum(1, t / 0.002)


def side_stick():
    t = np.arange(int(0.06 * SR)) / SR
    n = np.diff(rng.standard_normal(len(t) + 1))
    return (0.6 * np.sin(2 * math.pi * 1720 * t) * np.exp(-t * 95) + 0.35 * n * np.exp(-t * 140))


def hat(length, decay):
    t = np.arange(int(length * SR)) / SR
    n = np.diff(rng.standard_normal(len(t) + 2), 2)   # twice-differenced noise: all top, no body
    return n * np.exp(-t * decay) * 0.5


def main(out):
    ep = np.zeros(N_TOTAL)
    other = np.zeros(N_TOTAL)
    eighth = BEAT / 2
    n_bars = len(PROGRESSION)
    for bar, name in enumerate(PROGRESSION):
        t_bar = bar * BAR
        root, voicing = CHORDS[name]
        # bass: root, a pickup, the fifth, a pickup — the bossa's walk in place
        fifth = root + 7 if root <= 43 else root - 5
        for beat, beats, m, v in [(0, 1.35, root, 0.17), (1.5, 0.4, root, 0.11), (2, 1.35, fifth, 0.15), (3.5, 0.4, fifth, 0.10)]:
            place(other, bass_note(m, beats * BEAT, v), t_bar + beat * BEAT)
        # drums
        for beat in (0, 2):
            place(other, kick() * 0.30, t_bar + beat * BEAT)
        for e8 in range(8):
            place(other, hat(0.05, 70) * (0.045 if e8 % 2 == 0 else 0.065), t_bar + e8 * eighth)
        for s16 in range(16):
            swing = 0.035 * BEAT if s16 % 2 else 0.0   # the shaker leans back: the shuffle
            place(other, hat(0.09, 32) * (0.016 if s16 % 2 else 0.026), t_bar + s16 * BEAT / 4 + swing)
        # vibraphone
        for beat, beats, m in MELODY.get(bar, []):
            place(other, vibes_note(m, beats * BEAT, 0.085), t_bar + beat * BEAT)
    # comping and clave run in two-bar cells
    for cell in range(n_bars // 2):
        t_cell = cell * 2 * BAR
        for i, e8 in enumerate(EP_HITS):
            nxt = EP_HITS[i + 1] if i + 1 < len(EP_HITS) else 16
            dur = min(3, nxt - e8 - 0.3) * eighth
            bar = (cell * 2 + (1 if e8 >= 8 else 0) + (1 if e8 == 15 else 0)) % n_bars
            for m in CHORDS[PROGRESSION[bar]][1]:
                place(ep, ep_note(m, dur, 0.055 if e8 % 8 == 0 else 0.045), t_cell + e8 * eighth)
        for e8 in CLAVE:
            place(other, side_stick() * 0.13, t_cell + e8 * eighth)
    # the EP's tremolo, at a rate that divides the loop exactly so the join cannot hear it
    trem_hz = round(4.6 * LOOP_SEC) / LOOP_SEC
    ep *= 1 - 0.14 * (0.5 + 0.5 * np.sin(2 * math.pi * trem_hz * np.arange(N_TOTAL) / SR))
    mix = ep + other
    # a small room, circular (np.roll wraps the echo of the last bar onto the first)
    mix = mix + 0.20 * np.roll(mix, int(0.083 * SR)) + 0.11 * np.roll(mix, int(0.151 * SR)) + 0.05 * np.roll(mix, int(0.233 * SR))
    # one-pole low-pass (~5 kHz) run over two laps so the loop's start sees its own end
    a = 0.75
    y = lfilter([a], [1, -(1 - a)], np.concatenate([mix, mix]))[N_TOTAL:]
    y = y / np.max(np.abs(y)) * 0.707
    pcm = (y * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'wrote {out}: {LOOP_SEC:.2f} s, peak {20 * math.log10(np.max(np.abs(pcm)) / 32767):.1f} dBFS')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/audio/restorify_loop_2003.wav')
