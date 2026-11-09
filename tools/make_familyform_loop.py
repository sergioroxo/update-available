#!/usr/bin/env python3
"""tools/make_familyform_loop.py — THE FAMILY FORM'S MENU MUSIC (S343, UiB job 3: the 1997 design list).

Behind the ministry's "For Families" intake form: the loop a 1997 CD-ROM "for parents" played on its menu screen
while you decided whether to fill it in. Gentle, reassuring, a little clinical: a music-box / celesta arpeggio
turning over in eighths, a soft General-MIDI electric piano carrying a slow tune, warm filtered pads, a round sub
bass. A lullaby's 3/4 at 78 BPM in D major — but the major keeps borrowing its minor (G goes to G minor, D leans on
B minor and F# minor), so the reassurance has worry under it. No drums: nothing here hurries you.

Kept apart from the other programme loops: fellowship_loop_1997 (tools/make_fellowship_loop.py) is a praise chorus
with piano, choir and brushes in 4/4; unwalk_loop_1997 (tools/make_hymn.py) is an organ with no rhythm;
grace_loop_2016 (tools/make_graceloop.py) is pure sine pads and a pluck in C major at 90 BPM, 4/4.

Ours, synthesized (tools/make_tones.sh's law: no found sound, no imitation of any real OS, app, game or CD-ROM
sound — every part is written out below), deterministic: the same bytes every run. Twenty bars of 3/4 (~46.2 s),
seamless: the last bar is A-sus (the dominant, unresolved) and every tail, echo and filter state wraps from the end
onto the start.

Usage: python3 tools/make_familyform_loop.py
       (writes assets/audio/familyform_loop_1997.wav, then
        lame --quiet -V5 assets/audio/familyform_loop_1997.wav public/assets/audio/familyform_loop_1997.mp3)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 22050
BPM = 78.0
BEAT = 60.0 / BPM
BAR = 3 * BEAT
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STEM = 'familyform_loop_1997'

# bass root, then the pad's voicing (also the music box's four tones, an octave up)
CHORDS = {
    'D': (38, [57, 62, 66, 69]), 'Bm': (35, [54, 59, 62, 66]), 'G': (43, [55, 59, 62, 67]),
    'Gm': (43, [55, 58, 62, 67]), 'F#m': (42, [54, 57, 61, 66]), 'Em7': (40, [55, 59, 62, 64]),
    'A': (45, [57, 61, 64, 69]), 'Asus': (45, [57, 62, 64, 69]),
}
PROGRESSION = (['D', 'Bm', 'G', 'Gm', 'D', 'F#m', 'Em7', 'Asus']      # it is all right
               + ['D', 'Bm', 'G', 'Gm', 'Bm', 'F#m', 'G', 'A']        # it is all right, really
               + ['Em7', 'Gm', 'D', 'Asus'])                          # (is it?)
# the tune, on the electric piano: bar -> [(beat, beats, midi)]
MELODY = {
    0: [(0, 2, 78), (2, 1, 76)], 1: [(0, 3, 74)], 2: [(0, 2, 71), (2, 1, 74)], 3: [(0, 3, 70)],
    4: [(0, 2, 69), (2, 1, 74)], 5: [(0, 3, 73)], 6: [(0, 2, 71), (2, 1, 74)], 7: [(0, 3, 76)],
    8: [(0, 2, 81), (2, 1, 78)], 9: [(0, 2, 78), (2, 1, 74)], 10: [(0, 3, 79)], 11: [(0, 2, 79), (2, 1, 77)],
    12: [(0, 3, 78)], 13: [(0, 2, 76), (2, 1, 73)], 14: [(0, 2, 74), (2, 1, 71)], 15: [(0, 3, 73)],
    16: [(0, 3, 71)], 17: [(0, 2, 70), (2, 1, 74)], 18: [(0, 3, 78)], 19: [(0, 3, 76)],
}
BOX_FIGURE = [0, 1, 2, 3, 2, 1]   # eighths through the chord's four tones, an octave up

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
    """a warm pad: two detuned band-limited saws (filtered later), a slow swell, a long release into the next bar"""
    f0 = hz(midi)
    n = int((dur + 1.0) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v, cents in enumerate((-5, 5)):
        f = f0 * 2 ** (cents / 1200)
        for k in range(1, 30):
            if f * k > 3000:
                break
            out += np.sin(2 * math.pi * f * k * t + 1.3 * k * v) / k
    e = np.minimum(1, t / 0.7) * np.clip((dur + 1.0 - t) / 1.0, 0, 1)
    return out * e


def box_note(midi, vel):
    """a music box / celesta: a sine with a tine's inharmonic partials that die fast, a small strike"""
    f = hz(midi)
    t = np.arange(int(1.4 * SR)) / SR
    tone = (np.sin(2 * math.pi * f * t) * np.exp(-t * 2.4)
            + 0.22 * np.sin(2 * math.pi * f * 3.93 * t) * np.exp(-t * 14)
            + 0.08 * np.sin(2 * math.pi * f * 6.81 * t) * np.exp(-t * 30))
    tone *= np.minimum(1, t / 0.0015)
    tone[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return tone * vel


def ep_note(midi, dur, vel):
    """a soft GM electric piano: two-operator FM with a low, quickly falling index — a tine, not a bark"""
    f = hz(midi)
    n_on, n_tail = int(dur * SR), int(0.35 * SR)
    t = np.arange(n_on + n_tail) / SR
    index = 0.9 * np.exp(-t * 5) + 0.12
    tone = np.sin(2 * math.pi * f * t + index * np.sin(2 * math.pi * f * t))
    tone += 0.35 * np.sin(2 * math.pi * f * 1.0025 * t + index * np.sin(2 * math.pi * f * t))   # the chorus
    e = np.exp(-t * 1.1) * np.minimum(1, t / 0.004)
    e[n_on:] *= np.linspace(1, 0, n_tail)
    return tone * e * vel


def sub(midi, dur):
    f = hz(midi)
    t = np.arange(int((dur + 0.3) * SR)) / SR
    e = np.minimum(1, t / 0.06) * np.exp(-t * 0.9) * np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    return (np.sin(2 * math.pi * f * t) + 0.18 * np.sin(4 * math.pi * f * t)) * e


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) or 1.0


def main():
    pads = np.zeros(N_TOTAL)
    box = np.zeros(N_TOTAL)
    ep = np.zeros(N_TOTAL)
    low = np.zeros(N_TOTAL)
    eighth = BEAT / 2
    for bar, name in enumerate(PROGRESSION):
        t_bar = bar * BAR
        root, voicing = CHORDS[name]
        for m in voicing:
            place(pads, pad_note(m, BAR), t_bar)
        place(low, sub(root, BAR * 0.95), t_bar)
        for i, step in enumerate(BOX_FIGURE):
            place(box, box_note(voicing[step] + 12, 1.0 if i == 0 else 0.7), t_bar + i * eighth)
        for beat, beats, m in MELODY.get(bar, []):
            place(ep, ep_note(m, beats * BEAT * 0.96, 1.0), t_bar + beat * BEAT)
    b, a = butter(2, 950 / (SR / 2))
    pads = two_laps(b, a, pads)              # the pad's warmth: everything above ~1 kHz rolled away
    # a slow swell on the pads at a rate that divides the loop exactly, so the join cannot hear it
    swell_hz = round(0.11 * LOOP_SEC) / LOOP_SEC
    pads *= 1 - 0.18 * (0.5 + 0.5 * np.sin(2 * math.pi * swell_hz * np.arange(N_TOTAL) / SR))
    parts = [(ep, 1.0), (box, 0.45), (pads, 0.62), (low, 0.42)]
    mix = sum(p / rms(p) * g for p, g in parts)
    # a soft, longish room (the CD-ROM's 'hall'), circular
    for d, g in [(0.089, 0.24), (0.163, 0.17), (0.251, 0.12), (0.367, 0.08), (0.523, 0.05)]:
        mix = mix + g * np.roll(mix, int(d * SR))
    b, a = butter(2, 5200 / (SR / 2))
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
