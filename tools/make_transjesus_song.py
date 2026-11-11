#!/usr/bin/env python3
"""tools/make_transjesus_song.py — TRANSJESUS.STR'S OWN MUSIC, a CANDIDATE (11 Nov 2026; nothing wired in).

His ask: "You can make a new music for the TransJesus? Show me the old and then the new." What plays now is his own
generation, `ball_room_landing.mp3` / `ball_room_bed.mp3` (docs/reinterp/ERA4_DRAFTS_2026-09-12.md §3): a 4/4 house
groove with one chord stab and hats, "nothing melodic enough to be a song". This one is a song: the same room — a
community hall at night, mid-dance, the stream that took the stage from the host — but with a tune the room can
cheer for. Respite: genuine joy, never a trap, never mocked, not a parody and not church music. TransJesus dances and
says nothing, so there is NO voice in it: no lyrics, no speech, no singing; the crowd is claps and wordless whoops.

  · A♭ major / F minor (the loop sits on the minor vi, so the joy has an edge), 122 BPM (= STREAM_BPM in
    src/desktop/theme/era4.ts — the stream's picture already moves at this tempo), 64 bars of four (125.9 s);
  · the progression: Fm9 · D♭maj9 · A♭add9 · E♭sus4→E♭ (vi–IV–I–V), and in the breakdown D♭maj9 · E♭6 · Cm7 · Fm9
    (IV–V–iii–vi, the lift);
  · bars 1–8    (0.0–15.7 s)   THE FLOOR — kick, clap on 2 and 4, off-beat open hats, the bass bouncing on the
                               off-beats with octaves and approach notes, the electric piano comping the chords,
                               a pad pumping under the kick;
  · bars 9–24   (15.7–47.2 s)  THE HOOK — a crash, a few whoops, and the lead comes in: a syncopated 3-3-2 motif
                               (C E♭ F · A♭ G) asked low and answered high (up to C6 and down home to G), twice; the
                               bass drives, the hats go to sixteenths; the second time the crowd claps along and the
                               water-marimba bloops (the piece's own voice) double the tune an octave up;
  · bars 25–32  (47.2–63.0 s)  THE BREAKDOWN — the kick and bass drop out ("woo"), the crowd keeps 2 and 4 with
                               their hands, the pad opens, the bloops arpeggiate, the lead sings the motif slowly
                               over IV–V–iii–vi;
  · bars 33–36  (63.0–70.8 s)  THE BUILD — the kick comes back muffled, a snare roll from eighths to thirty-seconds,
                               a noise riser, the piano in eighths, and one beat of held breath (a reversed cymbal);
  · bars 37–52  (70.8–102.3 s) THE RETURN — the drop on Fm9: the crowd's big cheer (and two whistles), a sub drop,
                               the hook twice with a second voice on the chord tones beneath it, shaker sixteenths;
                               the crowd cheers again when the hook comes round;
  · bars 53–64  (102.3–125.9 s) AFTERGLOW — the lead answers once (the motif turned downward, landing on the sus that
                               resolves), then the floor groove alone, as at the head, and a tom fill on the last beat
                               that falls into bar 1's crash.

It LOOPS SEAMLESSLY, as the Close's song does: everything is rendered as events on a buffer with a pre-roll and a
tail; the hall's tail and every note ringing past the end are folded onto the head, the pre-roll onto the end; the
continuous beds (the room murmur) are built periodic; and everything nonlinear or recursive after the fold (the
master filters, the limiter, the wall) is run circularly, so the last sample leads into the first.

Two files from one render: `transjesus_new` (the room) and `transjesus_new_wall` (the same mix through a wall:
low-passed hard at ~1.3 kHz, nearly mono, the kick and bass carrying, the applause a dull swell). Mastered to the
old pair's measured loudness (landing −12.9 LUFS, bed −14.5 LUFS) with a true-peak ceiling under −1 dBFS.

⚑ tools/make_tones.sh's law holds: no found sound, no sample, no imitation of any real piece, artist or voice — every
partial, every clap and every whoop is written out below. Deterministic (seeded): the same bytes every run.
The synth voices it borrows (bloop, saw, the resonant low-pass, the hall) are the era change's own
(tools/make_era_change_audio.py); its writer is not used, so nothing is written into assets/ or public/.

Usage: python3 tools/make_transjesus_song.py [--out-dir DIR] [--room-lufs -12.9] [--wall-lufs -14.5] [--stems]
       (writes DIR/transjesus_new.{wav,mp3} and DIR/transjesus_new_wall.{wav,mp3}; lame -V2)
"""
import argparse
import os
import subprocess
import sys
import wave
from bisect import bisect_right

import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, lfilter, resample_poly, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_era_change_audio import (  # noqa: E402  (the era change's own voices)
    SR, TAU, hz, smooth, place, bloop, saw, resonant_lowpass, hall, pan_gains,
)

DEFAULT_OUT = ('/private/tmp/claude-501/-Users-sergiogalvaoroxo-update-available-reinterp/'
               '66b2b88b-9068-45c9-bbd4-4e611e42ae5d/scratchpad/transjesus')

BPM = 122.0
BEAT = 60.0 / BPM
STEP = BEAT / 4          # a sixteenth
BAR = 4 * BEAT
BARS = 64
L = BARS * BAR           # the loop: 125.9 s
OFF = 2.0                # pre-roll (what starts before 0 is folded onto the end)
TAIL = 6.0               # rendered past the loop, then folded onto the head
SWING = 0.10 * STEP      # the off-sixteenths a little late: a house shuffle

SECTIONS = [('A', 0, 8), ('B', 8, 24), ('C1', 24, 32), ('C2', 32, 36), ('D', 36, 52), ('E', 52, 64)]


def sec(bar):
    bar %= BARS
    for name, a, b in SECTIONS:
        if a <= bar < b:
            return name
    return 'A'


def at(bar, step=0.0):
    """loop seconds of a sixteenth step in a bar, the odd sixteenths swung late"""
    s = bar * BAR + step * STEP
    if abs(step - round(step)) < 1e-9 and int(round(step)) % 2 == 1:
        s += SWING
    return s


# ───────────────────────────── the harmony ─────────────────────────────
# name: (bass root, electric-piano voicing, pad voicing, the upper tones the bloops arpeggiate)
CH = {
    'Fm9':    (29, [56, 60, 63, 67], [53, 56, 60, 63, 67], [72, 75, 77, 79, 80, 84]),
    'Dbmaj9': (37, [56, 60, 63, 65], [53, 56, 60, 63, 65], [68, 72, 73, 75, 77, 80]),
    'Abadd9': (32, [56, 58, 60, 63], [51, 56, 58, 60, 63], [68, 70, 72, 75, 80, 82]),
    'Ebsus':  (27, [56, 58, 63], [51, 56, 58, 63, 65], [68, 70, 75, 77, 80, 82]),
    'Eb':     (27, [55, 58, 63], [51, 55, 58, 63, 65], [67, 70, 75, 77, 79, 82]),
    'Eb6':    (27, [55, 58, 60, 63], [51, 55, 58, 60, 63], [67, 70, 72, 75, 79, 82]),
    'Cm7':    (36, [58, 60, 63, 67], [55, 58, 60, 63, 67], [67, 70, 72, 75, 79, 84]),
}
SCALE = {8, 10, 0, 1, 3, 5, 7}       # A♭ major's pitch classes
MAIN = ['Fm9', 'Dbmaj9', 'Abadd9', 'Eb']
BREAK = ['Dbmaj9', 'Eb6', 'Cm7', 'Fm9']


def chords_of_bar(b):
    """[(beat, chord)] for bar b"""
    b %= BARS
    if 24 <= b < 32:
        return [(0, BREAK[(b - 24) % 4])]
    if 32 <= b < 34:
        return [(0, 'Dbmaj9')]
    if 34 <= b < 36:
        return [(0, 'Ebsus')]
    name = MAIN[b % 4]
    if name == 'Eb':
        return [(0, 'Ebsus'), (2, 'Eb')]      # the V suspended for two beats, then resolved
    return [(0, name)]


TIMELINE = [(b * BAR + beat * BEAT, name) for b in range(BARS) for beat, name in chords_of_bar(b)]
T_STARTS = [s for s, _ in TIMELINE]


def chord_at(tl):
    return TIMELINE[bisect_right(T_STARTS, tl % L) - 1][1]


def chord_tones(name):
    root, ep, pad, up = CH[name]
    return {n % 12 for n in [root] + ep + pad}


# ───────────────────────────── the tune ─────────────────────────────
# (bar offset, beat, MIDI note, beats held)
ASK = [(0, 0, 72, .75), (0, .75, 75, .75), (0, 1.5, 77, 1), (0, 2.5, 80, .5), (0, 3, 79, 1),       # C E♭ F · A♭ G
       (1, 0, 77, .75), (1, .75, 75, .75), (1, 1.5, 77, 1.5), (1, 3, 72, 1),                      # F E♭ F · C
       (2, 0, 75, .75), (2, .75, 72, .75), (2, 1.5, 70, .5), (2, 2, 72, 2),                       # E♭ C B♭ C
       (3, 0, 70, 2), (3, 2.5, 67, .5), (3, 3, 68, .5), (3, 3.5, 70, .5)]                         # B♭ … G A♭ B♭ →
ANSWER = [(0, 0, 72, .75), (0, .75, 75, .75), (0, 1.5, 77, 1), (0, 2.5, 80, .5), (0, 3, 79, 1),    # the same ask…
          (1, 0, 77, .75), (1, .75, 80, .75), (1, 1.5, 84, 1.5), (1, 3, 82, 1),                   # …F A♭ C6 B♭: the lift
          (2, 0, 84, 1.5), (2, 1.5, 82, .5), (2, 2, 80, 1), (2, 3, 79, 1),                        # C6 B♭ A♭ G
          (3, 0, 80, 2), (3, 2, 79, 1.5), (3, 3.5, 75, .5)]                                       # A♭ (sus) → G (home)
HOOK = ASK + [(b + 4, beat, n, d) for b, beat, n, d in ANSWER]          # 8 bars
SLOW = [(0, 0, 72, 1.5), (0, 1.5, 75, 1.5), (0, 3, 77, 1),             # the breakdown: the motif, slowly
        (1, 0, 79, 3), (1, 3, 77, 1),
        (2, 0, 75, 1.5), (2, 1.5, 79, 1.5), (2, 3, 82, 1),
        (3, 0, 80, 4),
        (4, 0, 72, 1.5), (4, 1.5, 75, 1.5), (4, 3, 77, 1),
        (5, 0, 79, 2), (5, 2, 82, 2),
        (6, 0, 84, 3), (6, 3, 82, 1),
        (7, 0, 80, 3), (7, 3, 79, 1)]
AFTER = [(0, 0, 80, .75), (0, .75, 79, .75), (0, 1.5, 77, 1), (0, 2.5, 75, .5), (0, 3, 77, 1),     # the motif turned down
         (1, 0, 72, 3),
         (2, 0, 75, .75), (2, .75, 72, .75), (2, 1.5, 70, 2.5),
         (3, 0, 68, 2), (3, 2, 67, 2)]                                                             # A♭ (sus) → G


def notes_at(phrase, bar0):
    """phrase → [(loop seconds, seconds held, MIDI)]"""
    out = []
    for b, beat, n, d in phrase:
        on = at(bar0 + b, beat * 4)
        out.append((on, d * BEAT, n))
    return out


def harmony(notes):
    """a second voice: the highest chord tone a third to a sixth under each note"""
    out = []
    for on, d, n in notes:
        tones = chord_tones(chord_at(on + 0.01))
        h = next((c for c in range(n - 3, n - 10, -1) if c % 12 in tones), n - 5)
        out.append((on, d, h))
    return out


# ───────────────────────────── one-shots ─────────────────────────────

def fade_tail(y, sec_=0.015):
    k = min(len(y), int(sec_ * SR))
    y = y.copy()
    y[-k:] *= np.linspace(1, 0, k)
    return y


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return sosfilt(sos, x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


def kick(vel, rng, muffle=0.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = hz(29) + 125 * np.exp(-t / 0.028) + 260 * np.exp(-t / 0.0025)          # it lands on F1, the key's floor
    body = np.sin(TAU * np.cumsum(f) / SR) * (1 - np.exp(-t / 0.0008)) * np.exp(-t / 0.19)
    click = hp(rng.standard_normal(n), 1800) * np.exp(-t / 0.0022) * 0.22 * (1 - muffle)
    k = np.tanh(1.7 * (body + click)) / np.tanh(1.7)
    if muffle:
        k = lp(k, 900 - 500 * muffle)
    k *= 1 - smooth((t - 0.34) / 0.11)
    return vel * k


def machine_clap(vel, rng):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for b in (0.0, 0.0085, 0.017, 0.027):
        env += np.where(t >= b, np.exp(-np.maximum(0, t - b) / 0.0038), 0) * (0.8 if b < 0.027 else 1.0)
    env += np.where(t >= 0.027, 0.55 * np.exp(-np.maximum(0, t - 0.027) / 0.085), 0)
    y = bp(rng.standard_normal(n), 850, 2600) * env
    y += 0.25 * bp(rng.standard_normal(n), 1050, 1350) * env
    return fade_tail(vel * y * 0.9, 0.05)


def snare(vel, rng, pitch=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = hz(53) * pitch * (1 + 0.6 * np.exp(-t / 0.012))
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.06)
    noise = bp(rng.standard_normal(n), 1400, 7000) * np.exp(-t / 0.11)
    return fade_tail(vel * (0.55 * body + 0.6 * noise) * (1 - np.exp(-t / 0.0007)), 0.04)


METAL = [6930.0, 8170.0, 9310.0, 10570.0, 11880.0]


def hat(vel, rng, open_=False):
    n = int((0.42 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    tau = 0.085 if open_ else 0.022
    noise = lp(hp(rng.standard_normal(n), 6000, 2), 10500, 2)
    metal = sum(np.sin(TAU * f * t + rng.random() * TAU) for f in METAL) / len(METAL)
    y = (0.8 * noise + 0.12 * metal) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0004))
    return fade_tail(0.4 * vel * y, 0.02)


def shaker(vel, rng):
    n = int(0.11 * SR)
    t = np.arange(n) / SR
    env = smooth(t / 0.007) * np.exp(-t / 0.032)
    return fade_tail(0.6 * vel * bp(rng.standard_normal(n), 4000, 8500) * env, 0.02)


def crash(vel, rng, seconds=2.6):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = lp(hp(rng.standard_normal(n), 3000, 2), 9000, 2)
    metal = sum(np.sin(TAU * f * 0.71 * t + rng.random() * TAU) for f in METAL + [5230.0, 6110.0]) / 7
    y = (0.8 * noise + 0.2 * metal) * np.exp(-t / 0.75) * (1 - np.exp(-t / 0.001))
    return fade_tail(0.6 * vel * y, 0.3)


def tom(f0, vel, rng):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.55 * np.exp(-t / 0.03))
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.2) + 0.12 * bp(rng.standard_normal(n), 300, 2500) * np.exp(-t / 0.02)
    return fade_tail(vel * y * (1 - np.exp(-t / 0.001)), 0.05)


def bass_note(midi, vel, dur):
    """additive: the harmonics under a low-pass that opens on the attack and closes — the 'wow' that makes it move"""
    n = int((dur + 0.06) * SR)
    t = np.arange(n) / SR
    f0 = hz(midi)
    ph = TAU * f0 * t
    fc = 210 + 700 * vel * np.exp(-t / 0.075)
    y = 0.5 * np.sin(ph)                                                # the sub
    k = 1
    while k * f0 < 2600:
        w = 1.0 / (1.0 + ((k * f0) / fc) ** 4)
        y += w * ((-1) ** (k + 1)) * np.sin(k * ph) / k * 0.8
        k += 1
    env = smooth(t / 0.004) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.018))
    y = np.tanh(1.4 * y * env) / np.tanh(1.4)
    return fade_tail(vel * y, 0.01)


def ep_note(midi, vel, dur, cents, rng):
    """a two-operator FM electric piano: the bark on the attack, a round tone after"""
    n = int((dur + 0.32) * SR)
    t = np.arange(n) / SR
    f = hz(midi) * 2 ** (cents / 1200)
    index = (0.5 + 1.9 * vel) * np.exp(-t / 0.3) + 0.3
    ph0 = rng.random() * TAU
    y = np.sin(TAU * f * t + ph0 + index * np.sin(TAU * f * t))
    y += 0.10 * vel * np.sin(TAU * 4 * f * t) * np.exp(-t / 0.035)
    amp = (1 - np.exp(-t / 0.0015)) * np.exp(-t / 1.5) * np.where(t < dur, 1.0, np.exp(-np.maximum(0, t - dur) / 0.06))
    return fade_tail(y * amp * vel, 0.02)


# ───────────────────────────── the crowd (no words: hands, whoops, two whistles) ─────────────────────────────
VOWELS = [((330, 850, 2300), (720, 1150, 2500)),        # "woo"
          ((300, 2100, 2900), (720, 1250, 2500)),       # "yeah" — as a shape, no word in it
          ((700, 1150, 2500), (680, 1100, 2450)),       # "ah"
          ((520, 900, 2400), (700, 1120, 2500))]        # "oh"


def whoop(rng):
    """one person's wordless cheer: a pitch that leaps up and falls, through a vowel that opens; breath on top"""
    dur = rng.uniform(0.45, 1.5)
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    f0 = rng.uniform(290, 520) if rng.random() < 0.6 else rng.uniform(150, 290)
    rise, fall, peak = rng.uniform(2, 7), rng.uniform(3, 10), rng.uniform(0.15, 0.4)
    semis = np.where(k < peak, rise * smooth(k / peak), rise - fall * smooth((k - peak) / (1 - peak)))
    wob = np.interp(t, np.linspace(0, dur, 12), rng.normal(0, 0.25, 12))
    f = f0 * 2 ** ((semis + wob + 0.2 * np.sin(TAU * rng.uniform(4.5, 6.5) * t)) / 12)
    ph = TAU * np.cumsum(f) / SR
    v0, v1 = VOWELS[rng.integers(len(VOWELS))]
    vk = smooth(k / 0.4)
    forms = [(v0[i] + (v1[i] - v0[i]) * vk, bw, g) for i, (bw, g) in enumerate([(90, 1.0), (120, 0.55), (170, 0.22)])]
    y = np.zeros(n)
    h = 1
    while h * f0 * 2 ** (rise / 12) < 4200:
        fh = h * f
        gain = sum(g / (1 + ((fh - F) / bw) ** 2) for F, bw, g in forms)
        y += gain * np.sin(h * ph) / h ** 0.5
        h += 1
    y /= max(1e-9, np.sqrt(np.mean(y ** 2)))
    breath = bp(rng.standard_normal(n), 700, 3200)
    breath /= max(1e-9, np.sqrt(np.mean(breath ** 2)))
    env = smooth(t / rng.uniform(0.04, 0.1)) * (1 - smooth((t - dur * 0.7) / (dur * 0.3))) * (0.7 + 0.3 * np.exp(-((k - peak) / 0.25) ** 2))
    return env * (0.55 * y + 0.45 * breath) * rng.uniform(0.5, 1.0)


def cheer(voices, rng, spread=0.12):
    m = int(2.6 * SR)
    buf = np.zeros((2, m))
    for _ in range(voices):
        w = whoop(rng)
        place(buf, w, rng.gamma(2.0, spread), rng.uniform(-0.85, 0.85))
    return buf


def clap_kernel(rng):
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    c = rng.uniform(900, 2600)
    y = bp(rng.standard_normal(n), c / 1.7, min(c * 1.7, SR * 0.45), 1) * np.exp(-t / 0.0035) * (1 - np.exp(-t / 0.0003))
    return fade_tail(y / max(1e-9, np.max(np.abs(y))), 0.005)


def applause(seconds, people, rng):
    m = int((seconds + 0.3) * SR)
    buf = np.zeros((2, m))
    for _ in range(people):
        ker, pan = clap_kernel(rng), rng.uniform(-0.9, 0.9)
        rate = rng.uniform(3.6, 6.2)
        tt = rng.uniform(0, 0.25)
        while tt < seconds:
            k = tt / seconds
            vel = smooth(k / 0.12) * (1 - smooth((k - 0.35) / 0.65)) * rng.uniform(0.5, 1.0)
            place(buf, ker * vel, tt, pan)
            tt += rng.uniform(0.85, 1.15) / rate
    return buf


def whistle(rng):
    dur = rng.uniform(0.55, 0.8)
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    f = rng.uniform(2100, 2600) * 2 ** ((4 * smooth(k / 0.25) - 7 * smooth((k - 0.45) / 0.55)
                                        + 0.3 * np.sin(TAU * 6.2 * t)) / 12)
    ph = TAU * np.cumsum(f) / SR
    y = np.sin(ph) + 0.05 * np.sin(2 * ph) + 0.18 * bp(rng.standard_normal(n), 1800, 3400)
    return y * smooth(t / 0.05) * (1 - smooth((t - dur * 0.75) / (dur * 0.25)))


# ───────────────────────────── the lead ─────────────────────────────

def lead_voice(notes, cut_base, cut_env, rng, sub=0.25, vib=14.0):
    """a monophonic, legato saw lead (three detuned saws + a sub-octave sine), bright on each attack: returns (i0, y)"""
    t0 = notes[0][0] - 0.03
    t1 = max(on + d for on, d, _ in notes) + 0.45
    i0, i1 = int(round((OFF + t0) * SR)), int(round((OFF + t1) * SR))
    m = i1 - i0
    tt = np.arange(m) / SR
    step_f = np.full(m, hz(notes[0][2]))
    mark = np.zeros(m, bool)
    env = np.zeros(m)
    for on, d, note in notes:
        j = int(round((on - t0) * SR))
        step_f[j:] = hz(note)
        mark[j] = True
        gate = d * 0.94
        seg_n = min(m - j, int((gate + 0.25) * SR))
        st = np.arange(seg_n) / SR
        a = smooth(st / 0.006) * (0.8 + 0.2 * np.exp(-st / 0.12))
        a = np.where(st < gate, a, a * np.exp(-np.maximum(0, st - gate) / 0.035))
        env[j:j + seg_n] = np.maximum(env[j:j + seg_n], a)
    idx = np.arange(m)
    since = (idx - np.maximum.accumulate(np.where(mark, idx, 0))) / SR
    g = 1 - np.exp(-1 / (0.022 * SR))
    f, _ = lfilter([g], [1, -(1 - g)], step_f, zi=[step_f[0] * (1 - g)])
    f = f * 2 ** ((vib * smooth((since - 0.28) / 0.3) * np.sin(TAU * 5.3 * tt)) / 1200.0)
    osc = (saw(f * 2 ** (-8 / 1200), m, rng) + saw(f, m, rng) + saw(f * 2 ** (8 / 1200), m, rng)) / 3
    osc += sub * np.sin(TAU * np.cumsum(f / 2) / SR)
    cut = cut_base * (f / hz(72)) ** 0.5 + cut_env * np.exp(-since / 0.15)
    y = resonant_lowpass(osc, lambda tb: float(np.interp(tb, tt, cut)), q=1.25, block=64)
    return i0, y * env


# ───────────────────────────── the song ─────────────────────────────

def song(stems=False):
    rng = np.random.default_rng(2026)
    total = OFF + L + TAIL
    n = int(round(total * SR))
    loop_t = (np.arange(n) / SR - OFF) % L          # every automation reads the LOOP's clock, so the tail and the
    #                                                 pre-roll carry the same automation as the head and the end
    kick_bus = np.zeros((2, n))
    bass_bus = np.zeros((2, n))
    perc = np.zeros((2, n))
    music = np.zeros((2, n))          # pad + piano + bloops
    lead_bus = np.zeros((2, n))
    crowd = np.zeros((2, n))

    def put(bus, seg, t, pan=0.0):
        place(bus, seg, OFF + t, pan)

    # ── the KICK, and the sidechain it drives ──
    kicks = []
    for b in range(BARS):
        s = sec(b)
        for beat in range(4):
            tb = at(b, beat * 4)
            if s in ('A', 'B', 'D', 'E'):
                put(kick_bus, kick(1.0, rng), tb)
                kicks.append(tb)
            elif s == 'C2' and not (b == 35 and beat == 3):
                k = ((b - 32) * 4 + beat) / 15
                put(kick_bus, kick(0.45 + 0.4 * k, rng, muffle=0.8 - 0.5 * k), tb)
                kicks.append(tb)
    kicks = np.array(sorted(kicks))
    ki = np.searchsorted(kicks, loop_t, side='right') - 1
    since_kick = np.where(ki >= 0, loop_t - kicks[np.maximum(ki, 0)], loop_t + L - kicks[-1])
    pump = smooth(since_kick / 0.004) * (1 - smooth(since_kick / 0.21))
    pump = np.where(since_kick < 0.5, pump, 0.0)        # 1 just after a kick, 0 once it has passed

    def duck(depth):
        return 1 - depth * pump

    # ── the BASS ──
    groove = [(2, 'R', 1.6, 1.0), (6, 'R', 0.8, 0.9), (7, 'O', 0.8, 0.7), (10, 'R', 1.6, 1.0),
              (13, '5', 0.8, 0.7), (14, 'R', 0.8, 0.85), (15, 'A', 0.8, 0.75)]
    drive = [(0, 'R', 2.4, 1.0), (3, 'R', 1.6, 0.9), (6, 'O', 1.6, 0.85), (8, 'R', 2.4, 1.0),
             (11, '5', 1.6, 0.8), (14, 'O', 0.8, 0.8), (15, 'A', 0.8, 0.75)]
    for b in range(BARS):
        s = sec(b)
        if s in ('C1', 'C2'):
            continue
        pat = drive if (s in ('B', 'D') or 52 <= b < 56) else groove
        for st, deg, ln, vel in pat:
            tl = at(b, st)
            root = CH[chord_at(tl + 0.01)][0]
            nxt = CH[chord_at(at(b + 1, 0) % L + 0.01)][0]
            note = {'R': root, 'O': root + 12, '5': root + 7,
                    'A': (nxt - 1) if (nxt - 1) % 12 in SCALE else nxt + 2}[deg]
            if deg == 'A' and abs(note - root) > 9:
                note += 12 if note < root else -12
            put(bass_bus, bass_note(note, vel, ln * STEP), tl)
    # the sub drop under the drop
    m = int(1.6 * SR)
    tt = np.arange(m) / SR
    sd = np.sin(TAU * np.cumsum(38 + 40 * np.exp(-tt / 0.25)) / SR) * np.exp(-tt / 0.55) * smooth(tt / 0.003)
    put(bass_bus, fade_tail(sd * 0.55, 0.1), at(36))
    bass_bus *= duck(0.6)

    # ── the PERCUSSION ──
    claps = [machine_clap(1.0, rng) for _ in range(4)]
    for b in range(BARS):
        s = sec(b)
        groove_bar = s in ('A',) or b >= 56
        full_bar = s in ('B', 'D') or 52 <= b < 56
        if s in ('A', 'B', 'D', 'E'):
            for beat in (1, 3):
                if beat == 3 and b in (7, 23, 51, 63):
                    continue
                put(perc, claps[(b + beat) % 4] * 0.85, at(b, beat * 4), 0.05)
            for st in range(16):
                if st % 4 == 2:
                    put(perc, hat(0.55 if full_bar else 0.5, rng, open_=True), at(b, st), 0.2)
                elif groove_bar and st % 2 == 1:
                    put(perc, hat(0.36 + 0.06 * (st % 4 == 3), rng), at(b, st), -0.25)
                elif full_bar and st % 4 != 2:
                    put(perc, hat([0.42, 0.28, 0.0, 0.34][st % 4], rng), at(b, st), -0.25)
            if s == 'D':
                for st in range(16):
                    put(perc, shaker(0.32 + 0.18 * (st % 4 == 2), rng), at(b, st), 0.45)
        if s == 'C1' and b >= 28:
            for st in (2, 6, 10, 14):
                put(perc, hat(0.18 + 0.03 * (b - 28), rng, open_=True), at(b, st), 0.2)
        if s == 'C2':
            k0 = (b - 32) / 4
            for st in range(16):
                if b == 35 and st >= 12:
                    break
                if st % 4 == 2:
                    put(perc, hat(0.35 + 0.25 * k0, rng, open_=True), at(b, st), 0.2)
                else:
                    put(perc, hat(0.18 + 0.2 * k0, rng), at(b, st), -0.25)
        # fills into the next section
        if b in (7, 51, 63):
            for i, f0 in enumerate([hz(53), hz(51), hz(48), hz(44)]):     # F E♭ C A♭
                put(perc, tom(f0, 0.55 + 0.1 * i, rng), at(b, 12 + i), 0.5 - 0.33 * i)
        if b == 23:
            for i, st in enumerate([12, 13, 14, 15]):
                put(perc, snare(0.45 + 0.12 * i, rng), at(b, st), 0.0)
    # the snare roll and the riser of the build
    for b in range(32, 36):
        per = 2 if b < 34 else 1
        st = 0.0
        while st < 16:
            if b == 35 and st >= 12:
                break
            k = ((b - 32) * 16 + st) / 60
            put(perc, snare(0.22 + 0.6 * k, rng, pitch=1 + 0.35 * k), at(b, st), 0.0)
            st += 0.5 if (b == 35 and st >= 8) else per
    rs, re = at(32), at(35, 12)
    m = int((re - rs + 0.05) * SR)
    tt = np.arange(m) / SR
    rise = resonant_lowpass(rng.standard_normal(m), lambda tb: 350 * (6500 / 350) ** min(1.0, tb / (re - rs)), q=3.0)
    rise = hp(rise, 250) * (tt / (re - rs)) ** 1.8 * (1 - smooth((tt - (re - rs)) / 0.04))
    put(perc, rise * 0.11, rs, 0.0)
    rv = crash(0.7, rng, seconds=BEAT + 0.2)[::-1]
    rv = rv * smooth(np.arange(len(rv)) / (0.05 * SR))
    put(perc, rv, at(36) - len(rv) / SR + 0.01, 0.0)
    for b, v in ((0, 0.45), (8, 0.55), (24, 0.4), (36, 0.85), (44, 0.45), (52, 0.45)):
        put(perc, crash(v, rng), at(b), -0.3)

    # ── the PAD: chord by chord, crossfaded, pumping, its low-pass breathing with the sections ──
    segs = []
    for s0, name in TIMELINE:
        if segs and segs[-1][1] == name:
            continue
        segs.append([s0, name])
    cache = {}
    pad = np.zeros(n)
    for i, (s0, name) in enumerate(segs):
        s1 = segs[i + 1][0] if i + 1 < len(segs) else L
        a0, a1 = s0 - 0.12, s1 + 0.4
        key = (name, round(a1 - a0, 3))
        if key not in cache:
            mm = int((a1 - a0) * SR)
            tt = np.arange(mm) / SR
            env = smooth(tt / 0.3) * (1 - smooth((tt - (mm / SR - 0.5)) / 0.5))
            y = np.zeros(mm)
            for note in CH[name][2]:
                for det in (-0.07, 0.07):
                    y += saw(np.full(mm, hz(note) * 2 ** (det / 12)), mm, rng)
            cache[key] = env * y * 0.02
        y = cache[key]
        j = int(round((OFF + a0) * SR))
        pad[j:j + len(y)] += y[: n - j]

    def pad_cut(tb):
        t = (tb - OFF) % L
        b = t / BAR
        if b < 8:
            return 1100.0
        if b < 24:
            return 1100 + 500 * smooth((b - 8) / 2)
        if b < 32:
            return 900 + 1100 * smooth((b - 24) / 8)
        if b < 36:
            return 2000 + 2600 * smooth((b - 32) / 4)
        if b < 52:
            return 2400 + 2200 * (1 - smooth((b - 36) / 0.25))     # back down over a sixteenth of a bar, not a jump
        return 2400 - 1300 * smooth((b - 52) / 12)

    pad = resonant_lowpass(pad, pad_cut, q=1.5)
    pad = hp(pad, 150)

    def level(points):
        """a gain curve on the loop's clock, linear between (bar, gain) points"""
        return np.interp(loop_t / BAR, [p[0] for p in points], [p[1] for p in points])

    pad_lvl = level([(0, 0.75), (8, 0.8), (23.5, 0.85), (24.5, 1.35), (32, 1.35), (35.9, 1.55), (36, 0.95),
                     (51, 0.95), (56, 0.75), (64, 0.75)])
    pad = pad * pad_lvl * duck(0.55)
    music[0] += pad * 0.95
    music[1] += pad

    # ── the ELECTRIC PIANO, comping ──
    comp_a = [(0, 2, 1.0), (3, 2, 0.75), (6, 3, 0.9), (10, 2, 0.7), (12, 3, 0.8)]
    comp_b = [(0, 2, 1.0), (3, 2, 0.7), (6, 2, 0.85), (8, 1, 0.5), (10, 2, 0.75), (13, 2, 0.7)]
    ep = np.zeros((2, n))
    for b in range(BARS):
        s = sec(b)
        if s == 'C1':
            hits = [(0, 15, 0.75), (8, 7, 0.4)] if b % 2 == 1 else [(0, 15, 0.8)]
        elif s == 'C2':
            k0 = (b - 32) / 4
            hits = [(st, 1.2, 0.45 + 0.4 * (k0 + st / 64)) for st in range(0, 16, 2) if not (b == 35 and st >= 12)]
        elif s in ('B', 'D') or 52 <= b < 56:
            hits = comp_b
        else:
            hits = comp_a
        for st, ln, vel in hits:
            tl = at(b, st)
            name = chord_at(tl + 0.01)
            for note in CH[name][1]:
                v = vel * rng.uniform(0.85, 1.0)
                d = ln * STEP * 0.9
                off_s = rng.uniform(0, 0.004)
                yl = ep_note(note, v, d, -3.5, rng)
                yr = ep_note(note, v, d, 3.5, rng)
                i = int(round((OFF + tl + off_s) * SR))
                k = min(len(yl), n - i)
                ep[0, i:i + k] += yl[:k]
                ep[1, i:i + k] += yr[:k]
    ep_lvl = level([(0, 0.8), (8, 0.85), (24, 0.95), (32, 0.75), (36, 0.9), (52, 0.85), (56, 0.8), (64, 0.8)])
    music += ep * 0.075 * ep_lvl * duck(0.3)

    # ── the BLOOPS: the breakdown's arpeggio, and the tune doubled an octave up ──
    kk = 0
    for b in range(24, 36):
        per = 2 if b < 32 else 4
        for i in range(4 * per):
            tl = at(b, i * 4 / per)
            if b == 35 and tl >= at(35, 12):
                break
            up = CH[chord_at(tl + 0.01)][3]
            note = up[(kk * 2 + kk // 4) % len(up)]
            vel = 0.075 if b < 32 else 0.05 + 0.03 * (b - 32) / 4
            put(music, bloop(hz(note), vel, dur=0.5), tl, 0.5 if kk % 2 else -0.5)
            kk += 1

    # ── the LEAD ──
    hook_b = notes_at(HOOK, 8) + notes_at(HOOK, 16)
    hook_d = notes_at(HOOK, 36) + notes_at(HOOK, 44)
    slow = notes_at(SLOW, 24)
    after = notes_at(AFTER, 52)
    for on, d, note in notes_at(HOOK, 16) + hook_d + slow:
        put(music, bloop(hz(note + 12), 0.035 if on < at(24) or on >= at(36) else 0.05, dur=0.5), on, 0.15)
    lead_mono = np.zeros(n)

    def add_lead(notes, cut_base, cut_env, lvl, pan, sub=0.25):
        i0, y = lead_voice(notes, cut_base, cut_env, rng, sub=sub)
        y = y * lvl
        k = min(len(y), n - i0)
        lead_mono[i0:i0 + k] += y[:k]
        gl, gr = pan_gains(pan)
        lead_bus[0, i0:i0 + k] += y[:k] * gl
        d = int(0.009 * SR)
        lead_bus[1, i0 + d:i0 + k] += y[:k - d] * gr

    add_lead(hook_b, 1500, 2600, 0.16, -0.08)
    add_lead(slow, 850, 900, 0.13, -0.05, sub=0.35)
    add_lead(hook_d, 1900, 3000, 0.17, -0.1)
    add_lead(harmony(hook_d), 1300, 1600, 0.085, 0.35, sub=0.1)
    add_lead(after, 1500, 2200, 0.15, -0.08)
    lead_bus *= duck(0.12)
    # a dotted-eighth ping-pong echo, darker than the lead
    dl = lp(hp(lead_mono * duck(0.12), 350), 3200)
    D = 0.75 * BEAT
    for k in range(1, 8):
        s = int(round(k * D * SR))
        g = 0.26 * 0.45 ** (k - 1)
        lead_bus[(k + 1) % 2, s:] += dl[:n - s] * g

    # ── the CROWD ──
    # the room: forty people breathing, shifting — a periodic murmur under everything
    nl = int(round(L * SR))
    mur = rng.standard_normal(nl)
    mur = np.concatenate([mur[-SR:], mur, mur[:SR]])
    mur = bp(mur, 160, 1100)[SR:SR + nl]
    tl_ = np.arange(nl) / nl
    am = 1 + 0.25 * sum(np.sin(TAU * c * tl_ + ph) for c, ph in ((23, 0.3), (41, 1.9), (67, 4.0), (97, 2.2)))
    mur = mur * am / np.sqrt(np.mean(mur ** 2)) * 0.006
    o = int(round(OFF * SR))
    crowd[0, o:o + nl] += mur
    crowd[1, o:o + nl] += np.roll(mur, int(0.37 * SR))
    # hands in time on 2 and 4
    people = [(clap_kernel(rng), rng.normal(0, 0.011), rng.uniform(-0.9, 0.9)) for _ in range(40)]
    for b in range(16, 40):
        s = sec(b)
        if s == 'B':
            count, vel = 14, 0.35 + 0.25 * smooth((b - 16) / 4)
        elif s == 'C1':
            count, vel = 40, 0.85
        elif s == 'C2':
            count, vel = 40, 0.95
        else:
            count, vel = 30, 0.7 * (1 - (b - 36) / 4)
        for beat in (1, 3):
            if b == 35 and beat == 3:
                continue
            tb = at(b, beat * 4)
            for ker, bias, pan in people[:count]:
                put(crowd, ker * vel * rng.uniform(0.55, 1.0) * 0.15, tb + bias + rng.normal(0, 0.007), pan)
    # cheers: when the tune arrives, when the beat drops out, at the drop (the big one), when the tune comes round
    for b, voices, lvl, hands, whistles in ((8, 10, 0.5, 8, 0), (24, 14, 0.55, 0, 0), (36, 40, 1.0, 30, 2),
                                            (44, 18, 0.6, 12, 1), (58, 5, 0.35, 0, 0)):
        tb = at(b) - (0.12 if b == 36 else 0.0)
        c = cheer(voices, rng)
        place(crowd, c[0] * lvl * 0.075, OFF + tb, -1.0)
        place(crowd, c[1] * lvl * 0.075, OFF + tb, 1.0)
        if hands:
            a = applause(3.2 if b == 36 else 2.2, hands, rng)
            place(crowd, a[0] * lvl * 0.05, OFF + tb + 0.1, -1.0)
            place(crowd, a[1] * lvl * 0.05, OFF + tb + 0.1, 1.0)
        for w in range(whistles):
            put(crowd, whistle(rng) * 0.02, tb + 0.35 + 0.9 * w, rng.uniform(-0.7, 0.7))
    crowd = np.stack([hp(lp(crowd[0], 7000), 110), hp(lp(crowd[1], 7000), 110)])

    # ── the rooms: the drums in a small room, the music in the hall, the crowd further off ──
    perc = hall(perc, 0.9, 0.12, seed=31)
    music = hall(music, 2.4, 0.24, seed=37)
    lead_bus = hall(lead_bus, 2.4, 0.24, seed=37)
    crowd = hall(crowd, 2.6, 0.42, seed=41)
    groups = {'kick': kick_bus * 0.62, 'bass': bass_bus * 0.36, 'perc': perc * 0.8, 'music': music * 1.3,
              'lead': lead_bus * 1.8, 'crowd': crowd}
    bus = sum(groups.values())

    def fold(x):
        o, nl_ = int(round(OFF * SR)), int(round(L * SR))
        out = x[:, o:o + nl_].copy()
        tail = x[:, o + nl_:]
        out[:, :tail.shape[1]] += tail          # what rang on past the end, onto the head
        out[:, nl_ - o:] += x[:, :o]             # the pre-roll, onto the end
        return out

    if stems:
        report_stems({k: fold(v) for k, v in groups.items()})
    return fold(bus)


# ───────────────────────────── master: loudness, a true-peak limiter, the wall ─────────────────────────────

def circular(fn, x, pad_s=3.0):
    """run fn over the loop as if it were endless: wrap pad_s of the end before and of the head after"""
    p = int(pad_s * SR)
    y = fn(np.concatenate([x[:, -p:], x, x[:, :p]], axis=1))
    return y[:, p:p + x.shape[1]]


def k_weighted(x):
    G, Q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    A = 10 ** (G / 40)
    w = TAU * fc / SR
    al, c = np.sin(w) / (2 * Q), np.cos(w)
    b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c),
         A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c),
         (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
    y = lfilter(b, a, x, axis=1)
    Q2, fc2 = 0.5003270373238773, 38.13547087602444
    w = TAU * fc2 / SR
    al, c = np.sin(w) / (2 * Q2), np.cos(w)
    return lfilter([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al], y, axis=1)


def lufs(x):
    """ITU-R BS.1770-4 integrated loudness (400 ms blocks, 75 % overlap, absolute and relative gates)"""
    y = k_weighted(x) ** 2
    cs = np.concatenate([np.zeros((2, 1)), np.cumsum(y, axis=1)], axis=1)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    starts = np.arange(0, y.shape[1] - blk + 1, hop)
    z = ((cs[:, starts + blk] - cs[:, starts]) / blk).sum(0)
    lk = -0.691 + 10 * np.log10(z + 1e-12)
    z1 = z[lk > -70]
    gate = -0.691 + 10 * np.log10(z1.mean()) - 10
    return -0.691 + 10 * np.log10(z[lk > gate].mean())


def true_peak(x):
    return np.max(np.abs(resample_poly(x, 4, 1, axis=1)))


def limiter(x, ceiling_db, lookahead=0.004, release=0.14, block=16):
    """a look-ahead brick-wall on the 4×-oversampled peak; the gain never rises faster than the release"""
    ceil = 10 ** (ceiling_db / 20)
    over = np.abs(resample_poly(x, 4, 1, axis=1)).max(0)
    pk = over[: x.shape[1] * 4].reshape(-1, 4).max(1)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = int(lookahead * SR)
    m = minimum_filter1d(need, size=2 * w + 1, mode='nearest')
    nb = int(np.ceil(len(m) / block))
    mb = np.pad(m, (0, nb * block - len(m)), mode='edge').reshape(nb, block).min(1)
    a = 1 - np.exp(-block / (release * SR))
    r = np.empty(nb)
    g = 1.0
    for i in range(nb):
        g = min(mb[i], g + (1 - g) * a)
        r[i] = g
    gain = np.repeat(r, block)[: len(m)]
    gain = uniform_filter1d(gain, size=w, mode='nearest')
    return x * gain


def warm(c):
    """28 Hz high-pass, and a first-order shelf taking ~4 dB off above 6 kHz: the slightly lo-fi top"""
    c = hp(c, 28)
    return c - (1 - 10 ** (-4 / 20)) * hp(c, 6000, 1)


def master(x, target, ceiling_db=-2.2):
    x = circular(lambda y: np.stack([warm(c) for c in y]), x)
    g = 10 ** ((target - lufs(x)) / 20)
    for _ in range(4):
        y = circular(lambda z: limiter(z * g, ceiling_db), x)
        g *= 10 ** ((target - lufs(y)) / 20)
    y = circular(lambda z: limiter(z * g, ceiling_db), x)
    gr = 20 * np.log10(np.maximum(1e-9, np.sqrt((y ** 2).sum(0) + 1e-12) / np.sqrt(((x * g) ** 2).sum(0) + 1e-12)))
    loud = np.sqrt(((x * g) ** 2).sum(0)) > 0.05
    print(f'  limiter: gain reduction median {np.median(gr[loud]):.2f} dB, 99th pct {np.percentile(gr[loud], 1):.2f} dB, '
          f'max {gr[loud].min():.2f} dB')
    return y


def through_the_wall(x):
    def wall(y):
        y = np.stack([lp(lp(c, 1300, 4), 2400, 2) for c in y])
        mid, side = (y[0] + y[1]) / 2, (y[0] - y[1]) / 2 * 0.3
        return np.stack([mid + side, mid - side])
    return circular(wall, x)


def quiet_start(*ys, window=0.015):
    """where the FILE starts. Any rotation of a seamless loop is a seamless loop; an mp3 encoder, though, meets the
    file's first sample as a step out of silence, and on bar 1's downbeat that step costs a tick (measured: the wall's
    first 2 ms decoded 37 dB over its codec noise). So the file starts at the quietest, stillest sample of the 15 ms
    before the downbeat — the same sample for both files, so the room and the wall stay aligned for a crossfade
    (measured after: both files' first 2 ms decode within the codec error of their own other downbeats)."""
    w = int(window * SR)
    cand = np.arange(-w, 0)
    score = np.zeros(w)
    for y in ys:
        step = np.abs(y[:, cand] - y[:, cand - 1])
        # the step is broadband: weigh it against what the file has above 4 kHz to hide it (the wall has nothing)
        hf = np.sqrt(np.mean(hp(y.mean(0), 4000, 4) ** 2))
        score += (np.abs(y[:, cand]).max(0) + 4 * step.max(0)) / hf
    return int(cand[np.argmin(score)])


def report_stems(groups):
    print('stem rms by section (dBFS, before master):')
    print('        ' + ''.join(f'{s:>8}' for s, _, _ in SECTIONS))
    for k, v in groups.items():
        row = []
        for _, a, b in SECTIONS:
            i0, i1 = int(a * BAR * SR), int(b * BAR * SR)
            row.append(20 * np.log10(np.sqrt(np.mean(v[:, i0:i1] ** 2)) + 1e-9))
        print(f'{k:>7} ' + ''.join(f'{r:8.1f}' for r in row))
    print('loudest 400 ms by section (dBFS rms):')
    w = int(0.4 * SR)
    for k, v in groups.items():
        row = []
        for _, a, b in SECTIONS:
            i0, i1 = int(a * BAR * SR), int(b * BAR * SR)
            e = (v[:, i0:i1] ** 2).mean(0)
            e = np.convolve(e, np.ones(w) / w, 'valid')
            row.append(10 * np.log10(e.max() + 1e-18))
        print(f'{k:>7} ' + ''.join(f'{r:8.1f}' for r in row))


def write(out_dir, stem, y):
    os.makedirs(out_dir, exist_ok=True)
    wav = os.path.join(out_dir, f'{stem}.wav')
    mp3 = os.path.join(out_dir, f'{stem}.mp3')
    data = (np.clip(np.round(y.T * 32767), -32768, 32767)).astype('<i2').tobytes()
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    subprocess.run(['lame', '--quiet', '-V2', wav, mp3], check=True)
    print(f'{stem}: {y.shape[1] / SR:.2f} s, {lufs(y):.1f} LUFS, true peak {20 * np.log10(true_peak(y)):.2f} dBFS'
          f' -> {mp3}')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out-dir', default=DEFAULT_OUT)
    # the old pair through this script's own meter (ffmpeg's ebur128 reads them −12.9 and −14.5)
    ap.add_argument('--room-lufs', type=float, default=-12.97, help='ball_room_landing.mp3, measured')
    ap.add_argument('--wall-lufs', type=float, default=-14.53, help='ball_room_bed.mp3, measured')
    ap.add_argument('--stems', action='store_true', help='print each group\'s level per section')
    args = ap.parse_args()
    mix = song(stems=args.stems)
    room = master(mix, args.room_lufs)
    wall = master(through_the_wall(mix), args.wall_lufs)
    r = quiet_start(room, wall)
    print(f'  both files start {-r / SR * 1000:.2f} ms before bar 1\'s downbeat (a rotation of the loop: still seamless)')
    write(args.out_dir, 'transjesus_new', np.roll(room, -r, axis=1))
    write(args.out_dir, 'transjesus_new_wall', np.roll(wall, -r, axis=1))


if __name__ == '__main__':
    main()
