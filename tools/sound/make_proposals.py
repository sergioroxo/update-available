#!/usr/bin/env python3
"""
Sound proposals for YOUR UPDATE HAS FAILED — 2026-10-03.

Everything here is synthesized from scratch with numpy/scipy (no samples, no
recordings, no downloads, no melodies from anywhere). Run:

    python3 make_proposals.py            # writes the masters (WAV) into ../
    (then _tools/finish.sh normalises to -16 LUFS and encodes MP3)

Deterministic: every random draw is seeded, so a re-run reproduces the files.
"""
import os
import sys
import numpy as np
import scipy.signal as sg
import scipy.io.wavfile as wv

SR = 44100
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '_raw'))
os.makedirs(OUT, exist_ok=True)


# ───────────────────────────── basic tools ─────────────────────────────
def tt(n):
    return np.arange(int(round(n * SR))) / SR


def lp(x, f, o=2):
    return sg.sosfilt(sg.butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, o=2):
    return sg.sosfilt(sg.butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, o=2):
    return sg.sosfilt(sg.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


def peq(x, f0, q, gdb):
    """RBJ peaking EQ."""
    A = 10 ** (gdb / 40)
    w0 = 2 * np.pi * f0 / SR
    al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return sg.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def brown(n, rng):
    x = np.cumsum(rng.standard_normal(n))
    x = hp(x, 12, 1)
    return x / (np.std(x) + 1e-9)


def pink(n, rng):
    # Voss-ish via filtering white noise (Paul Kellet's refined filter)
    w = rng.standard_normal(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    p = sg.lfilter(b, a, w)
    return p / (np.std(p) + 1e-9)


def white(n, rng):
    return rng.standard_normal(n)


def fade(x, fi=0.005, fo=0.02):
    x = x.copy()
    ni, no = int(fi * SR), int(fo * SR)
    if ni > 0:
        x[:ni] *= np.linspace(0, 1, ni)
    if no > 0:
        x[-no:] *= np.linspace(1, 0, no)
    return x


def stereo(x):
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def place(buf, snd, at, gain=1.0, pan=0.0):
    """add `snd` (mono or stereo) into stereo `buf` at `at` seconds; pan -1..1 (equal-power)."""
    i = int(round(at * SR))
    if i >= len(buf):
        return
    s = stereo(snd) if snd.ndim == 1 else snd
    n = min(len(s), len(buf) - i)
    if n <= 0:
        return
    th = (pan + 1) * np.pi / 4
    buf[i:i + n, 0] += s[:n, 0] * gain * np.cos(th)
    buf[i:i + n, 1] += s[:n, 1] * gain * np.sin(th)


def hall_ir(rt60, rng, dur=None, pre=0.012, damp=5000, er=True):
    """a synthetic stereo hall impulse: decorrelated exponentially decaying noise, darkening over time."""
    dur = dur or rt60 * 1.1
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        w = rng.standard_normal(n)
        env = np.exp(-6.9078 * t / rt60)
        # darken: blend a low-passed copy in as time goes on
        d = lp(w, damp * 0.35, 1)
        k = np.clip(t / (rt60 * 0.8), 0, 1)
        sig = w * (1 - k) + d * k
        ir[:, c] = sig * env
        ir[:int(pre * SR), c] = 0
    if er:
        for c in range(2):
            for tap, g in [(0.017, .7), (0.029, .55), (0.043, .45), (0.061, .38), (0.083, .3)]:
                j = int((tap + 0.006 * c) * SR)
                if j < n:
                    ir[j, c] += g * (1 if rng.random() > .3 else -1)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    return ir


def reverb(x, ir, wet=0.3):
    x2 = stereo(x)
    y = np.stack([sg.fftconvolve(x2[:, c], ir[:, c]) for c in range(2)], axis=1)
    out = np.zeros_like(y)
    out[:len(x2)] += x2 * (1 - wet)
    out += y * wet * 3.2   # IR is energy-normalised; ~+10 dB makes `wet` behave like a send level
    return out


def write(name, x, sr=SR):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) + 1e-12
    if peak > 0.98:
        x = x / peak * 0.98
    wv.write(os.path.join(OUT, name + '.wav'), sr, (x * 32767).astype(np.int16))
    print(f'  {name}.wav  {len(x)/sr:6.2f}s  {"stereo" if x.ndim == 2 else "mono"}')


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ───────────────────────────── instruments ─────────────────────────────
def bell(f, dur=2.6, dec=1.1, bright=1.0, soft=0.02, seed=0):
    """a lamp-glass / handbell: near-harmonic partials, the upper ones dying first, a faint
    detuned twin for shimmer. Soft attack so it never clicks."""
    rng = np.random.default_rng(seed)
    t = tt(dur)
    parts = [(1.0, 1.00, 1.0), (2.0, 0.34 * bright, 0.62), (3.01, 0.17 * bright, 0.40),
             (4.2, 0.09 * bright, 0.26), (5.43, 0.04 * bright, 0.16)]
    out = np.zeros_like(t)
    for r, a, d in parts:
        ph = rng.random() * 2 * np.pi
        e = np.exp(-t / (dec * d))
        out += a * np.sin(2 * np.pi * f * r * t + ph) * e
        out += 0.35 * a * np.sin(2 * np.pi * f * r * 1.0023 * t + ph + 1) * e   # shimmer twin
    n = int(soft * SR)
    out[:n] *= np.linspace(0, 1, n) ** 1.5
    return out / 1.8


def swell(n_s, rng, lo=300, hi=6000, peak=0.5):
    """an airy noise swell (shaped like a breath: up, then away)."""
    t = tt(n_s)
    x = bp(white(len(t), rng), lo, hi, 2)
    e = np.sin(np.pi * np.clip(t / n_s, 0, 1)) ** 2.2
    return x * e * peak / (np.std(x) + 1e-9) * 0.3


def clap1(rng, centre=None, tight=1.0):
    """one pair of hands: a few flam bursts, then a short band-limited tail."""
    c = centre or rng.uniform(1100, 2600)
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    nb = rng.integers(2, 5)
    for k in range(nb):
        off = int(k * rng.uniform(0.004, 0.011) * SR)
        e = np.exp(-(t[:n - off]) / (0.006 * tight))
        x[off:] += white(n - off, rng) * e * (1 if k == nb - 1 else 0.7)
    tail = white(n, rng) * np.exp(-t / (0.035 * tight)) * 0.45
    x = x + tail
    x = bp(x, c * 0.55, c * 1.9, 2)
    return x / (np.max(np.abs(x)) + 1e-9)


def snap1(rng):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    x = white(n, rng) * np.exp(-t / 0.004)
    x = bp(x, 2500, 7500, 2) + 0.5 * np.sin(2 * np.pi * rng.uniform(2200, 3000) * t) * np.exp(-t / 0.006)
    return x / (np.max(np.abs(x)) + 1e-9)


def stomp1(rng, f0=70):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = f0 * 0.62 + f0 * 0.5 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.075)
    knock = lp(white(n, rng), 1100, 2) * np.exp(-t / 0.012) * 0.55   # the board / shoe
    return (body + knock) / 1.3


def kick(rng=None, f0=48, f1=150):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.exp(-t * 26)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
    r = np.random.default_rng(3)
    x += lp(white(n, r), 4000, 2) * np.exp(-t / 0.003) * 0.28
    return x


def hat(rng, open_=False):
    n = int((0.26 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    x = hp(white(n, rng), 7000, 2) * np.exp(-t / (0.09 if open_ else 0.012))
    return x / (np.max(np.abs(x)) + 1e-9)


def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1


def pad(freqs, dur, rng, bright=1800):
    t = tt(dur)
    out = np.zeros_like(t)
    for f in freqs:
        for dt in (-0.0035, 0.0, 0.0035):
            out += saw(f * (1 + dt), t, rng.random())
    out = lp(out, bright, 2)
    a = min(1.2, dur / 3)
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / min(1.2, dur / 3))
    return out * e / (len(freqs) * 3)


# ───────────────────────────── 01 · the lamps rise ─────────────────────────────
def make_lamps_rise():
    """THE COMMONS — lamps rising out of the crowd to become stars (commonsLamps.ts ASCEND_SECONDS 4.2).
    A cloud of glass bells over a C-major pentatonic (the key the room's own tracks sit in: C/E/A/B),
    starting sparse, thickening, then thinning to a few high, long notes. No melody: the order inside
    the cloud is random but seeded, so it never resolves into a tune. Airy swell underneath."""
    rng = np.random.default_rng(1001)
    L = 8.0
    buf = np.zeros((int(L * SR), 2))
    scale = [60, 62, 64, 67, 69]               # C D E G A
    notes = []
    for oct_ in (1, 2, 3):
        for s in scale:
            notes.append(s + 12 * oct_)
    # onset density rises over 0..3.2 s, then thins out to 4.6 s
    t0 = 0.05
    times = []
    t = t0
    while t < 4.7:
        k = np.clip(t / 3.2, 0, 1) if t < 3.2 else np.clip(1 - (t - 3.2) / 1.5, 0.12, 1)
        gap = rng.uniform(0.28, 0.5) * (1.6 - 1.25 * k)
        times.append(t)
        t += gap
    for i, ti in enumerate(times):
        prog = ti / 4.7
        lo = int(prog * 6)           # the floor of the cloud climbs: they are rising
        n = notes[min(len(notes) - 1, lo + rng.integers(0, 6))]
        vel = 0.55 + 0.4 * rng.random()
        b = bell(midi(n), dur=3.2, dec=1.5 + rng.random() * 0.6, bright=0.8, seed=int(rng.integers(0, 1e6)))
        place(buf, b, ti, gain=0.28 * vel, pan=rng.uniform(-0.8, 0.8))
    sw = swell(5.5, rng, lo=900, hi=7000, peak=0.5)
    place(buf, sw, 0.3, gain=0.22, pan=0)
    ir = hall_ir(3.2, np.random.default_rng(7))
    y = reverb(buf, ir, wet=0.38)
    y = y[:int(L * SR)]
    y = np.stack([fade(y[:, 0], 0.02, 1.2), fade(y[:, 1], 0.02, 1.2)], 1)
    write('01_commons_lamps_rise', y)


# ───────────────────────────── 02 · her lantern ─────────────────────────────
def make_her_lantern():
    """THE COMMONS — she raises her lamp (ball.ts handleClick → raiseHerLamp + flare + answerCommonsFigures).
    One breath of air (the lamp catching), one clear warm bell that is HERS, and then — a third of a
    second later — the hall answering with three softer bells from further off, and a low warm swell."""
    rng = np.random.default_rng(1002)
    L = 4.6
    buf = np.zeros((int(L * SR), 2))
    place(buf, swell(0.45, rng, lo=800, hi=5200, peak=0.5), 0.0, gain=0.35)
    place(buf, bell(midi(67), dur=3.6, dec=1.9, bright=1.0, seed=3), 0.22, gain=0.55, pan=0.0)       # G4: hers
    place(buf, bell(midi(79), dur=3.0, dec=1.4, bright=0.7, seed=4), 0.24, gain=0.16, pan=0.0)       # her octave
    for k, (n, dt, p, g) in enumerate([(72, 0.62, -0.55, 0.30), (76, 0.78, 0.6, 0.27), (81, 0.97, -0.2, 0.24)]):
        place(buf, bell(midi(n), dur=3.0, dec=1.3, bright=0.7, seed=10 + k), dt, gain=g, pan=p)      # C5 E5 A5
    # the room's warmth: a low pad on C (hand-held, not a drone)
    pdl = pad([midi(48), midi(55), midi(64)], 3.8, rng, bright=900)
    place(buf, pdl, 0.55, gain=0.3)
    ir = hall_ir(2.8, np.random.default_rng(9))
    y = reverb(buf, ir, wet=0.34)[:int(L * SR)]
    y = np.stack([fade(y[:, 0], 0.01, 1.0), fade(y[:, 1], 0.01, 1.0)], 1)
    write('02_commons_her_lantern', y)


# ───────────────────────────── 03 / 04 · the room's hands ─────────────────────────────
def hands_cloud(buf, start, dur, peak_rate, shape, rng, n_hands=28, pan_spread=0.85, snaps=0.0, level=1.0):
    """Poisson claps from `n_hands` pairs of hands; rate follows shape(u), u∈[0,1]."""
    clappers = [(rng.uniform(-pan_spread, pan_spread), rng.uniform(1000, 2800), rng.uniform(0.5, 1.0))
                for _ in range(n_hands)]
    t = 0.0
    step = 0.004
    while t < dur:
        u = t / dur
        rate = peak_rate * shape(u)
        if rng.random() < rate * step:
            pan, c, v = clappers[rng.integers(0, n_hands)]
            place(buf, clap1(rng, centre=c) * v, start + t, gain=0.5 * level * (0.5 + 0.5 * shape(u)), pan=pan)
        if snaps and rng.random() < snaps * shape(u) * step:
            place(buf, snap1(rng), start + t, gain=0.35 * level, pan=rng.uniform(-pan_spread, pan_spread))
        t += step


def make_landing_hands():
    """THE COMMONS — a landing (ball.ts nextLine → flare → pulseCommonsLamps('flare')). Per the room's own
    note ('the applause on the landing — NOT laughter, chatter or generic warmth') this is HANDS and FEET and
    nothing else: three foot-stomps that land, a swell of clapping that rises in about a second,
    holds, and falls away with a few last snaps. No voices anywhere, nothing that could be heard as
    a word or a cheer."""
    rng = np.random.default_rng(1003)
    L = 7.5
    buf = np.zeros((int(L * SR), 2))
    for i, (at, g) in enumerate([(0.0, 0.8), (0.34, 0.7), (0.70, 0.9)]):
        for k in range(5):   # five pairs of feet, a few ms apart, so it is a floor and not a drum
            place(buf, stomp1(rng, f0=rng.uniform(62, 84)), at + rng.uniform(0, 0.022), gain=0.16 * g, pan=rng.uniform(-.7, .7))
    shape = lambda u: (np.clip(u / 0.16, 0, 1) ** 1.2) * (1 if u < 0.42 else np.exp(-(u - 0.42) * 3.8))
    hands_cloud(buf, 0.55, 6.2, 52, shape, rng, n_hands=30, snaps=7.0, level=0.9)
    ir = hall_ir(2.2, np.random.default_rng(11))
    y = reverb(buf, ir, wet=0.30)[:int(L * SR)]
    y = np.stack([fade(y[:, 0], 0.01, 1.0), fade(y[:, 1], 0.01, 1.0)], 1)
    write('03_commons_landing_hands', y)


def make_room_pushes_back():
    """THE COMMONS — the room refuses the system (ball.ts refuse(): today ui_refuse, the system's own
    failing-button sound, plays here — so the room's WIN sounds like the machine's error). This is the
    room's side of it: one low stamp of many feet, then a closing of ranks — forty hands at once, within
    a few milliseconds of each other, which reads as a decision, not a cheer — and a short warm tail."""
    rng = np.random.default_rng(1004)
    L = 3.4
    buf = np.zeros((int(L * SR), 2))
    for k in range(9):
        place(buf, stomp1(rng, f0=rng.uniform(58, 78)), 0.0 + rng.uniform(0, 0.03), gain=0.2, pan=rng.uniform(-.8, .8))
    for k in range(42):
        place(buf, clap1(rng, centre=rng.uniform(1100, 2600), tight=0.8), 0.58 + abs(rng.normal(0, 0.012)),
              gain=0.17, pan=rng.uniform(-.9, .9))
    # then a few stragglers, hands finding the rest
    for k in range(10):
        place(buf, clap1(rng), 0.78 + rng.uniform(0, 0.55), gain=0.09, pan=rng.uniform(-.9, .9))
    ir = hall_ir(1.9, np.random.default_rng(12))
    y = reverb(buf, ir, wet=0.28)[:int(L * SR)]
    y = np.stack([fade(y[:, 0], 0.01, 0.6), fade(y[:, 1], 0.01, 0.6)], 1)
    write('04_commons_room_pushes_back', y)


# ───────────────────────────── 05 · a floor to dance on ─────────────────────────────
def make_floor_beat():
    """THE COMMONS — a beat it could dance to: 122 BPM (the room's own tracks), 8 bars = 15.74 s, an exact loop.
    Four-on-the-floor kick, a soft clap on 2 and 4, off-beat open hat, a sub-bass on the off-beats that
    ducks to the kick, and a pad that changes every two bars over a falling bass line (F → E → D → C).
    NO MELODY, no hook, no voice. It is a floor, not a song. Warm, major-leaning, nothing in it that sours:
    the respite must never be a trap."""
    rng = np.random.default_rng(1005)
    bpm = 122.0
    beat = 60.0 / bpm
    bars = 8
    L = bars * 4 * beat
    tail = 2.5
    n = int((L + tail) * SR)
    drums = np.zeros((n, 2))
    bass = np.zeros(n)
    padb = np.zeros((n, 2))
    # ─ drums
    kk = kick()
    for b in range(bars * 4):
        place(drums, kk, b * beat, gain=0.95)
    for b in range(bars * 4):
        if b % 2 == 1:   # beats 2 and 4
            c = clap1(rng, centre=1700, tight=1.1)
            place(drums, c, b * beat, gain=0.34, pan=0.0)
            place(drums, clap1(rng, centre=2100, tight=1.2), b * beat + 0.006, gain=0.2, pan=0.2)
    for b in range(bars * 4):
        place(drums, hat(rng, open_=True), b * beat + beat / 2, gain=0.15, pan=0.18)
        for s in (0.25, 0.75):
            place(drums, hat(rng), b * beat + s * beat, gain=0.05 + 0.03 * (s == 0.75), pan=-0.2)
    # ─ chords: F(maj9) | E(m7) | D(m9) | C(maj7 add9), two bars each; falling bass F E D C
    chords = [
        (53, [65, 69, 72, 76]),      # F2 | F4 A4 C5 E5
        (52, [64, 67, 71, 74]),      # E2 | E4 G4 B4 D5
        (50, [62, 65, 69, 72]),      # D2 | D4 F4 A4 C5
        (48, [64, 67, 71, 74]),      # C2 | E4 G4 B4 D5 (Cmaj9, no 3rd doubling)
    ]
    for ci, (root, ch) in enumerate(chords):
        start = ci * 2 * 4 * beat
        dur = 2 * 4 * beat + 0.6
        pd = pad([midi(m) for m in ch] + [midi(root + 12)], dur, rng, bright=1500)
        place(padb, pd, start, gain=0.46, pan=0.0)
        # sub bass on the off-beats (the 'and'), sine + a hair of 2nd harmonic
        for b in range(2 * 4):
            ts = start + b * beat + beat / 2
            m = tt(beat * 0.46)
            f = midi(root)
            nb = np.sin(2 * np.pi * f * m) + 0.25 * np.sin(2 * np.pi * 2 * f * m)
            nb *= np.exp(-m / 0.2) * np.minimum(1, m / 0.006)
            i = int(ts * SR)
            m_ = min(len(nb), n - i)
            if m_ > 0:
                bass[i:i + m_] += nb[:m_]
    # side-chain pump on bass and pad
    duck = np.ones(n)
    tvec = np.arange(n) / SR
    ph = (tvec % beat)
    duck = 1 - 0.62 * np.exp(-ph / 0.11)
    # a soft attack of each beat's recovery
    bass = bass * duck * 0.9
    padb = padb * duck[:, None]
    mix = drums + padb + stereo(bass) * 0.62
    ir = hall_ir(1.7, np.random.default_rng(13))
    mixr = reverb(mix, ir, wet=0.16)
    mixr = mixr[:n]
    # fold the tail back onto the head: an exact loop
    L_n = int(round(L * SR))
    loop = mixr[:L_n].copy()
    tailpart = mixr[L_n:]
    loop[:len(tailpart)] += tailpart
    # kill any DC, soft-limit
    loop = loop - np.mean(loop, axis=0)
    loop = np.tanh(loop * 0.9) / 0.9
    write('05_commons_floor_beat_122bpm_loop', loop)


# ───────────────────────────── 06 · Malta: the hum lets go ─────────────────────────────
def hvac_2016(n_s, rng, level=1.0):
    """same recipe as tools/make_tones.sh's bed_2016 (open-plan HVAC): brown noise, lowpass 800,
    +12 dB at 74 Hz, +6 at 155 Hz, a slow 0.11 Hz tremolo."""
    n = int(n_s * SR)
    x = brown(n, rng)
    x = lp(x, 800, 2)
    x = peq(x, 74, 0.9, 12)
    x = peq(x, 155, 1.6, 6)
    t = np.arange(n) / SR
    x *= 1 + 0.09 * np.sin(2 * np.pi * 0.11 * t)
    return x / (np.std(x) + 1e-9)


def make_malta_hum():
    """2016 — Malta. The only glitch in the piece that brightens; the old comment in make_tones.sh calls
    its bed 'the only cue in the piece that is a silence' — and nothing in the code does it. This is that
    silence, made rather than implied: the open-plan HVAC (same recipe as bed_2016) lets go over ~5 s —
    its resonance sagging as a fan does when it spools down, its low end first — and what is left is the
    room with the air opened: a very quiet, slightly brighter room tone. Nothing added, nothing
    announced, no tone, no chime: the scene is `felt` and bare."""
    rng = np.random.default_rng(1006)
    L = 12.0
    n = int(L * SR)
    t = np.arange(n) / SR
    hum = hvac_2016(L, rng)
    # spool-down: gain eases to zero between 1.2 s and 6.4 s; the resonance sags (moving lowpass)
    g = np.ones(n)
    a, b = 1.2, 6.4
    k = np.clip((t - a) / (b - a), 0, 1)
    g = 1 - (k * k * (3 - 2 * k))
    # sag: crossfade a lowpassed copy in as it dies
    hum_low = lp(hum, 160, 2)
    hum_mix = hum * (1 - k) + hum_low * k * 1.4
    hum_mix *= g
    # the open room: pink air 250-5000 Hz, rising slowly, kept very quiet
    air = bp(pink(n, rng), 250, 5200, 2)
    air /= (np.std(air) + 1e-9)
    air_env = 0.0 + 0.16 * np.clip((t - 2.5) / 5.0, 0, 1) ** 1.5
    air_env = air_env * (1 + 0.06 * np.sin(2 * np.pi * 0.07 * t))
    y = hum_mix * 0.55 + air * air_env
    y = fade(y, 0.5, 2.0)
    write('06_malta_hum_lets_go_2016', y)


# ───────────────────────────── 07 · Lamby comes apart ─────────────────────────────
def music_box(f, dur=1.4, dec=0.35, detune_cents=0.0):
    t = tt(dur)
    f = f * 2 ** (detune_cents / 1200)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec)
    x += 0.4 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / (dec * 0.5))
    x += 0.18 * np.sin(2 * np.pi * f * 5.04 * t) * np.exp(-t / (dec * 0.3))
    n = int(0.003 * SR)
    x[:n] *= np.linspace(0, 1, n)
    return x


def make_lamby_dispersal():
    """2003 — u3's dispersal (update.ts drawDispersal: the quiet line lands at t ≈ 8.7 s of the 13.5 s install;
    Lamby STANDS 0.9 s, 'sterile', then seven marks leave him over 3.4 s and settle smaller).
    0.0–0.9 s: the standing — a thin, hollow, drained tone (no cheer left in it).
    0.9–4.3 s: seven small plinks, one per mark, scattering and thinning — each one a little flatter,
    quieter and further than the last (more reverb, less top), none repeating a note.
    4.3–5.4 s: one last mark settles; hiss under it. Notes from a G-major pentatonic so they are kin to
    the jingle (whose measured pitch classes are B E A G) without quoting any of its melody.
    2003 hardware: mono, band-limited to ~7.5 kHz, a little bit-crushed — a soundcard, not a studio."""
    rng = np.random.default_rng(1007)
    L = 6.0
    n = int(L * SR)
    mono = np.zeros(n)
    t = tt(L)
    # the standing: a drained interval (a hollow fifth) that thins out
    stand = (np.sin(2 * np.pi * 196 * t) + 0.7 * np.sin(2 * np.pi * 294.3 * t) + 0.25 * np.sin(2 * np.pi * 392.6 * t))
    stand *= np.exp(-t / 0.55) * np.minimum(1, t / 0.08) * 0.22
    mono += stand
    # the seven marks (matching FRAG offsets: it travels, thins and settles)
    pcs = [79, 83, 74, 81, 76, 71, 67]            # G5 B5 D5 A5 E5 B4 G4 (G-major pentatonic-ish scatter, falling overall)
    times = [0.90 + i * (3.4 / 7) * (0.7 + 0.4 * (i / 6)) for i in range(7)]   # spacing opens out: slower as they leave (last mark at 5.0 s ≈ 0.9 + 3.4 + a little)
    for i, (m, ti) in enumerate(zip(pcs, times)):
        far = i / 6
        mb = music_box(midi(m), dur=1.6, dec=0.32 + 0.12 * far, detune_cents=-6 * i)
        mb = lp(mb, 7000 - 4200 * far, 2)
        mono_i = mb * (0.55 - 0.32 * far)
        j = int(ti * SR)
        mono[j:j + len(mono_i)] += mono_i[:max(0, n - j)]
    # the last mark that settles
    last = music_box(midi(67 - 12), dur=2.2, dec=0.7, detune_cents=-30) * 0.14
    j = int(4.4 * SR)
    mono[j:j + len(last)] += last[:n - j]
    # distance: a small bright-to-dark reverb tail that grows
    ir = hall_ir(1.4, np.random.default_rng(15), damp=3500)
    wetmix = reverb(mono, ir, wet=0.45)[:n]
    y = wetmix.mean(axis=1)
    # hiss floor under the settle
    hiss = hp(white(n, rng), 2500, 1)
    y += hiss * 0.0022 * np.clip((t - 3.8) / 0.8, 0, 1) * np.clip((L - t) / 0.8, 0, 1)
    # 2003 soundcard: band-limit and crush
    y = lp(y, 7500, 3)
    y = np.round(y * 120) / 120.0
    y = fade(y, 0.004, 0.5)
    write('07_lamby_dispersal_2003', y)


# ───────────────────────────── 08 · 1997 night, alive ─────────────────────────────
def make_bed_1997_alive():
    """1997 — the bedroom at night, with a house in it. The existing bed_1997 is the PSU fan and nothing else
    (tools/make_tones.sh:79, a uniform noise: the shortlist itself warned 'uniform is subtly dead' and asked
    for the events layer; it was never made). Same fan recipe, so it drops in as a swap, plus the events
    the brief named: the hard disk seeking now and then, heating pipes ticking as they cool, one car far off,
    the house settling. Exactly 60 s and loops without a seam (every event is placed away from the join and
    the fan's slow tremolo completes whole cycles)."""
    rng = np.random.default_rng(1008)
    L = 60.0
    n = int(L * SR)
    x = brown(n + 4 * SR, rng)
    x = lp(x, 1100, 2)
    x = peq(x, 120, 1.4, 10)
    x = peq(x, 240, 2.0, 6)
    x = peq(x, 52, 1.0, 7)
    # equal-power crossfade of the last 4 s into the first 4 s: a seamless loop
    cf = 4 * SR
    ti = np.arange(cf) / cf
    head = x[:cf] * np.sin(ti * np.pi / 2) + x[n:n + cf] * np.cos(ti * np.pi / 2)
    fan = x[:n].copy()
    fan[:cf] = head
    fan /= np.std(fan) + 1e-9
    t = np.arange(n) / SR
    fan *= 1 + 0.06 * np.sin(2 * np.pi * (8 / L) * t)    # 8 whole cycles per loop: no phase jump
    fan *= 1.0
    ev = np.zeros((n, 2))
    # ─ hard-disk seeks: bursts of head clicks and a short grind
    def seek(rng_, steps):
        m = int(0.9 * SR)
        s = np.zeros(m)
        tcur = 0.0
        for k in range(steps):
            j = int(tcur * SR)
            ln = int(0.012 * SR)
            tc = np.arange(ln) / SR
            click = (white(ln, rng_) * np.exp(-tc / 0.0018)) + 0.9 * np.sin(2 * np.pi * rng_.uniform(2300, 3500) * tc) * np.exp(-tc / 0.004)
            click = bp(click, 800, 5200, 2)
            s[j:j + ln] += click[:max(0, m - j)] * rng_.uniform(0.6, 1.0)
            tcur += rng_.uniform(0.028, 0.075)
        gl = int(min(0.35, 0.05 * steps) * SR)
        tg = np.arange(gl) / SR
        j0 = int(0.01 * SR)
        grind = bp(white(gl, rng_), 300, 1700, 2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 62 * tg))) * np.exp(-tg / 0.14)
        s[j0:j0 + gl] += grind * 0.35
        return s / (np.max(np.abs(s)) + 1e-9)
    for at, steps in [(6.4, 5), (19.8, 3), (20.9, 6), (37.0, 4), (51.6, 7)]:
        sk = seek(rng, steps)
        place(ev, sk, at, gain=1.8, pan=-0.15)
    # ─ pipes ticking as they cool: tiny damped metal, spacing opening out
    def tick(rng_, f):
        m = int(0.12 * SR)
        tc = np.arange(m) / SR
        x_ = np.sin(2 * np.pi * f * tc) * np.exp(-tc / 0.012) + 0.4 * np.sin(2 * np.pi * f * 1.93 * tc) * np.exp(-tc / 0.007)
        return x_
    for base, spacings in [(13.5, [0.0, 0.9, 2.3, 4.5, 7.4]), (44.0, [0.0, 1.3, 3.2])]:
        for sp in spacings:
            place(ev, tick(rng, rng.uniform(780, 1010)), base + sp, gain=0.6, pan=0.55)
    # a single low knock somewhere in the house (a door? a joist?)
    kn = np.sin(2 * np.pi * 118 * tt(0.2)) * np.exp(-tt(0.2) / 0.035) + 0.5 * lp(white(int(0.2 * SR), rng), 400, 2) * np.exp(-tt(0.2) / 0.02)
    place(ev, kn, 29.2, gain=0.40, pan=0.7)
    # ─ one car, far off: noise through a house, a window's worth of Doppler (pan L→R, brighter then dull)
    cl = 9.0
    nc = int(cl * SR)
    tc = np.arange(nc) / SR
    car = pink(nc, rng)
    low = lp(car, 260, 2)
    mid = bp(car, 300, 1300, 2)
    env_low = np.exp(-0.5 * ((tc - 4.2) / 1.9) ** 2)
    env_mid = np.exp(-0.5 * ((tc - 3.9) / 1.0) ** 2)
    cmono = low * env_low * 0.9 + mid * env_mid * 3.0
    cmono = lp(cmono, 1500, 2)
    cpan = np.clip((tc - 4.0) / 3.0, -1, 1)
    carst = np.stack([cmono * np.cos((cpan + 1) * np.pi / 4), cmono * np.sin((cpan + 1) * np.pi / 4)], 1)
    j = int(31.0 * SR)
    ev[j:j + nc] += carst * 0.5
    # fold: nothing crosses the loop edge
    evm = ev.mean(axis=1) * 1.0
    mono = fan * 0.62 + evm * 0.5
    # ensure the quiet edges: fade events away within 0.2 s of the join (they are far from it already)
    write('08_bed_1997_night_alive', mono)


# ───────────────────────────── 09 / 10 · Noa's video ─────────────────────────────
def make_noa_room_tone():
    """2016 — Noa's video (`felt`; 24 s; NOA_SECONDS = 24; the shot is her lap, her brother's flannel and her hands).
    The video is silent today. A person who sent a video 'instead of writing it out' sent it from a room with a
    cheap laptop mic: so this is ONLY that room — a laptop fan, a fridge through a wall, the mic's automatic gain
    breathing up in the pauses, and twice the soft sound of flannel under hands where she stops. No voice, no
    music, nothing added by anyone: bare. If the silence is the argument, keep the silence; this is here so he can hear
    what 'bare but present' sounds like next to it."""
    rng = np.random.default_rng(1009)
    L = 24.0
    n = int(L * SR)
    t = np.arange(n) / SR
    fan = lp(pink(n, rng), 2600, 2)
    fan = peq(fan, 190, 3, 5)
    fan /= np.std(fan)
    fridge = np.zeros(n)
    for h, a in [(100, 1.0), (200, 0.6), (300, 0.25)]:
        fridge += a * np.sin(2 * np.pi * h * t + rng.random() * 6)
    fridge = lp(fridge, 600, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t) * 0.2)
    fridge /= np.std(fridge)
    # AGC breathing: the gain creeps up after loud, falls when something moves — a slow sinusoid-ish ramp plus steps at the rustles
    rustles = [(5.6, 0.9), (16.7, 1.2)]
    agc = 1 + 0.18 * np.sin(2 * np.pi * 0.09 * t + 1.1)
    base = fan * 0.5 + fridge * 0.22
    y = base * agc
    for at, d in rustles:
        m = int(d * SR)
        tm = np.arange(m) / SR
        r = bp(white(m, rng), 900, 5200, 2)
        env = (np.sin(np.pi * np.clip(tm / d, 0, 1)) ** 2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.1 * tm + rng.random() * 3)))
        r = r * env / (np.std(r) + 1e-9) * 0.5
        j = int(at * SR)
        y[j:j + m] += r
        agc_bump = 1 + 0.4 * np.exp(-((t - at - d) ** 2) / 3.0) * (t > at)
        y *= agc_bump
    # a webcam mic is narrow: 120 Hz – 7 kHz
    y = bp(y, 90, 7000, 2)
    y = fade(y, 1.0, 1.5)
    write('09_noa_video_room_tone_2016', y)


def make_noa_graded_bed():
    """2016 — the other half of correction 13 ('Honest Light: cools · tightens · lays the bed under'; era3.ts / graceQueueLite.ts:1712
    already DRAWS the bed 'unbroken, from end to end' under the graded waveform and nothing sounds it).
    A platform's inspirational stock bed: a soft pad on C, a slow I–V–vi–IV (C G Am F), a glassy
    pluck on the beat, a cool high shimmer. Pleased with itself, which is the satire's own rule ('make the
    tool more pleased with itself, never make her more ridiculous') — and exactly the thing that could read as mocking a
    `felt` scene. ⚑ ETHICS GATE, HIS: the video is `felt`, 'nothing is ever drawn OVER it'; whether anything may be HEARD
    over it is the same question. Made so he can hear whether it is the satire or the harm; never wire it unheard."""
    rng = np.random.default_rng(1010)
    bpm = 84
    beat = 60 / bpm
    L = 24.0
    n = int(L * SR)
    buf = np.zeros((n, 2))
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    bar = 4 * beat
    nbars = int(L / bar) + 1
    for b in range(nbars):
        root, ch = chords[b % 4]
        pd = pad([midi(m) for m in ch] + [midi(root)], bar + 0.9, rng, bright=2400)
        place(buf, pd, b * bar, gain=0.55)
        for s in range(8):      # glassy pluck, eighth notes, broken chord
            m = ch[[0, 1, 2, 1, 0, 1, 2, 1][s]] + 12
            pl = bell(midi(m), dur=1.1, dec=0.45, bright=0.6, soft=0.004, seed=int(b * 8 + s))
            place(buf, pl, b * bar + s * beat / 2, gain=0.17 + 0.03 * (s % 2 == 0), pan=(-0.3 if s % 2 == 0 else 0.3))
    sh = hp(white(n, rng), 6500, 2) * 0.003 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * np.arange(n) / SR))
    buf[:, 0] += sh
    buf[:, 1] += sh[::-1]
    buf = buf[:n]
    ir = hall_ir(1.6, np.random.default_rng(21))
    y = reverb(buf, ir, wet=0.2)[:n]
    y = np.stack([fade(y[:, 0], 1.2, 1.8), fade(y[:, 1], 1.2, 1.8)], 1)
    write('10_noa_graded_bed_2016', y)


# ───────────────────────────── 11 · the 2003 shoot's room tone ─────────────────────────────
def make_hall_room_tone():
    """2003 — the ROOM_TONE file on TAPE_04_CAPTURE ("the hall, empty. Audio only.") and, under the takes, the hall the
    infomercial was shot in. W1-D10 (walkthrough 1: 'the room tone is not working'): the file was a waveform that made
    no sound. A converted hall used as a studio: air handling far above the ceiling (a low rumble), a vent's slow wash,
    a ballast's hum at twice the mains (120 Hz and its harmonics). No voice, no event, nothing that tells you what room
    it is beyond its size: flat, a little cold, and made to loop (the tail is folded onto the head, so the seam is silent)."""
    rng = np.random.default_rng(1011)
    L = 8.0
    pad_s = 1.0
    n = int((L + pad_s) * SR)
    t = np.arange(n) / SR
    rumble = lp(brown(n, rng), 140, 2)
    rumble /= np.std(rumble)
    wash = bp(pink(n, rng), 280, 2400, 2)
    wash /= np.std(wash)
    wash *= 0.8 + 0.2 * np.sin(2 * np.pi * (1 / L) * t + 0.7)          # one slow swell per loop, so the seam is a whole period
    hum = sum(a * np.sin(2 * np.pi * h * t + rng.random() * 6) for h, a in [(120, 1.0), (240, 0.4), (360, 0.18)])
    hum /= np.std(hum)
    y = rumble * 0.55 + wash * 0.30 + hum * 0.05
    # fold the pad onto the head: the loop's end meets its start without a join
    m = int(pad_s * SR)
    ramp = np.linspace(0, 1, m)
    out = y[:n - m].copy()
    out[:m] = out[:m] * ramp + y[n - m:] * (1 - ramp)
    write('11_testimony_hall_tone_2003', out)


if __name__ == '__main__':
    which = sys.argv[1:]
    makers = {
        '01': make_lamps_rise, '02': make_her_lantern, '03': make_landing_hands, '04': make_room_pushes_back,
        '05': make_floor_beat, '06': make_malta_hum, '07': make_lamby_dispersal, '08': make_bed_1997_alive,
        '09': make_noa_room_tone, '10': make_noa_graded_bed, '11': make_hall_room_tone,
    }
    for k, f in makers.items():
        if not which or k in which:
            f()
