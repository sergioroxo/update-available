#!/usr/bin/env python3
"""tools/make_releasework_loop.py — RELEASE WORK'S MUSIC (S351, UiB job 10, his TODO T34: "music in every program").

Release Work is the racket exercise (data/provotypes/pillow.json): the Un-Walk programme's wizard, a diagram of a
figure raising a tennis racket, exhaling, and striking a pillow "while you name him". Its own law (provotype.ts
drawFigure): administrative, not kinaesthetic — "it must NOT feel like a satisfying swing". So its music has NO beat
and no rhythm to swing to. It is the other thing a 1990s programme like this would have shipped with: a
guided-relaxation cassette. Breathing pads that swell and fall on an eight-second in-and-out, a breathy pan-flute
tune in long, slow phrases, a low drone, sparse wind chimes. Calm, soft, a little new-age, in E dorian. The calm is
the point: a wellness tape under an exercise that asks you to strike.

Kept apart from the other programme loops: unwalk_loop_1997 (make_hymn.py) is a church organ; fellowship_loop_1997
a praise chorus in 4/4 with brushes; familyform_loop_1997 a 3/4 music box in D; rootcause_loop_1997 a bouncy
shareware tune; restorify_loop_2003 a bossa with a drum machine; grace_loop_2016 sine pads and a pluck in C.

Ours, synthesized (tools/make_tones.sh's law: no found sound, no imitation of any real OS, app, game, tape or CD-ROM
sound — every part is written out below), deterministic: the same bytes every run (the chimes come from a seeded
generator). Twelve bars of slow 4/4 at 60 BPM (48 s), seamless: every tail, echo and filter state wraps from the end
onto the start, and the breathing rate divides the loop exactly.

Usage: python3 tools/make_releasework_loop.py
       (writes assets/audio/releasework_loop_1997.wav and public/assets/audio/releasework_loop_1997.mp3 with lame)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 22050
BPM = 60.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STEM = 'releasework_loop_1997'

# bass root, then the pad's open voicing (fourths and fifths, the cassette's "spacious" sound)
CHORDS = {
    'Em9': (40, [55, 59, 62, 66]), 'A/E': (40, [57, 61, 64, 69]), 'Cmaj7': (36, [55, 59, 64, 67]),
    'D6/9': (38, [54, 57, 59, 64]), 'Bm7': (35, [54, 57, 62, 66]), 'Asus2': (45, [57, 59, 64, 69]),
}
PROGRESSION = ['Em9', 'A/E', 'Em9', 'A/E', 'Cmaj7', 'D6/9', 'Em9', 'Bm7', 'Cmaj7', 'D6/9', 'Em9', 'Asus2']
# the pan flute: bar -> [(beat, beats, midi)] — long notes, rests between phrases (you breathe in the rests)
MELODY = {
    0: [(1, 2, 71), (3, 1, 74)], 1: [(0, 3, 76)],
    2: [(1, 1.5, 74), (2.5, 1.5, 71)], 3: [(0, 3, 69)],
    4: [(1, 2, 67), (3, 1, 71)], 5: [(0, 2, 69), (2, 2, 66)],
    6: [(0, 3.5, 64)],
    8: [(1, 2, 76), (3, 1, 79)], 9: [(0, 2, 78), (2, 1.5, 76)],
    10: [(0, 2, 74), (2, 2, 71)], 11: [(0, 3.5, 69)],
}
# the breathing: one in-and-out per this many seconds (48 / 8 = 6 breaths, so the join cannot hear it)
BREATH = 8.0

N_TOTAL = int(round(SR * BAR * len(PROGRESSION)))
LOOP_SEC = N_TOTAL / SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(bus, seg, t0):
    idx = (np.arange(len(seg)) + int(round(t0 * SR))) % N_TOTAL   # wraps every tail onto the start
    np.add.at(bus, idx, seg)


def two_laps(b, a, x):
    return lfilter(b, a, np.concatenate([x, x]))[len(x):]


def pad_note(midi, dur):
    """a soft 'warm pad': three detuned sines and a quiet octave, a slow attack and a long release into the next bar"""
    f0 = hz(midi)
    n = int((dur + 2.0) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v, cents in enumerate((-7, 0, 7)):
        f = f0 * 2 ** (cents / 1200)
        out += np.sin(2 * math.pi * f * t + v) + 0.22 * np.sin(4 * math.pi * f * t + 2 * v) + 0.08 * np.sin(6 * math.pi * f * t)
    e = np.minimum(1, t / 1.6) * np.clip((dur + 2.0 - t) / 2.0, 0, 1)
    return out * e


def flute_note(midi, dur, rng):
    """a breathy pan flute: a sine with a little second harmonic, a slow vibrato that grows in, and a puff of filtered
    breath at the start of each note"""
    f = hz(midi)
    n_on, n_tail = int(dur * SR), int(0.5 * SR)
    t = np.arange(n_on + n_tail) / SR
    vib = 1 + 0.004 * np.minimum(1, t / 0.8) * np.sin(2 * math.pi * 5.1 * t)
    ph = 2 * math.pi * f * np.cumsum(vib) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    e = np.minimum(1, t / 0.09) * (0.85 + 0.15 * np.exp(-t * 3))
    e[n_on:] *= np.linspace(1, 0, n_tail)
    breath = rng.standard_normal(len(t))
    b, a = butter(2, [min(0.95, 0.6 * f / (SR / 2)), min(0.98, 1.6 * f / (SR / 2))], btype='band')
    breath = lfilter(b, a, breath) * (0.5 * np.exp(-t * 9) + 0.07) * np.minimum(1, t / 0.02)
    breath[n_on:] *= np.linspace(1, 0, n_tail)
    return tone * e + breath * 1.4


def chime(midi, vel):
    """a wind chime: a bar's inharmonic partials, a soft strike, a long ring"""
    f = hz(midi)
    t = np.arange(int(3.0 * SR)) / SR
    tone = (np.sin(2 * math.pi * f * t) * np.exp(-t * 1.1)
            + 0.4 * np.sin(2 * math.pi * f * 2.76 * t) * np.exp(-t * 2.2)
            + 0.15 * np.sin(2 * math.pi * f * 5.40 * t) * np.exp(-t * 4.5))
    tone *= np.minimum(1, t / 0.002)
    tone[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return tone * vel


def drone(midi):
    """the low E under everything, the whole loop long (a sine and a soft fifth)"""
    t = np.arange(N_TOTAL) / SR
    f = hz(midi)
    # integer cycles over the loop so the drone joins without a click
    f = round(f * LOOP_SEC) / LOOP_SEC
    f5 = round(f * 1.5 * LOOP_SEC) / LOOP_SEC
    return np.sin(2 * math.pi * f * t) + 0.3 * np.sin(2 * math.pi * f5 * t)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) or 1.0


def main():
    rng = np.random.default_rng(1997)
    pads = np.zeros(N_TOTAL)
    flute = np.zeros(N_TOTAL)
    chimes = np.zeros(N_TOTAL)
    for bar, name in enumerate(PROGRESSION):
        t_bar = bar * BAR
        root, voicing = CHORDS[name]
        for m in voicing:
            place(pads, pad_note(m, BAR), t_bar)
        for beat, beats, m in MELODY.get(bar, []):
            place(flute, flute_note(m, beats * BEAT * 0.97, rng), t_bar + beat * BEAT)
    # the chimes: E minor pentatonic, high, at seeded unevenly spaced moments (never on a grid: no pulse)
    pent = [76, 79, 81, 83, 86, 88]
    t = 1.3
    while t < LOOP_SEC - 0.5:
        for k in range(int(rng.integers(1, 4))):
            place(chimes, chime(int(rng.choice(pent)), 0.5 + 0.5 * rng.random()), t + k * (0.11 + 0.09 * rng.random()))
        t += 2.6 + 3.8 * rng.random()
    low = drone(28 + 12)   # E2
    b, a = butter(2, 1400 / (SR / 2))
    pads = two_laps(b, a, pads)
    # the breathing: the pads swell in for four seconds and fall away for four, six times in the loop
    breath_hz = round(LOOP_SEC / BREATH) / LOOP_SEC
    pads *= 0.62 + 0.38 * (0.5 - 0.5 * np.cos(2 * math.pi * breath_hz * np.arange(N_TOTAL) / SR))
    parts = [(flute, 0.95), (pads, 0.8), (chimes, 0.32), (low, 0.30)]
    mix = sum(p / rms(p) * g for p, g in parts)
    # a big, soft 'cassette hall', circular
    for d, g in [(0.113, 0.28), (0.197, 0.22), (0.311, 0.16), (0.457, 0.11), (0.641, 0.08), (0.887, 0.05)]:
        mix = mix + g * np.roll(mix, int(d * SR))
    b, a = butter(2, 4800 / (SR / 2))
    write(two_laps(b, a, mix), 0.89)


def write(y, peak):
    y = y / np.max(np.abs(y)) * peak
    wav = os.path.join(ROOT, 'assets/audio', f'{STEM}.wav')
    mp3 = os.path.join(ROOT, 'public/assets/audio', f'{STEM}.mp3')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    subprocess.run(['lame', '--quiet', '-V5', wav, mp3], check=True)
    print(f'wrote {STEM}: {len(y) / SR:.2f} s, peak {20 * math.log10(peak):.1f} dBFS')


if __name__ == '__main__':
    sys.exit(main())
