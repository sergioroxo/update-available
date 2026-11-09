#!/usr/bin/env python3
"""tools/make_graceloop.py — GRACEPLATFORM'S OWN MUSIC (S337, his 9 Nov: "you can make one as well").

2016's platform plays one calm loop under the work: the register of a wellness app of the time. Soft pads, a gentle
plucked figure, nothing that asks for attention. It is the platform's voice, so it never plays under a person's
words (the caller in src/room/graceQueueLite.ts stops it for the Story Record and when her phone is brought forward).

Ours, synthesized (tools/make_tones.sh's law: no found sound, no real OS or app sound), deterministic: the same
bytes every run. Sixteen chords of four seconds each (64 s), in C major leaning on its sevenths, ending on the
dominant so the join back to the first chord is seamless.

Usage: python3 tools/make_graceloop.py assets/audio/grace_loop_2016.wav
       lame --quiet -V5 assets/audio/grace_loop_2016.wav public/assets/audio/grace_loop_2016.mp3
"""
import math
import sys
import wave

import numpy as np

SR = 22050
CHORD_SEC = 4.0
BPM = 90.0
CHORDS = {  # MIDI notes, bass then a close voicing
    'Cmaj7': [48, 60, 64, 67, 71], 'Am7': [45, 60, 64, 67, 69], 'Fmaj7': [41, 60, 64, 65, 69],
    'G6': [43, 59, 62, 64, 67], 'Em7': [40, 59, 62, 64, 67], 'Dm7': [38, 60, 62, 65, 69],
    'Gsus': [43, 60, 62, 67, 72],
}
PROGRESSION = ['Cmaj7', 'Am7', 'Fmaj7', 'G6', 'Cmaj7', 'Em7', 'Fmaj7', 'Gsus',
               'Am7', 'Em7', 'Fmaj7', 'Cmaj7', 'Dm7', 'Am7', 'Fmaj7', 'G6']
PLUCK_PATTERN = [1, 2, 3, 4, 3, 2, 1, 2]   # indices into the chord's upper voices, eighth notes


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def main(out):
    n_total = int(SR * CHORD_SEC * len(PROGRESSION))
    mix = np.zeros(n_total)
    t_chord = np.arange(int(SR * CHORD_SEC)) / SR
    # pads: two detuned sines per note, slow swell, overlapping into the next chord so the joins breathe
    for i, name in enumerate(PROGRESSION):
        start = int(i * SR * CHORD_SEC)
        dur = CHORD_SEC + 1.2
        t = np.arange(int(SR * dur)) / SR
        env = np.minimum(1, t / 1.1) * np.minimum(1, np.maximum(0, (dur - t) / 1.2))
        pad = np.zeros_like(t)
        for k, m in enumerate(CHORDS[name][1:]):
            f = hz(m)
            pad += (np.sin(2 * math.pi * f * t) + 0.6 * np.sin(2 * math.pi * f * 1.004 * t + k)) * 0.06
        bass = np.sin(2 * math.pi * hz(CHORDS[name][0]) * t) * 0.10
        seg = (pad + bass) * env
        idx = (np.arange(len(seg)) + start) % n_total   # wraps the tail onto the start: a seamless loop
        np.add.at(mix, idx, seg)
    # the plucked figure: eighth notes, a fast-decaying sine with a soft octave, a little quieter on the off-beats
    eighth = 60.0 / BPM / 2
    n_pluck = int(SR * 1.2)
    tp = np.arange(n_pluck) / SR
    pluck_env = np.exp(-tp * 4.5) * np.minimum(1, tp / 0.004)
    step = 0
    t0 = 0.0
    while t0 < CHORD_SEC * len(PROGRESSION) - 1e-9:
        ci = int(t0 // CHORD_SEC)
        chord = CHORDS[PROGRESSION[ci]]
        m = chord[PLUCK_PATTERN[step % len(PLUCK_PATTERN)]] + 12
        f = hz(m)
        vel = 0.075 if step % 2 == 0 else 0.05
        if (step // 8) % 4 == 3 and step % 8 >= 4:
            vel *= 0.4   # every fourth bar thins out, so it breathes
        note = (np.sin(2 * math.pi * f * tp) + 0.25 * np.sin(2 * math.pi * 2 * f * tp)) * pluck_env * vel
        start = int(t0 * SR)
        idx = (np.arange(n_pluck) + start) % n_total
        np.add.at(mix, idx, note)
        step += 1
        t0 += eighth
    # gentle low-pass (one-pole) and normalise to -3 dBFS
    y = np.zeros_like(mix)
    a = 0.35
    prev = 0.0
    for _ in range(2):   # run twice so the loop's start sees its own end
        for i in range(n_total):
            prev = prev + a * (mix[i] - prev)
            y[i] = prev
    y = y / np.max(np.abs(y)) * 0.707
    pcm = (y * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'wrote {out}: {n_total / SR:.1f} s')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/audio/grace_loop_2016.wav')
