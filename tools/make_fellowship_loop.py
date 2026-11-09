#!/usr/bin/env python3
"""tools/make_fellowship_loop.py — THE FELLOWSHIP'S MIDI HYMN (S343, UiB job 3: the 1997 design list).

1997's ex-gay "fellowship network" has a homepage on a free host, in a webring, and the page plays a .mid through
<bgsound> the moment it loads. So this is that file as a 1997 sound card rendered it: a General-MIDI piano a little
too stiff (every note quantised to the grid, every velocity nearly the same), a "Choir Aahs" pad holding the chords,
a soft fingered bass, brushes and a ride. A praise chorus in G major at 84 BPM: earnest, a bit cheesy, sweet — the
sound of a page that is sure it is welcoming you.

Kept apart from the other programme loops by register: unwalk_loop_1997 (tools/make_hymn.py) is a church organ in A
minor with no rhythm and no tune; this one has a tune, a beat and a choir. restorify_loop_2003 is a bossa with a drum
machine; grace_loop_2016 is slow sine pads.

Ours, synthesized (tools/make_tones.sh's law: no found sound, no imitation of any real OS, app, game or hymn — the
tune and the progression are written out below), deterministic (the noise comes from a seeded generator): the same
bytes every run. Sixteen bars (~45.7 s), seamless: the last bar is the dominant with a pickup into the first, and
every tail, echo and filter state wraps from the end onto the start.

Usage: python3 tools/make_fellowship_loop.py
       (writes assets/audio/fellowship_loop_1997.wav, then
        lame --quiet -V5 assets/audio/fellowship_loop_1997.wav public/assets/audio/fellowship_loop_1997.mp3)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 22050
BPM = 84.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STEM = 'fellowship_loop_1997'

# bass root, the choir's close voicing, and whether the third is minor (for the piano's arpeggio)
CHORDS = {
    'G': (43, [59, 62, 67], 4), 'D': (38, [57, 62, 66], 4), 'Em': (40, [59, 64, 67], 3),
    'C': (36, [60, 64, 67], 4), 'Am7': (45, [60, 64, 67], 3),
}
PROGRESSION = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D',
               'Em', 'C', 'G', 'D', 'C', 'G', 'Am7', 'D']
# the tune: bar -> [(beat, beats, midi)]; a praise chorus, stepwise, singable, the last bar a pickup into the first
MELODY = {
    0: [(0, 1, 71), (1, 1, 71), (2, 1.5, 74), (3.5, 0.5, 72)],
    1: [(0, 2, 71), (2, 1, 69), (3, 1, 66)],
    2: [(0, 1, 67), (1, 1, 69), (2, 1.5, 71), (3.5, 0.5, 67)],
    3: [(0, 1, 72), (1, 1, 71), (2, 2, 69)],
    4: [(0, 1, 71), (1, 1, 71), (2, 1.5, 74), (3.5, 0.5, 76)],
    5: [(0, 2, 78), (2, 1, 76), (3, 1, 74)],
    6: [(0, 1.5, 76), (1.5, 0.5, 74), (2, 2, 72)],
    7: [(0, 3, 74)],
    8: [(0, 1, 79), (1, 1, 78), (2, 1.5, 76), (3.5, 0.5, 74)],
    9: [(0, 2, 76), (2, 1, 72), (3, 1, 74)],
    10: [(0, 1.5, 74), (1.5, 0.5, 72), (2, 2, 71)],
    11: [(0, 1, 69), (1, 1, 71), (2, 2, 74)],
    12: [(0, 1.5, 76), (1.5, 0.5, 76), (2, 1, 79), (3, 1, 76)],
    13: [(0, 2, 74), (2, 1, 71), (3, 1, 72)],
    14: [(0, 2, 71), (2, 2, 69)],
    15: [(0, 2.5, 69), (3, 1, 74)],
}

N_TOTAL = int(round(SR * BAR * len(PROGRESSION)))
LOOP_SEC = N_TOTAL / SR
rng = np.random.default_rng(1997)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(bus, seg, t0):
    idx = (np.arange(len(seg)) + int(round(t0 * SR))) % N_TOTAL   # wraps every tail onto the start
    np.add.at(bus, idx, seg)


def two_laps(b, a, x):
    """filter the loop twice round so its start sees its own end (no state jump at the seam)"""
    return lfilter(b, a, np.concatenate([x, x]))[len(x):]


def piano(midi, dur, vel):
    """a GM acoustic grand as a 1997 wavetable played it: stiff-string partials, a two-stage decay, a hammer tick"""
    f = hz(midi)
    n_on, n_tail = int(dur * SR), int(0.22 * SR)
    t = np.arange(n_on + n_tail) / SR
    reg = (f / 262.0) ** 0.5            # high notes die sooner
    tone = np.zeros_like(t)
    for k in range(1, 11):
        fk = f * k * math.sqrt(1 + 0.00035 * k * k)
        if fk > 0.42 * SR:
            break
        d = (0.9 + 0.75 * k) * reg
        e = 0.72 * np.exp(-t * d * 2.2) + 0.28 * np.exp(-t * d * 0.35)
        a = 1.0 / k ** 1.15
        tone += a * e * (np.sin(2 * math.pi * fk * t + 0.4 * k) + 0.35 * np.sin(2 * math.pi * fk * 1.0013 * t))
    ham = rng.standard_normal(int(0.006 * SR))
    tone[:len(ham)] += 0.10 * ham * np.linspace(1, 0, len(ham))
    damp = np.ones_like(t)
    damp[n_on:] = np.linspace(1, 0, n_tail)    # the damper comes down
    return tone * damp * np.minimum(1, t / 0.0025) * vel


def choir(midi, dur, voice_seed):
    """'Choir Aahs': three slightly detuned voices, vibrato fading in, harmonics shaped by an 'ah' formant"""
    f0 = hz(midi)
    n = int((dur + 0.5) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v, cents in enumerate((-7, 0, 6)):
        f = f0 * 2 ** (cents / 1200)
        vib = 1 + 0.0045 * np.sin(2 * math.pi * (5.1 + 0.3 * v) * t + voice_seed + v) * np.minimum(1, t / 0.7)
        ph = 2 * math.pi * np.cumsum(f * vib) / SR
        for k in range(1, 16):
            fk = f * k
            if fk > 3600:
                break
            g = (np.exp(-((fk - 730) / 170) ** 2) + 0.55 * np.exp(-((fk - 1090) / 190) ** 2)
                 + 0.22 * np.exp(-((fk - 2440) / 260) ** 2) + 0.05)
            out += g / k ** 0.6 * np.sin(k * ph + 0.9 * k * v)
    e = np.minimum(1, t / 0.32) * np.clip((dur + 0.5 - t) / 0.5, 0, 1)
    return out * e


def bass(midi, dur, vel):
    f = hz(midi)
    n_on, n_tail = int(dur * SR), int(0.06 * SR)
    t = np.arange(n_on + n_tail) / SR
    tone = np.sin(2 * math.pi * f * t) + 0.32 * np.sin(4 * math.pi * f * t) + 0.10 * np.sin(6 * math.pi * f * t)
    e = np.exp(-t * 2.2) * np.minimum(1, t / 0.008)
    e[n_on:] *= np.linspace(1, 0, n_tail)
    return tone * e * vel


RIDE_PARTIALS = [(2731, 1.0), (3217, 0.8), (4049, 0.7), (4877, 0.55), (5963, 0.45), (7309, 0.35), (8461, 0.25)]


def ride(vel):
    t = np.arange(int(0.55 * SR)) / SR
    m = sum(a * np.sin(2 * math.pi * f * t + i) for i, (f, a) in enumerate(RIDE_PARTIALS))
    n = np.diff(rng.standard_normal(len(t) + 1))
    return (0.6 * m * np.exp(-t * 7) + 0.3 * n * np.exp(-t * 18)) * np.minimum(1, t / 0.001) * vel


def brush(vel, length=0.16):
    t = np.arange(int(length * SR)) / SR
    n = rng.standard_normal(len(t))
    return n * np.minimum(1, t / 0.012) * np.exp(-t * 22) * vel


def kick(vel):
    t = np.arange(int(0.22 * SR)) / SR
    ph = 2 * math.pi * (50 * t + 55 * (1 - np.exp(-30 * t)) / 30)
    return np.sin(ph) * np.exp(-t * 18) * np.minimum(1, t / 0.002) * vel


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) or 1.0


def main():
    mel = np.zeros(N_TOTAL)
    arp = np.zeros(N_TOTAL)
    pad = np.zeros(N_TOTAL)
    low = np.zeros(N_TOTAL)
    kit = np.zeros(N_TOTAL)
    brushes = np.zeros(N_TOTAL)
    eighth = BEAT / 2
    for bar, name in enumerate(PROGRESSION):
        t_bar = bar * BAR
        root, voicing, third = CHORDS[name]
        # the tune, on the piano, a little louder than everything — a MIDI file's melody channel
        for beat, beats, m in MELODY.get(bar, []):
            place(mel, piano(m, beats * BEAT * 0.94, 1.0), t_bar + beat * BEAT)
        # the praise-piano left hand: root, fifth, octave, tenth, back down — straight eighths, one velocity
        r = root + 12
        figure = [r, r + 7, r + 12, r + 12 + third, r + 12, r + 7, r + 12, r + 12 + third]
        for i, m in enumerate(figure):
            place(arp, piano(m, eighth * 0.92, 1.0 if i % 4 == 0 else 0.8), t_bar + i * eighth)
        # the choir holds the chord, swelling into the next one
        for vi, m in enumerate(voicing):
            place(pad, choir(m, BAR, bar * 3 + vi), t_bar)
        # bass: root on 1, fifth on 3; the turnaround bar walks D, A, F# into the tonic's G
        fifth = root + 7 if root < 43 else root - 5
        notes = [(0, 1.8, root), (2, 1.8, fifth)] if bar != 15 else [(0, 1.8, root), (2, 0.9, root - 5), (3, 0.9, root + 4)]
        for beat, beats, m in notes:
            place(low, bass(m, beats * BEAT, 1.0), t_bar + beat * BEAT)
        # brushes and a ride, the GM brush kit: ride on every beat and the skip-note, kick on 1 and 3, swish on 2 and 4
        for beat in range(4):
            place(kit, ride(1.0 if beat % 2 == 0 else 0.8), t_bar + beat * BEAT)
        for beat in (1, 3):
            place(kit, ride(0.45), t_bar + (beat + 0.5) * BEAT)
            place(brushes, brush(1.0), t_bar + beat * BEAT)
        for beat in (0, 2):
            place(kit, kick(1.4), t_bar + beat * BEAT)
    # balance the parts by loudness (RMS), then mix
    parts = [(mel, 1.0), (arp, 0.42), (pad, 0.55), (low, 0.62), (kit, 0.13), (brushes, 0.09)]
    mix = sum(p / rms(p) * g for p, g in parts)
    # the sound card's reverb: a few circular echoes (np.roll wraps them onto the start) and a ~6.5 kHz low-pass
    mix = mix + 0.22 * np.roll(mix, int(0.071 * SR)) + 0.14 * np.roll(mix, int(0.137 * SR)) \
        + 0.08 * np.roll(mix, int(0.211 * SR)) + 0.04 * np.roll(mix, int(0.307 * SR))
    b, a = butter(2, 6500 / (SR / 2))
    y = two_laps(b, a, mix)
    write(y, 0.89)


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
