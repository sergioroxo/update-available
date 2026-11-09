#!/usr/bin/env python3
"""tools/make_passage_install.py — THE ERA CHANGE'S MUSIC (S346, UiB job 5, T08).

His 8 Nov headset note on the change of era: "it needs a little bit more of sound because it's missing that part. It
needs to be longer… an emotional experience, and also to help the viewer understand that it's flowing through time."
Until now the passage between eras was low wind (`passage_wind`, S155). This is the install's own music, under the
whole change: from the "I Agree" press, while the room morphs, until you land in the new year.

  passage_install — 16 bars of 4/4 at 72 BPM in D-flat (53.3 s), a seamless loop. Four voices and a clock:
      · the installer's PROGRESS TICKS on the eighths — a filtered click and a short high blip, quiet, every fourth one
        a little firmer — that thin out over the last four bars, as the new room arrives;
      · a warm PAD (two detuned band-limited saws, everything above ~1 kHz rolled away);
      · a MUSIC-BOX arpeggio through each chord, which climbs an octave from bar 9 (the years going by) and thins to
        single notes in the last two bars;
      · a slow two-operator FM ELECTRIC PIANO melody from bar 5 to bar 15 — plain, not satire: the passage is the
        building's time, not the programme's voice;
      · a sine SUB on the roots from bar 3.
      Progression: D♭maj7 · A♭/C · B♭m7 · G♭maj7 | D♭maj7 · A♭/C · B♭m7 · E♭m7 | G♭maj7 · Fm7 · B♭m7 · E♭m9 |
                   G♭maj7 · A♭sus · D♭add9 · D♭add9

⚑ tools/make_tones.sh's law holds: no found sound, no imitation of any real OS's or installer's sound — every partial
and every note is written out below. Deterministic (seeded noise): the same bytes every run.

Usage: python3 tools/make_passage_install.py
       (writes assets/audio/passage_install.wav and publishes public/assets/audio/passage_install.mp3 with
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
BPM = 72.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STEM = 'passage_install'
rng = np.random.default_rng(2026_1109)

# bass root, then the pad's voicing (also the music box's four tones, an octave up)
CHORDS = {
    'Dbmaj7': (37, [56, 60, 61, 65]), 'Ab/C': (36, [56, 60, 63, 68]), 'Bbm7': (34, [53, 56, 61, 65]),
    'Gbmaj7': (42, [53, 58, 61, 65]), 'Ebm7': (39, [54, 58, 61, 66]), 'Fm7': (41, [56, 60, 63, 65]),
    'Ebm9': (39, [54, 58, 61, 65]), 'Absus': (44, [56, 61, 63, 68]), 'Dbadd9': (37, [56, 61, 63, 65]),
}
PROGRESSION = (['Dbmaj7', 'Ab/C', 'Bbm7', 'Gbmaj7']
               + ['Dbmaj7', 'Ab/C', 'Bbm7', 'Ebm7']
               + ['Gbmaj7', 'Fm7', 'Bbm7', 'Ebm9']
               + ['Gbmaj7', 'Absus', 'Dbadd9', 'Dbadd9'])
# the tune, on the electric piano: bar -> [(beat, beats, midi)]
MELODY = {
    4: [(0, 2, 72), (2, 2, 68)], 5: [(0, 3, 70), (3, 1, 72)], 6: [(0, 2, 73), (2, 2, 72)], 7: [(0, 4, 70)],
    8: [(0, 2, 73), (2, 1, 75), (3, 1, 77)], 9: [(0, 3, 75), (3, 1, 72)], 10: [(0, 4, 73)],
    11: [(0, 2, 70), (2, 2, 66)], 12: [(0, 3, 65), (3, 1, 68)], 13: [(0, 4, 70)], 14: [(0, 4, 68)],
}
BOX_FIGURE = [0, 1, 2, 3, 2, 3, 1, 2]   # eighths through the chord's four tones

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
    f0 = hz(midi)
    n = int((dur + 1.4) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v, cents in enumerate((-6, 6)):
        f = f0 * 2 ** (cents / 1200)
        for k in range(1, 30):
            if f * k > 3000:
                break
            out += np.sin(2 * math.pi * f * k * t + 1.1 * k * v) / k
    e = np.minimum(1, t / 1.1) * np.clip((dur + 1.4 - t) / 1.4, 0, 1)
    return out * e


def box_note(midi, vel):
    f = hz(midi)
    t = np.arange(int(1.6 * SR)) / SR
    tone = (np.sin(2 * math.pi * f * t) * np.exp(-t * 2.0)
            + 0.20 * np.sin(2 * math.pi * f * 3.93 * t) * np.exp(-t * 13)
            + 0.07 * np.sin(2 * math.pi * f * 6.81 * t) * np.exp(-t * 28))
    tone *= np.minimum(1, t / 0.0015)
    tone[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return tone * vel


def ep_note(midi, dur, vel):
    f = hz(midi)
    n_on, n_tail = int(dur * SR), int(0.6 * SR)
    t = np.arange(n_on + n_tail) / SR
    index = 0.8 * np.exp(-t * 4) + 0.1
    tone = np.sin(2 * math.pi * f * t + index * np.sin(2 * math.pi * f * t))
    tone += 0.3 * np.sin(2 * math.pi * f * 1.002 * t + index * np.sin(2 * math.pi * f * t))
    e = np.exp(-t * 0.8) * np.minimum(1, t / 0.006)
    e[n_on:] *= np.linspace(1, 0, n_tail)
    return tone * e * vel


def sub(midi, dur):
    f = hz(midi)
    t = np.arange(int((dur + 0.4) * SR)) / SR
    e = np.minimum(1, t / 0.08) * np.exp(-t * 0.6) * np.clip((dur + 0.4 - t) / 0.4, 0, 1)
    return (np.sin(2 * math.pi * f * t) + 0.15 * np.sin(4 * math.pi * f * t)) * e


def tick(vel):
    """the installer's progress: a filtered click and a 15 ms blip at 2.4 kHz"""
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    click = rng.standard_normal(n) * np.exp(-t * 400)
    b, a = butter(2, [1800 / (SR / 2), 6000 / (SR / 2)], btype='band')
    click = lfilter(b, a, click)
    blip = np.sin(2 * math.pi * 2400 * t) * np.exp(-t * 180)
    return (0.6 * click + 0.5 * blip) * vel


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) or 1.0


def main():
    pads, box, ep, low, ticks = (np.zeros(N_TOTAL) for _ in range(5))
    eighth = BEAT / 2
    n_bars = len(PROGRESSION)
    for bar, name in enumerate(PROGRESSION):
        t_bar = bar * BAR
        root, voicing = CHORDS[name]
        for m in voicing:
            place(pads, pad_note(m, BAR), t_bar)
        if bar >= 2:
            place(low, sub(root, BAR * 0.95), t_bar)
        up = 24 if 8 <= bar < 14 else 12          # the years go by: the box climbs an octave from bar 9
        figure = BOX_FIGURE if bar < 14 else [0, None, None, None, 2, None, None, None]   # and thins at the end
        for i, step in enumerate(figure):
            if step is None:
                continue
            place(box, box_note(voicing[step] + up, 1.0 if i == 0 else 0.62), t_bar + i * eighth)
        for beat, beats, m in MELODY.get(bar, []):
            place(ep, ep_note(m, beats * BEAT * 0.97, 1.0), t_bar + beat * BEAT)
        # the progress ticks: full for twelve bars, then thinning to nothing; bar 1 brings them back in
        level = 1.0 if bar < 12 else max(0.0, 1 - (bar - 11) / 4)
        for i in range(8):
            k = (bar * 8 + i) / (n_bars * 8)
            fade_in = min(1.0, (bar * 8 + i) / 6) if bar == 0 else 1.0
            if level * fade_in > 0:
                place(ticks, tick((1.0 if i % 4 == 0 else 0.55) * level * fade_in * (0.9 + 0.1 * math.sin(k * 40))), t_bar + i * eighth)
    b, a = butter(2, 1000 / (SR / 2))
    pads = two_laps(b, a, pads)
    swell_hz = round(0.09 * LOOP_SEC) / LOOP_SEC
    pads *= 1 - 0.2 * (0.5 + 0.5 * np.sin(2 * math.pi * swell_hz * np.arange(N_TOTAL) / SR))
    parts = [(ep, 0.85), (box, 0.5), (pads, 0.75), (low, 0.45), (ticks, 0.16)]
    mix = sum(p / rms(p) * g for p, g in parts)
    # a soft, long room, circular
    for d, g in [(0.097, 0.26), (0.171, 0.19), (0.263, 0.14), (0.389, 0.10), (0.557, 0.07), (0.811, 0.04)]:
        mix = mix + g * np.roll(mix, int(d * SR))
    b, a = butter(2, 5000 / (SR / 2))
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
