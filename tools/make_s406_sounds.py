#!/usr/bin/env python3
"""tools/make_s406_sounds.py — THREE SOUNDS HIS HEADSET RUN ASKED FOR (S406, UiB job 32 Part A, H5; his run of 20 Nov).

  press_1997      — 1997's ONE press sound. "I think we're missing a sound for when pressing on the stuff … either you need
                    to decide on that" (21:28:51). Every press on the 1997 glass now makes this, and nothing else does (the
                    update notice's own tick yields to it there). It is not the system's voice: it is DANIEL'S MOUSE, the
                    microswitch of a two-button ball mouse of the period — a hard plastic tick (a 1.5 ms burst, its
                    switch ringing at ~3.1 and ~5.4 kHz) over the hollow of the shell (~820 Hz, 18 ms). 45 ms. Quiet.
  irc_pop_1997    — a line arriving in the channel: "we need some sound of this space … the texts popping in" (21:37:12).
                    A soft, round blip, lower and duller than the client's own tick (irc_1997, which stays for his own
                    lines): a sine that drops a semitone as it sounds (D5 → C#5), its octave faint, through the same small
                    speaker's lowpass. 95 ms. Played quietly and never more than ~1.5 a second.
  net_try_2003    — "Contacting your accountability network…" (21:58:39: "This needs sound, something just to make it
                    more understanding what is happening"). The programme placing each call through the PC: a ringback
                    purr — two tones a minor third under a telephone's band (440 + 480 Hz, the dial tone family, no
                    one's trademark), banded to 300–3400 Hz as a 2003 VoIP plug-in would pass it — once per contact
                    tried. 1.0 s.
  net_fail_2003   — …and each one failing: the era's alert (alert_2003 is E5 → A5, a rise) turned DOWN, A4 → E4, short
                    and dull: the same voice saying no. Care and surveillance share a voice in 2003 (make_tones.sh); so do
                    reaching out and failing to. 0.42 s.

⚑ tools/make_tones.sh's law holds: nothing here imitates a real operating system's, a messenger's or a phone network's
recorded sound — every partial is written out below. Deterministic (the noise is seeded): the same bytes every run.

Usage: python3 tools/make_s406_sounds.py
       (writes assets/audio/<stem>.wav and publishes public/assets/audio/<stem>.mp3 with lame -V5)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

SR = 22050
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RNG = np.random.default_rng(406)


def t_of(length):
    return np.arange(int(length * SR)) / SR


def damped(f, length, decay, amp=1.0, phase=0.0):
    t = t_of(length)
    return amp * np.sin(2 * math.pi * f * t + phase) * np.exp(-t * decay)


def lowpass(y, cutoff):
    """one-pole lowpass (a small speaker's top end)"""
    a = 1 - math.exp(-2 * math.pi * cutoff / SR)
    out = np.zeros_like(y)
    prev = 0.0
    for i, v in enumerate(y):
        prev += a * (v - prev)
        out[i] = prev
    return out


def highpass(y, cutoff):
    return y - lowpass(y, cutoff)


def band(y, lo, hi):
    return lowpass(highpass(y, lo), hi)


def fade_edges(y, attack=0.001, release=0.006):
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    y = y.copy()
    y[:a] *= np.linspace(0, 1, a)
    y[-r:] *= np.linspace(1, 0, r)
    return y


def pad(y, total):
    out = np.zeros(int(total * SR))
    out[:min(len(y), len(out))] = y[:len(out)]
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
    print(f'wrote {stem}: {len(y) / SR:.3f} s, peak {20 * math.log10(peak):.1f} dBFS')


def press_1997():
    L = 0.045
    burst = np.zeros(int(L * SR))
    n = int(0.0015 * SR)
    burst[:n] = RNG.standard_normal(n) * np.linspace(1, 0.2, n)
    burst = highpass(burst, 2000)
    switch = damped(3100, L, 620, 0.55) + damped(5400, L, 900, 0.3, 0.7)
    shell = damped(820, L, 210, 0.42, 0.3)
    y = burst * 0.9 + switch + shell
    return fade_edges(lowpass(y, 7500), 0.0003, 0.008)


def irc_pop_1997():
    L = 0.095
    t = t_of(L)
    f = 587.33 * (1 - (1 - 2 ** (-1 / 12)) * np.minimum(1, t / 0.05))   # D5 sliding to C#5 over 50 ms
    ph = 2 * math.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.006) * np.exp(-t * 38)
    y = (np.sin(ph) + 0.14 * np.sin(2 * ph)) * env
    return fade_edges(lowpass(y, 2600), 0.002, 0.01)


def net_try_2003():
    L = 1.0
    t = t_of(L)
    purr = np.sin(2 * math.pi * 440 * t) + np.sin(2 * math.pi * 480 * t)
    env = np.minimum(1, t / 0.04) * np.minimum(1, (L - t) / 0.12)
    y = band(purr * env, 300, 3400)
    return pad(fade_edges(y, 0.01, 0.02), 1.05)


def net_fail_2003():
    sq = lambda f, L, d: sum(a * damped(f * k, L, d) for k, a in [(1, 1.0), (3, 1 / 3), (5, 1 / 5)])
    a = sq(440.0, 0.16, 16)
    b = sq(329.63, 0.30, 11)
    y = np.zeros(int(0.42 * SR))
    y[:len(a)] += a
    i = int(0.11 * SR)
    y[i:i + len(b)] += b[:len(y) - i]
    return fade_edges(lowpass(y, 2200), 0.002, 0.03)


def main():
    write('press_1997', press_1997(), 0.5)
    write('irc_pop_1997', irc_pop_1997(), 0.32)
    write('net_try_2003', net_try_2003(), 0.3)
    write('net_fail_2003', net_fail_2003(), 0.32)


if __name__ == '__main__':
    sys.exit(main())
