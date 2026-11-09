#!/usr/bin/env python3
"""tools/make_irc_tones.py — THE CHANNEL'S OTHER TWO SOUNDS (S339, his TODO T50).

The IRC app (src/desktop/apps/irc.ts) already has its line tick, `irc_1997` (tools/make_tones.sh, R3-25: one soft
short tick, only for his own lines). This adds the two a 1997 chat client's sound scheme also had:

  irc_join  — someone joins the channel (here: he does). A small RISING two-note blip, F5 then C6, a band-limited
              square (odd partials at 1/n) — a soundcard being friendly. 0.22 s.
  irc_dm    — a private message (Rob's request, Rob's file). Brighter and a little more insistent: three notes
              rising (Bb5 · Eb6 · G6) and the top struck again, a triangle-ish voice with a short bell partial.
              0.62 s.

⚑ tools/make_tones.sh's law holds: these are NOT imitations of mIRC's, Windows', ICQ's or MSN's sounds — every
partial is written out below, and the intervals are chosen to sit away from the piece's own chimes (chime_2003 is
A5→D6, alert_2003 E5→A5, lambient_chime C6→E6). Deterministic: the same bytes every run.

Usage: python3 tools/make_irc_tones.py
       (writes assets/audio/irc_join.wav + irc_dm.wav and publishes public/assets/audio/*.mp3 with lame -V5)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

SR = 22050
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def note(f, length, decay, partials, attack=0.002):
    t = np.arange(int(length * SR)) / SR
    tone = sum(a * np.sin(2 * math.pi * f * k * t) for k, a in partials if f * k < SR / 2 * 0.9)
    e = np.exp(-t * decay) * np.minimum(1, t / attack)
    e[-int(0.006 * SR):] *= np.linspace(1, 0, int(0.006 * SR))   # no click at the cut
    return tone * e


def lay(parts, total):
    buf = np.zeros(int(total * SR))
    for t0, seg in parts:
        i = int(t0 * SR)
        n = min(len(seg), len(buf) - i)
        buf[i:i + n] += seg[:n]
    return buf


def smooth(y, a=0.6):
    out = np.zeros_like(y)
    prev = 0.0
    for i, v in enumerate(y):
        prev += a * (v - prev)
        out[i] = prev
    return out


def write(stem, y, peak):
    y = y / np.max(np.abs(y)) * peak
    wav = os.path.join(ROOT, 'assets/audio', f'{stem}.wav')
    mp3 = os.path.join(ROOT, 'public/assets/audio', f'{stem}.mp3')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    subprocess.run(['lame', '--quiet', '-V5', wav, mp3], check=True)
    print(f'wrote {stem}: {len(y) / SR:.2f} s, peak {20 * math.log10(peak):.1f} dBFS')


SQUARE = [(1, 1.0), (3, 1 / 3), (5, 1 / 5), (7, 1 / 7)]
TRIANGLE_BELL = [(1, 1.0), (3, -1 / 9), (5, 1 / 25), (2.76, 0.18)]


def main():
    join = lay([(0.0, note(698.46, 0.08, 22, SQUARE) * 0.8),
                (0.07, note(1046.5, 0.15, 20, SQUARE))], 0.22)
    write('irc_join', smooth(join, 0.55), 0.25)

    dm = lay([(0.0, note(932.33, 0.30, 11, TRIANGLE_BELL) * 0.75),
              (0.075, note(1244.51, 0.30, 11, TRIANGLE_BELL) * 0.85),
              (0.15, note(1567.98, 0.32, 10, TRIANGLE_BELL)),
              (0.30, note(1567.98, 0.32, 10, TRIANGLE_BELL) * 0.8)], 0.62)
    write('irc_dm', smooth(dm, 0.7), 0.32)


if __name__ == '__main__':
    sys.exit(main())
