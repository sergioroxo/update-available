#!/usr/bin/env python3
"""tools/make_rootcause_sounds.py — ROOT CAUSE DIGGER'S SOUNDS (S343, UiB job 3: the 1997 design list).

Root Cause Digger is the programme's own game: 1997 shareware on the floppy it mails out, a dig-down DOS/Win95
mini-game in which Lamby digs through the layers of a life while "diagnoses" chase him, and pressing one pumps it up
until it bursts. Its sounds are what such a disk's sound driver could do — a PC speaker's squares and an Adlib-style
two-operator FM voice — but every figure is ours.

  rootcause_loop_1997 — the game loop. Bouncy shovelware: an FM bass on the beat, FM chord stabs on the off-beat,
                        a lead that is FM with a pulse wave under it, Adlib-ish drums. Cheerful and slightly wrong on
                        purpose (the satire is that this is the programme's game): every fourth bar is a bar of 3/4
                        (the tune hiccups), the third phrase swerves to A-flat, the lead sits ~18 cents flat of the
                        bass, and the last note sags. 168 BPM, C major, 16 bars / 60 beats (~21.4 s), seamless.
                        Kept thin and mid-range so it can sit under play.
  rootcause_dig       — one shovel-stroke: a low thud falling 160→55 Hz and a bit-crushed crunch of dirt. 0.12 s.
  rootcause_pump      — the inflate: a band-limited square stepping up 330→990 Hz in eight wheezing steps. 0.24 s.
  rootcause_burst     — a pop (noise + a falling thump) and a sparkle of seven square blips falling. 0.48 s.
  rootcause_applied   — a diagnosis reaches Lamby: a dull stamp and a low buzz stepping down 196→98 Hz. 0.45 s.
  rootcause_found     — the authentic memory, found. NOT satire: a soft, warm rolled F major-seventh in the
                        fourth octave over a quiet low F, sines with gentle partials. 1.15 s.
  rootcause_report    — "report printed": a dot-matrix chatter, then a deadpan square jingle (C E G · F D B) that
                        stops on the leading tone, unresolved, the whole thing a hair flat. 1.45 s.

⚑ tools/make_tones.sh's law holds: no found sound, no imitation of any real OS, app or game sound (not Dig Dug's,
not any shareware title's) — every partial and every note is written out below, and the chime keys sit away from
the piece's own (chime_2003 A5→D6, alert_2003 E5→A5, lambient_chime C6→E6, irc_join F5→C6, irc_dm B♭5·E♭6·G6).
Deterministic (seeded noise): the same bytes every run.

Usage: python3 tools/make_rootcause_sounds.py
       (writes the seven assets/audio/rootcause_*.wav and publishes public/assets/audio/*.mp3 with
        lame --quiet -V5 in.wav out.mp3)
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 22050
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rng = np.random.default_rng(1997_0343)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def write(stem, y, peak=0.89):
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


def fade_out(y, sec=0.006):
    n = int(sec * SR)
    y[-n:] *= np.linspace(1, 0, n)
    return y


def square_bl(phase, f_max, duty=0.5, top=7000):
    """a band-limited pulse from a phase array (radians); harmonics stop below `top` Hz"""
    out = np.zeros_like(phase)
    k = 1
    while f_max * k < top:
        c = 2 / (k * math.pi) * math.sin(math.pi * k * duty)
        if abs(c) > 1e-6:
            out += c * np.sin(k * phase)
        k += 1
    return out


def lay(parts, total):
    buf = np.zeros(int(total * SR))
    for t0, seg in parts:
        i = int(round(t0 * SR))
        n = min(len(seg), len(buf) - i)
        buf[i:i + n] += seg[:n]
    return buf


# ── THE LOOP ────────────────────────────────────────────────────────────────────────────────────────────────────────
BPM = 168.0
BEAT = 60.0 / BPM
LEAD_FLAT = 2 ** (-18 / 1200)   # the lead a little under the bass: shovelware tuning
METER = [4, 4, 4, 3] * 4        # the hiccup: every fourth bar drops a beat
CHORDS = {   # bass root, the off-beat stab's triad
    'C': (36, [60, 64, 67]), 'Am': (33, [57, 60, 64]), 'F': (41, [57, 60, 65]), 'G': (43, [55, 59, 62]),
    'Dm': (38, [57, 62, 65]), 'Ab': (44, [56, 60, 63]),
}
PROGRESSION = ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'C', 'Ab', 'G', 'C', 'F', 'Ab', 'G']
# bar -> [(beat, beats, midi, bend_semitones)]
_B1 = [(0, .5, 76, 0), (.5, .5, 79, 0), (1, 1, 84, 0), (2, .5, 79, 0), (2.5, .5, 76, 0), (3, 1, 72, 0)]
MELODY = {
    0: _B1,
    1: [(0, .5, 76, 0), (.5, .5, 81, 0), (1, 1, 84, 0), (2, .5, 81, 0), (2.5, .5, 76, 0), (3, 1, 69, 0)],
    2: [(0, .5, 77, 0), (.5, .5, 81, 0), (1, .5, 84, 0), (1.5, .5, 81, 0), (2, 1, 77, 0), (3, .5, 74, 0), (3.5, .5, 77, 0)],
    3: [(0, .5, 79, 0), (.5, .5, 74, 0), (1, .5, 71, 0), (1.5, .5, 74, 0), (2, 1, 79, 0)],
    4: _B1[:-1] + [(3, 1, 84, 0)],
    5: [(0, 1, 84, 0), (1, .5, 83, 0), (1.5, .5, 81, 0), (2, 1, 76, 0), (3, 1, 81, 0)],
    6: [(0, .5, 77, 0), (.5, .5, 81, 0), (1, .5, 86, 0), (1.5, .5, 84, 0), (2, .5, 81, 0), (2.5, .5, 77, 0), (3, 1, 74, 0)],
    7: [(0, .5, 79, 0), (.5, .5, 83, 0), (1, .5, 86, 0), (1.5, 1.5, 79, 0)],
    8: [(0, 1, 81, 0), (1, 1, 77, 0), (2, .5, 72, 0), (2.5, .5, 77, 0), (3, 1, 81, 0)],
    9: [(0, 1, 79, 0), (1, 1, 76, 0), (2, .5, 72, 0), (2.5, .5, 76, 0), (3, 1, 79, 0)],
    10: [(0, .5, 80, 0), (.5, .5, 84, 0), (1, 1, 87, 0), (2, .5, 84, 0), (2.5, .5, 80, 0), (3, 1, 75, 0)],
    11: [(0, 1.5, 79, 0), (1.5, .5, 77, 0), (2, 1, 74, 0)],
    12: _B1,
    13: [(0, .5, 77, 0), (.5, .5, 81, 0), (1, 1, 84, 0), (2, .5, 81, 0), (2.5, .5, 77, 0), (3, 1, 72, 0)],
    14: [(0, .5, 80, 0), (.5, .5, 84, 0), (1, 1, 80, 0), (2, 1, 75, 0), (3, .5, 74, 0), (3.5, .5, 71, 0)],
    15: [(0, .5, 74, 0), (.5, .5, 79, 0), (1, .5, 83, 0), (1.5, 1.5, 79, -1.0)],   # the sag
}
N_LOOP = int(round(SR * BEAT * sum(METER)))


def place(bus, seg, t0):
    idx = (np.arange(len(seg)) + int(round(t0 * SR))) % N_LOOP
    np.add.at(bus, idx, seg)


def gate_env(n_on, n_rel, attack, decay, sustain):
    t = np.arange(n_on + n_rel) / SR
    e = (sustain + (1 - sustain) * np.exp(-t * decay)) * np.minimum(1, t / attack)
    e[n_on:] *= np.linspace(1, 0, n_rel)
    return t, e


def lead(midi, dur, bend):
    f0 = hz(midi) * LEAD_FLAT
    gate = 0.97 if bend else 0.82   # the sagging note holds on into the downbeat, so the seam has no hole
    n_on, n_rel = int(dur * gate * SR), int(0.015 * SR)
    t, e = gate_env(n_on, n_rel, 0.003, 9, 0.55)
    ramp = np.clip((t - 0.06) / max(1e-3, dur * gate - 0.06), 0, 1) if bend else 0
    f = f0 * 2 ** (bend * ramp / 12) * (1 + 0.003 * np.sin(2 * math.pi * 6 * t) * np.minimum(1, t / 0.15))
    ph = 2 * math.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR
    index = 1.1 * np.exp(-t * 6) + 0.5
    fm = np.sin(ph + index * np.sin(ph))
    pulse = square_bl(ph, f0 * 1.06, duty=0.25)
    return (0.7 * fm + 0.45 * pulse) * e


def fm_bass(midi, dur):
    f = hz(midi)
    n_on, n_rel = int(dur * SR), int(0.012 * SR)
    t, e = gate_env(n_on, n_rel, 0.002, 7, 0.25)
    index = 2.4 * np.exp(-t * 14) + 0.6
    return np.sin(2 * math.pi * f * t + index * np.sin(2 * math.pi * f * t)) * e


def stab(midi, dur):
    f = hz(midi)
    n_on, n_rel = int(dur * SR), int(0.01 * SR)
    t, e = gate_env(n_on, n_rel, 0.002, 18, 0.15)
    return np.sin(2 * math.pi * f * t + 0.8 * np.sin(4 * math.pi * f * t)) * e


def kick():
    t = np.arange(int(0.14 * SR)) / SR
    ph = 2 * math.pi * (55 * t + 120 * (1 - np.exp(-40 * t)) / 40)
    return np.sin(ph) * np.exp(-t * 24) * np.minimum(1, t / 0.001)


def snare():
    t = np.arange(int(0.12 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = np.repeat(n[::2], 2)[:len(t)]   # half-rate noise: the FM chip's noise
    return (0.75 * n * np.exp(-t * 30) + 0.4 * np.sin(2 * math.pi * 196 * t) * np.exp(-t * 40))


def hat():
    t = np.arange(int(0.035 * SR)) / SR
    return np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 110)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) or 1.0


def make_loop():
    ld, bs, st, dr = (np.zeros(N_LOOP) for _ in range(4))
    t_bar = 0.0
    for bar, (name, beats) in enumerate(zip(PROGRESSION, METER)):
        root, triad = CHORDS[name]
        for b in range(beats):
            m = root if b % 2 == 0 else root + 7
            place(bs, fm_bass(m, BEAT * 0.45), t_bar + b * BEAT)
            for n in triad:
                place(st, stab(n, BEAT * 0.3), t_bar + (b + 0.5) * BEAT)
            for e8 in (0, 0.5):
                place(dr, hat() * (0.35 if e8 else 0.22), t_bar + (b + e8) * BEAT)
        kicks = (0, 2) if beats == 4 else (0,)
        snares = (1, 3) if beats == 4 else (2,)
        for b in kicks:
            place(dr, kick(), t_bar + b * BEAT)
        for b in snares:
            place(dr, snare() * 0.5, t_bar + b * BEAT)
        for beat, length, m, bend in MELODY[bar]:
            place(ld, lead(m, length * BEAT, bend), t_bar + beat * BEAT)
        t_bar += beats * BEAT
    mix = ld / rms(ld) * 1.0 + bs / rms(bs) * 0.75 + st / rms(st) * 0.32 + dr / rms(dr) * 0.30
    b, a = butter(2, 6000 / (SR / 2))
    y = lfilter(b, a, np.concatenate([mix, mix]))[N_LOOP:]   # two laps: the seam sees its own end
    write('rootcause_loop_1997', y)


# ── THE ONE-SHOTS ───────────────────────────────────────────────────────────────────────────────────────────────────
def make_dig():
    L = 0.12
    t = np.arange(int(L * SR)) / SR
    thud = np.sin(2 * math.pi * (55 * t + 105 * (1 - np.exp(-35 * t)) / 35)) * np.exp(-t * 32)
    n = rng.standard_normal(len(t))
    n = np.repeat(n[::5], 5)[:len(t)]             # sample-and-hold at ~4.4 kHz: crushed
    n = np.round(n * 1.5) / 1.5                   # and only a few levels
    b, a = butter(2, [300 / (SR / 2), 2600 / (SR / 2)], btype='band')
    crunch = lfilter(b, a, n)
    env = np.exp(-t * 45) + 0.5 * np.exp(-np.maximum(0, t - 0.035) * 60) * (t > 0.035)   # a second fall of dirt
    y = thud * 0.9 + crunch * env * 1.6
    write('rootcause_dig', fade_out(y * np.minimum(1, t / 0.001)))


def make_pump():
    L, steps = 0.24, 8
    t = np.arange(int(L * SR)) / SR
    step = np.minimum(steps - 1, (t / (L / steps)).astype(int))
    within = (t % (L / steps)) / (L / steps)
    f = 330 * 3 ** (step / (steps - 1)) * (1 + 0.04 * within)   # each step wheezes up a little
    ph = 2 * math.pi * np.cumsum(f) / SR
    y = square_bl(ph, 990 * 1.04, duty=0.5, top=6000)
    y *= 0.75 + 0.25 * np.cos(2 * math.pi * within)            # a breath per stroke
    write('rootcause_pump', fade_out(y * np.minimum(1, t / 0.002), 0.02))


def make_burst():
    L = 0.48
    t = np.arange(int(0.06 * SR)) / SR
    pop = (np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 90) * 0.8
           + np.sin(2 * math.pi * (60 * t + 140 * (1 - np.exp(-60 * t)) / 60)) * np.exp(-t * 50))
    pop *= np.minimum(1, t / 0.001)
    parts = [(0.0, pop * 0.6)]
    for i, f in enumerate([2093.0, 1760.0, 1568.0, 1318.5, 1174.7, 1046.5, 880.0]):
        tb = np.arange(int(0.07 * SR)) / SR
        blip = square_bl(2 * math.pi * f * tb, f, top=8000) * np.exp(-tb * 45) * np.minimum(1, tb / 0.001)
        parts.append((0.035 + i * 0.05, blip * 0.6 * (1 - i * 0.09)))
    write('rootcause_burst', fade_out(lay(parts, L), 0.02))


def make_applied():
    L = 0.45
    t = np.arange(int(L * SR)) / SR
    stamp = np.sin(2 * math.pi * (70 * t + 80 * (1 - np.exp(-45 * t)) / 45)) * np.exp(-t * 30)
    stamp[:int(0.004 * SR)] += rng.standard_normal(int(0.004 * SR)) * 0.6
    seg = np.minimum(2, (t / 0.13).astype(int))
    f = 196.0 * 2 ** (-seg / 2)                       # 196 → 139 → 98 Hz: three steps down
    ph = 2 * math.pi * np.cumsum(f) / SR
    buzz = sum(np.sin(k * ph) / k for k in range(1, 14))   # a saw's buzz...
    b, a = butter(2, 1100 / (SR / 2))
    buzz = lfilter(b, a, buzz) * (0.8 + 0.2 * np.sign(np.sin(2 * math.pi * 30 * t)))   # ...made dull, with a rasp
    benv = np.minimum(1, np.maximum(0, t - 0.02) / 0.01) * np.exp(-t * 3.5)
    write('rootcause_applied', fade_out((stamp * 0.9 + buzz * benv * 0.7) * np.minimum(1, t / 0.001), 0.04))


def make_found():
    L = 1.15
    parts = []
    for i, m in enumerate([53, 57, 60, 64]):           # F4 A4 C5 E5: a rolled F major seventh, warm and low
        f = hz(m)
        tn = np.arange(int((L - i * 0.07) * SR)) / SR
        tone = (np.sin(2 * math.pi * f * tn) + 0.14 * np.sin(4 * math.pi * f * tn) * np.exp(-tn * 4)
                + 0.04 * np.sin(6 * math.pi * f * tn) * np.exp(-tn * 7))
        parts.append((i * 0.07, tone * np.exp(-tn * 2.6) * np.minimum(1, tn / 0.012) * (0.55 - 0.05 * i)))
    tl = np.arange(int(L * SR)) / SR
    parts.append((0.0, np.sin(2 * math.pi * hz(41) * tl) * np.minimum(1, tl / 0.08) * np.exp(-tl * 2.2) * 0.35))
    y = lay(parts, L)
    y = y + 0.18 * np.concatenate([np.zeros(int(0.083 * SR)), y[:-int(0.083 * SR)]])   # a little room
    b, a = butter(2, 3200 / (SR / 2))
    write('rootcause_found', fade_out(lfilter(b, a, y), 0.15))


def make_report():
    L = 1.45
    flat = 2 ** (-22 / 1200)
    parts = []
    # dot-matrix chatter: rows of needle clicks, a line feed's gap between them
    for row in range(3):
        for k in range(9):
            tc = np.arange(int(0.006 * SR)) / SR
            click = np.diff(rng.standard_normal(len(tc) + 1)) * np.exp(-tc * 600)
            parts.append((0.02 + row * 0.105 + k * 0.0095, click * 0.35))
    for t0, m, d in [(0.38, 72, 0.1), (0.49, 76, 0.1), (0.60, 79, 0.14), (0.80, 77, 0.1), (0.91, 74, 0.1), (1.02, 71, 0.40)]:
        f = hz(m) * flat
        tn = np.arange(int(d * SR)) / SR
        note = square_bl(2 * math.pi * f * tn, f, top=6000) * (0.85 + 0.15 * np.exp(-tn * 20))   # no expression at all
        note[-int(0.008 * SR):] *= np.linspace(1, 0, int(0.008 * SR))
        parts.append((t0, note * 0.3))
    y = lay(parts, L)
    b, a = butter(2, 5000 / (SR / 2))
    write('rootcause_report', fade_out(lfilter(b, a, y), 0.01))


def main():
    make_loop()
    make_dig()
    make_pump()
    make_burst()
    make_applied()
    make_found()
    make_report()


if __name__ == '__main__':
    sys.exit(main())
