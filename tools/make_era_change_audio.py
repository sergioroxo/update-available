#!/usr/bin/env python3
"""tools/make_era_change_audio.py — THE ERA CHANGE'S MUSIC AND THE MORPH'S OWN SOUNDS (S347, UiB job 6).

His 9 Nov note on job 5: "The music is too sweet and soft for the era change… Make a new one. Think of Lamby's opening
music [lambyos_home_loop, chase_the_clouds] but more dynamic: fluid, liquid sounds, a little experimental (granular
shimmer, pitch glides, filtered sweeps, a pulse that changes speed as the room transforms). It must leave room for the
shapeshifting sounds of the place: give the morph its own sound layer (soft whooshes, glassy creaks, a rising shimmer
as walls fold), and mix the music under it so the two balance."

Listening to Lamby's two pieces first (their spectra, measured with this repo's own ffmpeg): both sit around 65 BPM,
in G major with a Lydian lift (C♯ is the home loop's fifth-strongest pitch class), mid-heavy (60 % of the energy
between 400 Hz and 1.5 kHz), bright on top in "Chase the Clouds" (spectral centroid ~2.8 kHz). So this music lives in
Lamby's key and tempo, and then moves: everything in it is FLUID — nothing is a fixed note for long.

ONE PIECE PER CHANGE, rendered to that change's own seconds. ⚑ S348 (UiB job 7): the era change is the FLYOVER again,
on the computer and in the headset (src/room/cluster.ts RELOCATIONS): the rise (R), on 2016 → 2026 a smooth turn at
the top (T), the crossing (B) while the room's glob cascade runs (C, from the end of the rise), and the descent into the
seat (D). The music's pulse quickens through the cascade, holds through the crossing and slows down the descent, and
the morph layer's creaks and whooshes sit on the cascade's own glob events — computed here from the room data in
clusterMorph's own order (glob_events). If RELOCATIONS or the room's deltas change, run this again.

  passage_<from>_<to>  — the MUSIC (the music channel, the room bed; starts at the press / the restart):
      · a liquid PULSE — "water-marimba" bloops (a sine that drops three semitones into its note in 25 ms), arpeggiating
        the chord, ping-ponging left and right; one per beat at 66 BPM during the install, accelerating smoothly to four
        per beat while the room folds, decelerating back as you land, then gone;
      · a warm PAD (detuned saws) through a RESONANT low-pass that sweeps open with the fold and closes as you land;
      · GRANULAR SHIMMER: short windowed sine grains on the chord's upper tones, each gliding a little, their density
        rising with the fold;
      · a GLIDING LEAD: one sine voice with portamento and a slow vibrato, sliding between chord tones (never stepping);
      · DROPS: single liquid droplets (a rising chirp), scattered, thickening with the fold; and a SUB on the roots;
      · G Lydian: Gmaj9 → Em9 → Cmaj7♯11 → D6/9 across the fold, resolving to Gmaj9(♯11) as you land.
  morph_<from>_<to>    — THE PLACE SHAPESHIFTING (the room channel, a one-shot started when the room starts to change):
      · a RISING SHIMMER: a cloud of glassy grains whose pitch and density climb for the whole fold;
      · GLASSY CREAKS: ratchets of micro-impulses ringing inharmonic glass modes (1 : 2.32 : 4.25 : 6.63) that bend in
        pitch — the sound of a shape being forced into another;
      · SOFT WHOOSHES: band-passed noise swept up or down, travelling across the stereo field as the diagonal fold
        crosses the room (left to right over the whole change); bigger and lower where the walls fold;
      · THE LANDING (where the seat changes): a whoosh that rises into the cover, a glass bloom at the cut, sparkle out.
  Both through one synthetic stereo hall (decaying filtered noise, a different seed per ear).

⚑ tools/make_tones.sh's law holds: no found sound, no sample, no imitation of any real piece or product's sound —
every partial below is written out. Deterministic (seeded): the same bytes every run.

Usage: python3 tools/make_era_change_audio.py
       (writes assets/audio/<stem>.wav and publishes public/assets/audio/<stem>.mp3 with lame --quiet -V4)
"""
import os
import subprocess
import wave

import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

SR = 32000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TAU = 2 * np.pi

# ⚑ S348 (UiB job 7) — the FLIGHT's plans, in seconds (src/room/cluster.ts RELOCATIONS): R the rise, T the turn at
#   the top (E3→E4 only), B the build leg (the crossing), C the room's cascade (from the end of the rise; the glob
#   events sit in its first 60 %), D the descent into the seat. idx = the space state the cascade folds INTO.
PLANS = {
    '1997_2003': dict(R=8.3, T=0.0, B=7.0, C=7.0, D=13.0, walls=False, idx=1),
    '2003_2016': dict(R=8.3, T=0.0, B=11.0, C=11.0, D=11.5, walls=True, idx=2),
    '2016_2026': dict(R=7.0, T=6.0, B=25.0, C=11.0, D=11.5, walls=False, idx=3),
}
CASCADE, PROP_DUR, GLITCH_FRAC = 5.2, 1.3, 0.42      # src/room/clusterMorph.ts
MUSIC_TAIL, MORPH_TAIL = 7.0, 4.5
BPM = 66.0
BEAT = 60.0 / BPM


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


# G Lydian, Lamby's key. Each chord: (sub root, pad voicing, the upper tones the pulse/grains/lead draw from)
CHORDS = {
    'Gmaj9':    (31, [55, 59, 62, 66, 69], [67, 71, 74, 78, 81, 83]),
    'Em9':      (28, [52, 55, 59, 62, 66], [64, 67, 71, 74, 78, 79]),
    'Cmaj7#11': (36, [52, 55, 59, 60, 66], [64, 67, 71, 72, 78, 79]),
    'D69':      (38, [54, 57, 59, 62, 64], [66, 69, 71, 74, 76, 78]),
    'Gmaj9#11': (31, [55, 59, 61, 62, 66, 69], [67, 71, 73, 74, 78, 81]),
}


def smooth(k):
    k = np.clip(k, 0, 1)
    return k * k * (3 - 2 * k)


def pan_gains(p):
    """equal-power pan, p in -1 … 1"""
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def place(bus, seg, t0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= bus.shape[1] or i + len(seg) <= 0:
        return
    j0 = max(0, -i)
    seg = seg[j0:]
    i = max(0, i)
    n = min(len(seg), bus.shape[1] - i)
    gl, gr = pan_gains(pan)
    bus[0, i:i + n] += seg[:n] * gl
    bus[1, i:i + n] += seg[:n] * gr


def hann(n):
    return 0.5 - 0.5 * np.cos(TAU * np.arange(n) / max(1, n - 1))


def resonant_lowpass(x, cutoff_fn, q=2.2, block=512):
    """RBJ low-pass, coefficients per block from cutoff_fn(t) — the filtered sweep"""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    for b0 in range(0, len(x), block):
        t = b0 / SR
        f = float(np.clip(cutoff_fn(t), 60, SR * 0.45))
        w = TAU * f / SR
        alpha = np.sin(w) / (2 * q)
        cw = np.cos(w)
        b = np.array([(1 - cw) / 2, 1 - cw, (1 - cw) / 2])
        a = np.array([1 + alpha, -2 * cw, 1 - alpha])
        seg, zi = lfilter(b / a[0], a / a[0], x[b0:b0 + block], zi=zi)
        y[b0:b0 + block] = seg
    return y


def hall(bus, seconds=2.6, wet=0.32, seed=7):
    """a synthetic stereo hall: decaying, darkening noise, a different seed per ear"""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(bus)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (seconds / 6.0))
        b, a = butter(1, 5200 / (SR / 2))
        ir = lfilter(b, a, ir)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))   # a short pre-delay swell
        ir /= np.sqrt(np.sum(ir ** 2))
        out[ch] = fftconvolve(bus[ch], ir)[: bus.shape[1]]
    return bus * (1 - wet) + out * wet


# ───────────────────────────── the music's voices ─────────────────────────────

def bloop(freq, vel, dur=0.34):
    """the water-marimba: a sine dropping three semitones into its note in 25 ms, a soft octave, a quick decay"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * 2 ** ((3 * np.exp(-t / 0.009)) / 12.0)
    ph = TAU * np.cumsum(f) / SR
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.085)
    return vel * env * (np.sin(ph) + 0.18 * np.sin(2 * ph) * np.exp(-t / 0.03))


def droplet(freq, vel):
    """a single liquid drop: a sine chirping UP fast (the classic bubble), 70 ms"""
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.4 * (1 - np.exp(-t / 0.012)))
    ph = TAU * np.cumsum(f) / SR
    env = np.sin(np.pi * np.clip(t / 0.07, 0, 1)) ** 0.6 * np.exp(-t / 0.03)
    return vel * env * np.sin(ph)


def grain(freq, vel, dur, glide_cents, rng):
    n = max(8, int(dur * SR))
    t = np.arange(n) / SR
    f = freq * 2 ** ((glide_cents * t / dur) / 1200.0)
    ph = TAU * np.cumsum(f) / SR + rng.random() * TAU
    return vel * hann(n) * (np.sin(ph) + 0.12 * np.sin(2 * ph))


def saw(freq_fn, n, rng):
    """band-limited-ish saw from a few partials, its frequency a per-sample array"""
    ph = TAU * np.cumsum(freq_fn) / SR + rng.random() * TAU
    out = np.zeros(n)
    top = float(np.max(freq_fn))
    for k in range(1, 25):
        if k * top > SR * 0.42:
            break
        out += ((-1) ** (k + 1)) * np.sin(k * ph) / k
    return out


def music(name, R, T, B, C, D, **_):
    rng = np.random.default_rng(1997 + int(B * 10))
    L0 = R + T + B                   # the descent starts
    LE = L0 + D                      # you land in the seat
    LC = LE - 0.8                    # the lead's ♯11 just before the landing, resolving on it
    total = LE + MUSIC_TAIL
    n = int(total * SR)
    t = np.arange(n) / SR
    bus = np.zeros((2, n))

    # the chord timeline: the install on Gmaj9, the fold through four chords, the landing on Gmaj9#11
    seq = [(0.0, 'Gmaj9')]
    fold = ['Em9', 'Cmaj7#11', 'D69']
    for i, c in enumerate(fold):
        seq.append((R + (L0 - R) * (i + 1) / (len(fold) + 1), c))
    seq.append((L0 + 0.4, 'Gmaj9#11'))

    def chord_at(time):
        cur = seq[0][1]
        for s0, c in seq:
            if time >= s0:
                cur = c
        return CHORDS[cur]

    # the fold's progress 0…1 (0 through the rise, 1 once the room has changed, through the travel and the descent)
    def fold_k(time):
        return float(np.clip((time - R) / max(0.1, C), 0, 1))

    # ── the PAD, through the resonant sweep ──
    pad = np.zeros(n)
    for s_i, (s0, cname) in enumerate(seq):
        s1 = seq[s_i + 1][0] if s_i + 1 < len(seq) else total
        a0, a1 = max(0, s0 - 0.6), min(total, s1 + 1.2)        # chords overlap: a crossfade, never a cut
        i0, i1 = int(a0 * SR), int(a1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        env = smooth(tt / 1.2) * (1 - smooth((tt - (m / SR - 1.4)) / 1.4))
        if s_i == len(seq) - 1:
            env = smooth(tt / 1.2) * np.exp(-np.maximum(0, tt - (LE - a0)) / 2.2)
        for note in CHORDS[cname][1]:
            for det in (-0.07, 0.07):
                f = np.full(m, hz(note) * 2 ** (det / 12))
                pad[i0:i1] += env * saw(f, m, rng) * 0.026

    def cutoff(time):
        k = fold_k(time)
        if time < R:
            return 420 + 380 * smooth(time / R)                     # the install: closed, opening a crack
        if time < L0:
            return 800 + 3600 * smooth(k) ** 1.4                    # the fold: the sweep opens
        if time < LE:
            return 4400 - 3000 * smooth((time - L0) / (LE - L0))     # the landing: it closes
        return 1400 - 500 * smooth((time - LE) / MUSIC_TAIL)
    pad = resonant_lowpass(pad, cutoff, q=2.4)
    hb, ha = butter(2, 150 / (SR / 2), btype='high')       # no mud under the pad: the sub has the low end
    pad = lfilter(hb, ha, pad)
    bus[0] += pad * 0.95
    bus[1] += pad * 1.0

    # ── the PULSE: rate in beats-per-beat (1 → 4 → 1), phase integrated so it never jumps ──
    def rate(time):
        if time < R:
            return 1.0
        if time < L0:
            return 1.0 + 3.0 * smooth(fold_k(time)) ** 1.25
        if time < LE:
            return 4.0 - 3.0 * smooth((time - L0) / (LE - L0))
        return 1.0
    step = 0.005
    phase = 0.0
    pulse_n = 0
    time = 0.0
    while time < LE + 1.5:
        r = rate(time) / BEAT
        phase += r * step
        if phase >= 1.0:
            phase -= 1.0
            upper = chord_at(time)[2]
            note = upper[(pulse_n * 2 + (pulse_n // 4)) % len(upper)]
            k = fold_k(time)
            vel = 0.13 + 0.07 * k
            if time > LE:
                vel *= max(0, 1 - (time - LE) / 1.5)
            if time < 1.8:
                vel *= time / 1.8
            pan = 0.55 if pulse_n % 2 else -0.55
            place(bus, bloop(hz(note), vel), time, pan)
            # a low thump under every fourth, more as the fold builds
            if pulse_n % 4 == 0 and time > R * 0.5:
                m = int(0.16 * SR)
                tt = np.arange(m) / SR
                thump = np.sin(TAU * np.cumsum(hz(chord_at(time)[0] + 12) * (1 + 0.5 * np.exp(-tt / 0.02))) / SR)
                place(bus, thump * np.exp(-tt / 0.05) * (0.03 + 0.04 * k), time, 0.0)
            pulse_n += 1
        time += step

    # ── GRANULAR SHIMMER ──
    time = 0.6
    while time < total - 1.0:
        k = fold_k(time)
        if time < R:
            dens = 3.5
        elif time < L0:
            dens = 4 + 34 * smooth(k) ** 1.3
        elif time < LE:
            dens = 38 - 30 * smooth((time - L0) / (LE - L0))
        else:
            dens = 8 * max(0.0, 1 - (time - LE) / MUSIC_TAIL)
        if dens <= 0.2:
            time += 0.1
            continue
        time += rng.exponential(1.0 / dens)
        upper = chord_at(time)[2]
        note = upper[rng.integers(len(upper))] + 12 * int(rng.integers(1, 3))
        dur = rng.uniform(0.025, 0.09)
        vel = rng.uniform(0.02, 0.05) * (0.6 + 0.6 * k)
        place(bus, grain(hz(note), vel, dur, rng.uniform(-40, 40), rng), time, rng.uniform(-0.9, 0.9))

    # ── the GLIDING LEAD: portamento between chord tones, from the fold's start to just past the cut ──
    lead_t0, lead_t1 = R + 0.8, LC + 2.2
    if lead_t1 > lead_t0:
        i0, i1 = int(lead_t0 * SR), int(lead_t1 * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        targets = []
        cur = lead_t0
        k_i = 0
        while cur < lead_t1:
            upper = chord_at(cur)[2]
            targets.append((cur, hz(upper[[1, 3, 2, 4, 0, 5][k_i % 6]])))
            cur += rng.uniform(1.1, 2.2)
            k_i += 1
        targets.append((LC - 0.2, hz(CHORDS['Gmaj9#11'][2][2])))    # the ♯11 at the cut…
        targets.append((LC + 0.9, hz(CHORDS['Gmaj9#11'][2][1])))    # …resolving to the third
        targets.sort()
        step_f = np.full(m, targets[0][1])
        for t_at, f_at in targets:
            j = int((t_at - lead_t0) * SR)
            if j < m:
                step_f[max(0, j):] = f_at
        a = 1 - np.exp(-1 / (0.18 * SR))                                   # the glide: one pole, 0.18 s
        f, _ = lfilter([a], [1, -(1 - a)], step_f, zi=[targets[0][1] * (1 - a)])
        f *= 2 ** ((14 * np.sin(TAU * 4.6 * tt) * smooth(tt / 2.0)) / 1200.0)   # a slow vibrato
        ph = TAU * np.cumsum(f) / SR
        env = smooth(tt / 1.5) * (1 - smooth((tt - (m / SR - 2.0)) / 2.0))
        lead = env * (np.sin(ph) + 0.08 * np.sin(3 * ph)) * 0.05
        lead_l = np.zeros(n)
        lead_l[i0:i1] = lead
        gl, gr = pan_gains(-0.2)
        bus[0] += lead_l * gl
        bus[1] += np.roll(lead_l, int(0.011 * SR)) * gr    # a little width: the right ear 11 ms late

    # ── DROPS ──
    time = 1.0
    while time < LE:
        k = fold_k(time)
        dens = 0.7 + 4.5 * smooth(k) if time < L0 else 2.0
        time += rng.exponential(1.0 / dens)
        place(bus, droplet(rng.uniform(900, 2400), rng.uniform(0.03, 0.06)), time, rng.uniform(-0.8, 0.8))

    # ── the SUB ──
    sub = np.zeros(n)
    for s_i, (s0, cname) in enumerate(seq):
        if s0 < R * 0.4 and s_i == 0:
            s0 = R * 0.4
        s1 = seq[s_i + 1][0] if s_i + 1 < len(seq) else LE + 3.0
        i0, i1 = int(s0 * SR), int(min(total, s1 + 0.3) * SR)
        m = i1 - i0
        tt = np.arange(m) / SR
        env = smooth(tt / 0.8) * (1 - smooth((tt - (m / SR - 0.6)) / 0.6))
        sub[i0:i1] += env * np.sin(TAU * hz(CHORDS[cname][0] + 12) * tt) * 0.026
    bus[0] += sub
    bus[1] += sub

    bus = hall(bus, 2.8, 0.30, seed=11)
    # the first two seconds come up (the bed crossfades in over 2 s anyway) and the tail goes to silence
    bus *= smooth(t / 0.5)
    bus *= 1 - smooth((t - (total - 2.5)) / 2.5)
    return bus


# ───────────────────────────── the morph's own sounds ─────────────────────────────

GLASS = [1.0, 2.32, 4.25, 6.63]


def creak(base, dur, rng, bend):
    """a ratchet of micro-impulses ringing glass modes that bend in pitch — glass being forced into a new shape"""
    n = int(dur * SR)
    out = np.zeros(n + int(0.06 * SR))
    time = 0.0
    while time < dur:
        rate = 18 + 30 * rng.random()
        time += (1.0 / rate) * rng.uniform(0.6, 1.4)
        k = time / dur
        f0 = base * (1 + bend * (k - 0.5))
        m = int(rng.uniform(0.012, 0.04) * SR)
        tt = np.arange(m) / SR
        tick = np.zeros(m)
        for gi, r in enumerate(GLASS):
            tick += np.sin(TAU * f0 * r * tt + rng.random() * TAU) * np.exp(-tt / (0.012 / (1 + gi))) / (1 + gi)
        env = np.sin(np.pi * np.clip(k, 0, 1)) ** 0.7
        i = int(time * SR)
        if i + m <= len(out):
            out[i:i + m] += tick * env * rng.uniform(0.5, 1.0)
    return out * 0.045


def whoosh(dur, f_from, f_to, rng):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    tt = np.arange(n) / SR
    k = tt / dur
    def fc(time):
        kk = time / dur
        return f_from * (f_to / f_from) ** kk
    y = resonant_lowpass(noise, fc, q=1.4)
    b, a = butter(2, 220 / (SR / 2), btype='high')
    y = lfilter(b, a, y)
    env = smooth(k / 0.45) * (1 - smooth((k - 0.45) / 0.55))
    return y * env * 0.06


def shimmer_cloud(t0, t1, f_lo, f_hi, dens_lo, dens_hi, vel, rng, bus, pan_from=-0.8, pan_to=0.8):
    time = t0
    while time < t1:
        k = (time - t0) / max(0.01, t1 - t0)
        dens = dens_lo + (dens_hi - dens_lo) * k ** 1.4
        time += rng.exponential(1.0 / max(0.5, dens))
        f = f_lo * (f_hi / f_lo) ** k * rng.choice(GLASS[:3]) * rng.uniform(0.98, 1.02)
        dur = rng.uniform(0.04, 0.12)
        pan = pan_from + (pan_to - pan_from) * k + rng.uniform(-0.5, 0.5)
        place(bus, grain(f, vel * (0.4 + 0.8 * k) * rng.uniform(0.6, 1.0), dur, rng.uniform(20, 90), rng), time, pan)


def load_json(rel):
    import json
    with open(os.path.join(ROOT, rel)) as f:
        return json.load(f)


def fold(idx):
    """src/room/clusterMorph.ts foldTargets(idx): era1.json + reinterp_deltas r1…r(idx+1)"""
    era1 = load_json('data/room/era1.json')
    deltas = load_json('data/room/reinterp_deltas.json')
    m = {}
    for d in era1['props']:
        m[d['id']] = dict(color=d['color'], pos=list(d['pos']), size=list(d['size']), yaw=d.get('yaw', 0), present=True,
                          model=d.get('model'), parts=d.get('parts'))
    for k in range(idx + 1):
        dl = deltas.get(['r1', 'r2', 'r3', 'r4'][k]) or {}
        for pid, o in (dl.get('props') or {}).items():
            t = m.get(pid)
            if not t:
                continue
            for f in ('color', 'pos', 'size', 'model', 'yaw'):
                if f in o:
                    t[f] = list(o[f]) if isinstance(o[f], list) else o[f]
        for pid in dl.get('remove') or []:
            if pid in m:
                m[pid]['present'] = False
        for d in dl.get('add') or []:
            m[d['id']] = dict(color=d['color'], pos=list(d['pos']), size=list(d['size']), yaw=d.get('yaw', 0), present=True,
                              model=d.get('model'), parts=d.get('parts'))
    return m


def static_ids():
    """clusterMorph.ts constantPropIds(): identical in every space state (and its baseline), not a model"""
    sig = lambda t: repr([t['color'], t['pos'], t['size'], t['yaw']]) if t and t['present'] else 'ABSENT'
    base = fold(-1)
    folds = [fold(i) for i in range(4)]
    out = set()
    for pid, t0 in folds[0].items():
        if not t0['present'] or t0['model'] or t0['parts']:
            continue
        s0 = sig(t0)
        if not all(sig(f.get(pid)) == s0 for f in folds):
            continue
        if pid in base and sig(base[pid]) != s0:
            continue
        out.add(pid)
    return out


def glob_events(idx, C):
    """the moments objects vanish, appear and change in one cascade, in seconds from its start, in clusterMorph's own
    order (the diagonal sweep by x + z, each box starting at i/(n−1) of the sweep; models swap at once at its start)"""
    prev, nxt, st = fold(idx - 1), fold(idx), static_ids()
    pace = C / (CASCADE + PROP_DUR)
    boxes, events = [], []
    for pid in set(prev) | set(nxt):
        if pid in st:
            continue
        tp, tn = prev.get(pid), nxt.get(pid)
        was, will = bool(tp and tp['present']), bool(tn and tn['present'])
        if (tp or tn)['model'] or (tp or tn)['parts']:
            if was != will or (was and will and tp['pos'] != tn['pos']):
                events.append(dict(t=0.0, kind='appear' if will and not was else 'vanish' if was and not will else 'change',
                                   x=(tn or tp)['pos'][0], big=False, model=True))
            continue
        pos = (tp if tp else tn)['pos']
        kind = ('appear' if will and not was else 'vanish' if was and not will else
                'change' if was and will and repr([tp['color'], tp['pos'], tp['size']]) != repr([tn['color'], tn['pos'], tn['size']]) else
                'flicker' if was and will else None)
        size = (tn if will else tp)['size']
        boxes.append((pos[0] + pos[2], pid, kind, pos[0], max(size) >= 2.0 or 'wall' in pid.lower()))
    boxes.sort(key=lambda b: b[0])
    sweep, dur = CASCADE * pace, PROP_DUR * pace
    for i, (_, pid, kind, x, big) in enumerate(boxes):
        if kind:
            events.append(dict(t=(i / max(1, len(boxes) - 1)) * (sweep - dur), kind=kind, x=x, big=big and kind != 'flicker', model=False))
    return sorted(events, key=lambda e: e['t'])


def morph_layer(name, R, T, B, C, D, walls, idx, **_):
    """⚑ S348 — the same sounds he loved (job 6), now ON the glob events: a creak where things vanish (bending down),
    appear (bending up) or change; a glass tick where they only glitch; a bigger, lower whoosh where a wall moves; the
    rising shimmer following how much is changing; a long soft fall of air through the descent; the bloom on the
    landing. Starts with the cascade (app.ts: cluster.onSpaceChange)."""
    rng = np.random.default_rng(2026 + int(B * 10) + (7 if walls else 0))
    land = T + B + D                          # the landing, from the cascade's start (the cascade starts as the rise ends)
    total = land + MORPH_TAIL
    n = int(total * SR)
    t = np.arange(n) / SR
    bus = np.zeros((2, n))
    ev = glob_events(idx, C)
    pan_of = lambda x: float(np.clip(x / 6.0, -0.9, 0.9))

    # the events, binned (a cascade can fold a dozen things in a second: one sound per bin, scaled by how many)
    BIN = 0.12
    bins = {}
    for e in ev:
        bins.setdefault(int(e['t'] / BIN), []).append(e)
    for b, es in sorted(bins.items()):
        at = b * BIN + rng.uniform(0, 0.03)
        weight = min(2.2, np.sqrt(len(es)))
        kinds = [e['kind'] for e in es]
        x = float(np.mean([e['x'] for e in es]))
        main = 'vanish' if 'vanish' in kinds else 'appear' if 'appear' in kinds else 'change' if 'change' in kinds else 'flicker'
        if main == 'flicker':
            m = int(0.05 * SR)
            tt = np.arange(m) / SR
            tick = sum(np.sin(TAU * rng.uniform(1800, 3200) * r * tt) * np.exp(-tt / 0.01) / (1 + gi) for gi, r in enumerate(GLASS))
            place(bus, tick * 0.012 * weight, at, pan_of(x))
            continue
        bend = {'vanish': -0.12, 'appear': 0.12, 'change': rng.uniform(-0.05, 0.05)}[main]
        base = {'vanish': rng.uniform(600, 1300), 'appear': rng.uniform(1300, 2300), 'change': rng.uniform(800, 1900)}[main]
        c = creak(base, rng.uniform(0.35, 0.8) + 0.15 * weight, rng, bend)
        place(bus, c * (0.55 + 0.35 * weight), at, pan_of(x))
        if any(e['big'] for e in es):
            place(bus, whoosh(2.2, 180, 1100, rng) * 1.6, max(0.0, at - 0.3), pan_of(x))

    # the rising shimmer: over the cascade, its density following the events
    sweep_end = 0.6 * C + 0.42 * PROP_DUR * C / (CASCADE + PROP_DUR) + 0.8
    shimmer_cloud(0.1, sweep_end, 1100, 2600, 8, 60, 0.02, rng, bus)
    # soft whooshes, crossing the room with the sweep
    time = 0.0
    while time < sweep_end - 0.6:
        k = time / sweep_end
        up = rng.random() < 0.6
        lo, hi = rng.uniform(300, 600), rng.uniform(1400, 3000)
        place(bus, whoosh(rng.uniform(0.9, 1.7), lo if up else hi, hi if up else lo, rng) * rng.uniform(0.6, 0.9), time, -0.8 + 1.6 * k)
        time += rng.uniform(1.6, 2.8)

    # the descent: a long soft fall of air, and the bloom as you land in the seat
    place(bus, whoosh(D + 0.6, 2600, 240, rng) * 0.9, land - D, 0.0)
    m = int(3.2 * SR)
    tt = np.arange(m) / SR
    bloom = np.zeros(m)
    for gi, r in enumerate(GLASS):
        for base in (hz(79), hz(86)):                                # G5 and D6: the new room in Lamby's key
            bloom += np.sin(TAU * base * r * tt + rng.random() * TAU) * np.exp(-tt / (1.4 / (1 + gi))) / (1 + 1.5 * gi)
    bloom *= (1 - np.exp(-tt / 0.004)) * 0.05
    place(bus, bloom, land - 0.05, -0.15)
    place(bus, bloom * 0.8, land + 0.012, 0.15)
    shimmer_cloud(land, land + 2.6, 2400, 1600, 40, 4, 0.014, rng, bus, 0.0, 0.0)

    bus = hall(bus, 2.2, 0.36, seed=23)
    bus *= 1 - smooth((t - (total - 1.5)) / 1.5)
    print(f'  {name}: {len(ev)} glob events ({sum(1 for e in ev if e["kind"] == "vanish")} vanish, '
          f'{sum(1 for e in ev if e["kind"] == "appear")} appear, {sum(1 for e in ev if e["kind"] == "change")} change, '
          f'{sum(1 for e in ev if e["big"])} walls) over {max(e["t"] for e in ev):.1f} s of a {C:.0f} s cascade')
    return bus


# ───────────────────────────── out ─────────────────────────────

def write(stem, y, peak):
    y = y / max(1e-9, np.max(np.abs(y))) * peak
    wav = os.path.join(ROOT, 'assets/audio', f'{stem}.wav')
    mp3 = os.path.join(ROOT, 'public/assets/audio', f'{stem}.mp3')
    data = (np.clip(y.T, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    subprocess.run(['lame', '--quiet', '-V4', wav, mp3], check=True)
    rms = 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)
    print(f'{stem}: {y.shape[1] / SR:.1f} s, rms {rms:.1f} dBFS -> {os.path.relpath(mp3, ROOT)}')


def main():
    for name, plan in PLANS.items():
        write(f'passage_{name}', music(name, **plan), 0.85)
        write(f'morph_{name}', morph_layer(name, **plan), 0.85)


if __name__ == '__main__':
    main()
