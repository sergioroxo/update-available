#!/usr/bin/env python3
"""tools/make_hymn.py — THE UN-WALK PROGRAMME LOOP (R3-17, 2026-09-20).

Sérgio: "this needs a song of the programmes of the time to fill the void" — a
programme loop, MIDI-hymn register, while the Un-Walk wizard is open. Ours,
synthesized (tools/make_tones.sh's law: no found sound, no real OS sound), and
deterministic: the same bytes every run.

What it is: a 1997 soundcard's General-MIDI "church organ" playing a four-part
hymn progression in A minor that keeps leaning towards C major and never quite
arrives — sixteen chords, two seconds each, thirty-two seconds, seamless at the
join (the last chord is the dominant, the first the tonic). Organ = a fundamental
with three softer partials, a slow attack, a small chorus detune; no rhythm, no
melody line — a hymn's accompaniment with nobody singing.

Usage: python3 tools/make_hymn.py assets/audio/unwalk_loop_1997.wav
"""
import math
import struct
import sys
import wave

SR = 22050
CHORD_SEC = 2.0
# MIDI note numbers, bass up — close voicings a hymnal would print
CHORDS = {
    'Am': [45, 57, 60, 64], 'F': [41, 57, 60, 65], 'C': [48, 55, 60, 64],
    'G': [43, 55, 59, 62], 'E': [40, 56, 59, 64], 'Dm': [50, 57, 62, 65],
}
PROGRESSION = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E',
               'F', 'C', 'G', 'Am', 'Dm', 'F', 'E', 'E']
PARTIALS = [(1.0, 1.0), (2.0, 0.45), (3.0, 0.22), (4.0, 0.10)]
ATTACK, RELEASE = 0.18, 0.30


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def main(out):
    n_chord = int(SR * CHORD_SEC)
    total = n_chord * len(PROGRESSION)
    buf = [0.0] * total
    for ci, name in enumerate(PROGRESSION):
        notes = CHORDS[name]
        base = ci * n_chord
        for vi, midi in enumerate(notes):
            f = hz(midi)
            amp = 0.55 if vi == 0 else 0.40   # the bass carries
            for k in range(n_chord):
                t = k / SR
                env = min(1.0, t / ATTACK) * min(1.0, (CHORD_SEC - t) / RELEASE)
                s = 0.0
                for mult, pa in PARTIALS:
                    # a 0.3 % detune on the second voice of each partial: the soundcard's chorus
                    s += pa * (math.sin(2 * math.pi * f * mult * t)
                               + 0.5 * math.sin(2 * math.pi * f * mult * 1.003 * t + 0.7))
                buf[base + k] += amp * env * s
    # a slow tremolo the way a cheap organ patch had one, and a soft ceiling
    peak = max(abs(v) for v in buf)
    out_samples = []
    for i, v in enumerate(buf):
        t = i / SR
        v = v / peak * 0.5 * (0.92 + 0.08 * math.sin(2 * math.pi * 5.5 * t))
        out_samples.append(int(max(-1.0, min(1.0, v)) * 32767))
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(struct.pack('<%dh' % len(out_samples), *out_samples))
    print('wrote %s (%.1fs)' % (out, total / SR))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/audio/unwalk_loop_1997.wav')
