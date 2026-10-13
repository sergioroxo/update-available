#!/usr/bin/env python3
"""
LambyOS — Welcome Home: the soundtrack, and the timeline everything else follows.

Everything here is made on this machine, at build time, from nothing but code:
  * THE VOICE (the narrator = the apparatus, never Lamby): a local, offline synthesiser — no online TTS service,
    nothing fetched at build time. script.json `voice` picks it: Kokoro-82M (Apache-2.0, via kokoro-onnx, from model
    files on disk) or espeak-ng driving an MBROLA diphone voice. `--voice am_michael` / `--voice mbrola:mb-us2`
    overrides it for an audition.
  * THE MUSIC: a cheerful 1997 jingle composed and synthesised by Claude for the project (FM electric piano, FM bells,
    a pulse lead, a square bass, synthesised drums, brass stabs, an orchestra hit) — numpy/scipy, sample by sample.
  * THE SOUNDS: the LambyOS chime, stings, dings, the tape stretching, the tape chewing, the TV's hiss.

Out (into --work):  timeline.json  (every shot, line, item and caption with its time — render.mjs reads it)
                    advert_audio.wav (48 kHz stereo)
  python3 out/lambyos-advert/src/make_audio.py --work .advert-tmp
"""
import argparse
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter, resample_poly

SR = 48000
HERE = Path(__file__).resolve().parent
RNG = np.random.default_rng(1997)


# ── small DSP kit ────────────────────────────────────────────────────────────────────────────────────────────
def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        g = np.gcd(sr, SR)
        x = resample_poly(x, SR // g, sr // g)
    return x


def write_wav(path, stereo):
    s = np.clip(stereo, -1, 1)
    data = (s * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def lp(x, hz, order=2):
    b, a = butter(order, min(hz / (SR / 2), 0.99), 'low')
    return lfilter(b, a, x)


def hp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), 'high')
    return lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.1, hold=None):
    """n samples; hold = seconds before release (default: all but r)"""
    t = np.arange(n) / SR
    dur = n / SR
    hold = dur - r if hold is None else hold
    env = np.where(t < a, t / max(a, 1e-6), 1.0)
    env = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / d, env)
    env = np.where((t >= a + d) & (t < hold), s, env)
    env = np.where(t >= hold, s * np.clip(1 - (t - hold) / r, 0, 1), env)
    return env


def place(buf, x, at, gain=1.0):
    i = int(round(at * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[:j - i] * gain


# ── instruments ──────────────────────────────────────────────────────────────────────────────────────────────
def fm_ep(f, dur, vel=1.0):
    """the DX-style electric piano: a 1:1 FM pair whose index decays, plus a faint 14:1 tine"""
    t = t_(dur + 0.4)
    idx = 1.6 * np.exp(-t * 6) + 0.25
    mod = np.sin(2 * np.pi * f * t)
    car = np.sin(2 * np.pi * f * t + idx * mod)
    tine = 0.12 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t * 30)
    env = np.exp(-t * 2.2) * np.clip((dur + 0.4 - t) / 0.4, 0, 1) * np.clip(t / 0.003, 0, 1)
    return (car + tine) * env * 0.35 * vel


def bell(f, dur=1.6, vel=1.0):
    """FM bell (3.5:1): the dings and the chime"""
    t = t_(dur)
    idx = 3.0 * np.exp(-t * 3)
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    return car * np.exp(-t * 2.8) * np.clip(t / 0.002, 0, 1) * 0.4 * vel


def pulse_lead(f, dur, vel=1.0, width=0.3):
    t = t_(dur + 0.08)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    ph = np.cumsum(f * vib / SR)
    x = np.where((ph % 1.0) < width, 1.0, -1.0)
    x = lp(x, 3800)
    env = adsr(len(t), a=0.01, d=0.12, s=0.7, r=0.08)
    return x * env * 0.16 * vel


def square_bass(f, dur, vel=1.0):
    t = t_(dur)
    ph = f * t
    x = np.where((ph % 1.0) < 0.5, 1.0, -1.0)
    # a plucked filter: bright then dark
    x = lp(x, 900) * 0.6 + lp(x, 300) * 0.4
    env = adsr(len(t), a=0.004, d=0.15, s=0.55, r=0.04)
    return x * env * 0.28 * vel


def saw(f, t, detune=0.0):
    ph = f * (1 + detune) * t
    return 2 * (ph % 1.0) - 1


def brass_stab(notes, dur=0.45, vel=1.0):
    t = t_(dur)
    x = sum(saw(midi(n), t, d) for n in notes for d in (-0.004, 0.004))
    # the filter opens and closes like a 1997 workstation's brass patch: bright at the attack, dark after
    k = np.exp(-t * 7)
    y = lp(x, 700) * (1 - k) + lp(x, 4500) * k
    env = adsr(len(t), a=0.015, d=0.1, s=0.7, r=0.12)
    return y * env * 0.09 * vel


def pad(notes, dur, vel=1.0):
    t = t_(dur)
    x = sum(saw(midi(n), t, d) for n in notes for d in (-0.006, 0.0, 0.006))
    x = lp(x, 1400, 2)
    env = adsr(len(t), a=0.35, d=0.2, s=0.85, r=0.5)
    return x * env * 0.035 * vel


def kick():
    t = t_(0.35)
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9


def snare():
    t = t_(0.22)
    n = bp(RNG.standard_normal(len(t)), 1200, 7000) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    return (n * 0.5 + tone * 0.35) * 0.8


def hat(open_=False):
    t = t_(0.25 if open_ else 0.05)
    n = hp(RNG.standard_normal(len(t)), 7000)
    return n * np.exp(-t * (12 if open_ else 70)) * 0.18


def clap():
    t = t_(0.2)
    n = bp(RNG.standard_normal(len(t)), 900, 5000)
    env = np.exp(-t * 22)
    for k in (0.0, 0.012, 0.024):
        env += 0.6 * np.exp(-np.maximum(t - k, 0) * 120) * (t >= k)
    return n * env * 0.12


def crash(dur=2.2):
    t = t_(dur)
    n = hp(RNG.standard_normal(len(t)), 4000)
    return n * np.exp(-t * 2.0) * 0.16


def orch_hit(root=60):
    t = t_(0.9)
    notes = [root - 12, root, root + 4, root + 7, root + 12]
    x = sum(saw(midi(n), t, d) for n in notes for d in (-0.005, 0.005))
    x = lp(x, 3000)
    n = bp(RNG.standard_normal(len(t)), 200, 3000) * np.exp(-t * 30)
    env = np.exp(-t * 4.5) * np.clip(t / 0.004, 0, 1)
    return (x * 0.07 + n * 0.3) * env


def sparkle(at_base, buf, start=84, n=8, step=0.045, vel=0.5):
    """a rising glitter of high bells — the infomercial's 'ta-daa'"""
    scale = [0, 4, 7, 12, 16, 19, 24, 28]
    for i in range(n):
        place(buf, bell(midi(start + scale[i % len(scale)]), 0.9, vel), at_base + i * step)


def boing(dur=0.35):
    t = t_(dur)
    f = 300 + 500 * (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.18


# ── the voice ────────────────────────────────────────────────────────────────────────────────────────────────
_KOKORO = None


def speak(text, work, key, rate, V):
    """one line, spoken locally. `rate` multiplies the voice's own speed (the disclaimer is fast, the collapse slow).
    engine 'kokoro': Kokoro-82M (Apache-2.0) via kokoro-onnx, from model files on disk (--kokoro-dir); no network.
    engine 'mbrola': espeak-ng driving an MBROLA diphone voice."""
    global _KOKORO
    out = work / 'voice' / f'{key}.wav'
    out.parent.mkdir(parents=True, exist_ok=True)
    if V['engine'] == 'kokoro':
        import soundfile as sf
        if _KOKORO is None:
            from kokoro_onnx import Kokoro
            d = Path(V['_dir'])
            _KOKORO = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
        lang = 'en-gb' if V['voice'].startswith('b') else 'en-us'
        samples, sr = _KOKORO.create(text, voice=V['voice'], speed=min(2.0, V['speed'] * rate), lang=lang)
        sf.write(str(out), samples, sr, subtype='PCM_16')
    else:
        subprocess.run(['espeak-ng', '-v', V['voice'], '-s', str(round(V['speed'] * rate)), '-p', str(V['pitch']), '-g', '2', '-w', str(out), text], check=True)
    x = read_wav(out)
    # trim the synthesiser's own leading/trailing silence
    nz = np.nonzero(np.abs(x) > 0.004)[0]
    x = x[max(0, nz[0] - 200): nz[-1] + 400] if len(nz) else x
    # the announcer: a little low cut, a little presence, levelled
    x = hp(x, 90)
    x = x + 0.35 * bp(x, 2000, 4500)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.82
    return x


def warp(x, rate_fn):
    """play `x` at a time-varying rate (pitch moves with speed, like a stretching tape); rate_fn(k), k∈[0,1] of output"""
    mean = float(np.mean(rate_fn(np.linspace(0, 1, 4096))))
    n_out = int(len(x) / mean)
    src = np.cumsum(rate_fn(np.arange(n_out) / n_out))
    src = src[src < len(x) - 1]
    return np.interp(src, np.arange(len(x)), x)


# ── build ────────────────────────────────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', default='.advert-tmp')
    ap.add_argument('--kokoro-dir', default='.advert-tmp/kokoro', help='kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases, model-files-v1.0)')
    ap.add_argument('--voice', default=None, help='override script.json voice, e.g. am_michael or mbrola:mb-us2')
    args = ap.parse_args()
    work = Path(args.work).resolve()
    work.mkdir(parents=True, exist_ok=True)
    script = json.loads((HERE / 'script.json').read_text(encoding='utf-8'))
    V = dict(script['voice'])
    if args.voice:
        V = {'engine': 'mbrola', 'voice': args.voice.split(':', 1)[1], 'speed': 174, 'pitch': 46} if args.voice.startswith('mbrola:') \
            else {'engine': 'kokoro', 'voice': args.voice, 'speed': V.get('speed', 1.05) if V['engine'] == 'kokoro' else 1.05}
    V['_dir'] = str(Path(args.kokoro_dir).resolve())

    # 1 · every line spoken, measured
    clips = {}
    for shot in script['shots']:
        for ln in shot.get('lines', []):
            say = ln.get('say', ln['text'])
            if ln.get('fast'):
                x = speak(say, work, ln['id'], 1.52, V)
            elif ln.get('stretch'):
                x = speak(say, work, ln['id'], 0.965, V)
                # the tape stretching: from full speed to under half, the pitch sinking with it
                x = warp(x, lambda k: 1.0 - 0.5 * k ** 1.6)
                fade = np.clip((len(x) - np.arange(len(x))) / (0.25 * SR), 0, 1)
                x = x * fade
            else:
                x = speak(say, work, ln['id'], 1.0, V)
            clips[ln['id']] = x

    # 2 · the timeline: each shot grows to fit its narration
    T = {'fps': 30, 'shots': [], 'lines': [], 'sounds': [], 'items': {}, 'boxes': [], 'type': script['type']}
    cursor = 0.0
    for shot in script['shots']:
        start = cursor
        end_v = 0.0
        prev = 0.0
        for ln in shot.get('lines', []):
            rel = ln['at'] if 'at' in ln else prev + ln.get('gap', 0.3)
            d = len(clips[ln['id']]) / SR
            T['lines'].append({'id': ln['id'], 'shot': shot['id'], 'start': round(start + rel, 3), 'end': round(start + rel + d, 3),
                               'text': ln['text'], 'draft': bool(ln.get('draft')), 'fast': bool(ln.get('fast')), 'stretch': bool(ln.get('stretch'))})
            if 'item' in ln:
                T['items'][ln['item']] = round(start + rel, 3)
            if 'box' in ln:
                T['boxes'].append(round(start + rel, 3))
            if ln.get('slogan'):
                T['slogan'] = {'start': round(start + rel, 3), 'end': round(start + rel + d, 3)}
            prev = rel + d
            end_v = prev + shot.get('tail', 0.5)
        # a montage after the narration: items that flash by on type alone (no narrator)
        if shot.get('montage'):
            m = prev + 0.15
            T.setdefault('montage', [])
            for it in shot['montage']:
                T['items'][it['item']] = round(start + m, 3)
                T['montage'].append({**it, 'start': round(start + m, 3), 'end': round(start + m + it['dur'], 3)})
                m += it['dur']
            end_v = m + shot.get('tail', 0.5)
        length = max(shot['min'], end_v)
        for s in shot.get('sounds', []):
            T['sounds'].append({'shot': shot['id'], 'start': round(start + s['at'], 3), 'text': s['text']})
        T['shots'].append({'id': shot['id'], 'start': round(start, 3), 'end': round(start + length, 3)})
        cursor = start + length
    total = cursor
    T['duration'] = round(total, 3)
    S = {s['id']: s for s in T['shots']}
    # sound captions also end: each lasts until the next caption of its kind or its shot's end
    for i, s in enumerate(T['sounds']):
        nxt = [o['start'] for o in T['sounds'][i + 1:] if o['start'] > s['start']]
        s['end'] = round(min([S[s['shot']]['end']] + nxt[:1]), 3)
    S['ident']['chime'] = 1.6

    # 3 · the voice track
    n = int((total + 0.5) * SR)
    vo = np.zeros(n)
    for ln in T['lines']:
        place(vo, clips[ln['id']], ln['start'])

    # 4 · the music bed, on a 120 bpm grid that starts with the kitchen
    BPM = 120
    beat = 60 / BPM
    g0 = S['kitchen']['start']
    bed_end = S['collapse']['end'] + 4.0       # enough source for the stretch to read into
    nb = int((bed_end - g0) / beat) + 1
    layers = {k: np.zeros(n + 10 * SR) for k in ('pad', 'ep', 'bass', 'drums', 'lead')}
    # C | Am | F | G   — the brochure's progression; one chord per bar
    prog = [(48, [60, 64, 67, 71]), (45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67])]
    # the hook (beats): the jingle the parade and the pack shot sing
    hook = [(76, 1), (79, 1), (81, 1), (79, 1), (76, 1), (74, 1), (72, 2),
            (74, 1), (76, 1), (79, 1), (76, 1), (74, 4),
            (76, 1), (79, 1), (81, 1), (84, 1), (83, 1), (81, 1), (79, 1), (76, 1),
            (77, 1), (76, 1), (74, 1), (71, 1), (72, 4)]
    hook_beats = sum(d for _, d in hook)
    for b in range(nb):
        at = g0 + b * beat
        bar, pos = divmod(b, 4)
        root, chord = prog[bar % 4]
        if pos == 0:
            place(layers['pad'], pad(chord, 4 * beat + 0.3), at)
        # the electric piano: offbeat chords, a little arpeggio on the downbeat
        if pos in (1, 3):
            for nn in chord[:3]:
                place(layers['ep'], fm_ep(midi(nn + 12), beat * 0.45, 0.55), at + beat * 0.5)
        place(layers['ep'], fm_ep(midi(chord[pos % 4] + 12), beat * 0.4, 0.5), at)
        # the bass: root, octave bounce
        place(layers['bass'], square_bass(midi(root), beat * 0.45), at)
        place(layers['bass'], square_bass(midi(root + 12 if pos % 2 else root + 7), beat * 0.4, 0.8), at + beat * 0.5)
        # drums: kick 1 & 3, clap+snare 2 & 4, eighth hats
        if pos in (0, 2):
            place(layers['drums'], kick(), at)
        if pos in (1, 3):
            place(layers['drums'], snare(), at, 0.8)
            place(layers['drums'], clap(), at)
        place(layers['drums'], hat(), at)
        place(layers['drums'], hat(pos == 3), at + beat * 0.5, 0.8)
    # the lead sings the hook in the parade and in the pack shot
    for sec, oct_ in (('parade', 0), ('pack', 0)):
        b0 = int(np.ceil((S[sec]['start'] - g0) / beat))
        bt = b0
        while g0 + bt * beat < S[sec]['end'] - 0.1:
            for note, d in hook:
                at = g0 + bt * beat
                if at >= S[sec]['end'] - 0.1:
                    break
                place(layers['lead'], pulse_lead(midi(note + oct_), d * beat * 0.9), at)
                bt += d
            if sec == 'pack':
                break

    # each layer's level, per shot (crossfaded)
    LEVEL = {
        'kitchen': dict(pad=0.9, ep=0.55, bass=0.0, drums=0.0, lead=0.0),
        'parade': dict(pad=0.5, ep=0.75, bass=0.9, drums=1.0, lead=0.85),
        'flow': dict(pad=0.5, ep=0.75, bass=0.85, drums=0.75, lead=0.0),
        'rooms': dict(pad=1.0, ep=0.6, bass=0.5, drums=0.3, lead=0.0),
        'pack': dict(pad=0.7, ep=0.8, bass=0.9, drums=1.0, lead=0.9),
        'fine': dict(pad=0.5, ep=0.5, bass=0.5, drums=0.45, lead=0.0),
        'collapse': dict(pad=0.5, ep=0.5, bass=0.5, drums=0.45, lead=0.0),
    }
    tt = np.arange(len(layers['pad'])) / SR
    music = np.zeros(len(tt))
    for k, x in layers.items():
        g = np.zeros(len(tt))
        for sid, lv in LEVEL.items():
            a, b = S[sid]['start'], S[sid]['end'] if sid != 'collapse' else bed_end
            w = np.clip((tt - a + 0.25) / 0.5, 0, 1) * np.clip((b - tt + 0.25) / 0.5, 0, 1)
            g = np.maximum(g, w * lv[k])
        music += x * g

    # stings: one per product on its pedestal; dings: one per flowchart box
    stings = np.zeros(len(music))
    roots = {'tape': 72, 'disk': 74, 'streak': 76, 'platform': 77, 'headset': 79}
    for item, at in T['items'].items():
        if item in roots:
            r = roots[item]
            place(stings, brass_stab([r - 12, r - 5, r]), at - 0.05, 0.9)
            sparkle(at + 0.1, stings, start=r + 12, n=5, vel=0.25)
        elif item == 'more':
            place(stings, orch_hit(60), at - 0.02, 1.0)
            place(stings, crash(), at, 1.0)
            place(stings, orch_hit(65), at + 0.38, 0.8)
        else:
            place(stings, bell(midi(84), 1.2, 0.5), at)
            place(stings, bell(midi(91), 1.2, 0.35), at + 0.09)
    for i, at in enumerate(T['boxes']):
        place(stings, bell(midi([84, 86, 88, 91, 96][i]), 1.5, 0.6), at)
        if i == 4:
            sparkle(at + 0.15, stings, start=88, n=8, vel=0.35)
            place(stings, crash(2.5), at, 0.8)
    # the pack shot: the chime motif (the brand's own four notes), and a big chord under the slogan
    pk = T['lines'][[l['id'] for l in T['lines']].index('s1')]['start']
    for i, nn in enumerate([72, 76, 79, 84]):
        place(stings, bell(midi(nn), 1.8, 0.7), pk - 0.55 + i * 0.13)
    place(stings, orch_hit(60), pk, 0.7)
    place(stings, crash(3.0), pk, 0.7)
    music = music + stings

    # 5 · the collapse: the whole bed slows like a stretching tape (pitch sinking with it), from the collapse in
    c0, c1 = S['collapse']['start'], S['collapse']['end']
    i0, i1 = int(c0 * SR), int(c1 * SR)
    seg_src = music[i0:]
    nout = i1 - i0
    k = np.arange(nout) / nout
    rate = 1.0 - 0.6 * k ** 1.2
    src_pos = np.cumsum(rate)
    stretched = np.interp(src_pos, np.arange(len(seg_src)), seg_src) * (1 - 0.35 * k)
    music[i0:i1] = stretched
    music[i1:] = 0.0

    # ducking: the bed steps back under the narrator
    env = lp(np.abs(vo), 8)
    duck = 1 - 0.5 * np.clip(env[:len(music)] / 0.08, 0, 1) if len(env) >= len(music) else None
    if duck is None:
        env = np.pad(env, (0, len(music) - len(env)))
        duck = 1 - 0.5 * np.clip(env / 0.08, 0, 1)
    music = music * duck

    # 6 · sounds: the VCR, the chime, the hop, the chew, the hiss
    sfx = np.zeros(len(music))
    # the machine taking the tape (a motor whirr, a clunk) under the blue screen
    tw = t_(1.1)
    whirr = bp(RNG.standard_normal(len(tw)), 300, 1500) * 0.05 * np.clip(tw / 0.2, 0, 1) * np.clip((1.1 - tw) / 0.3, 0, 1)
    place(sfx, whirr, 0.0)
    place(sfx, kick() * 0.25, 0.05)
    place(sfx, boing(), 1.0)
    # the LambyOS chime: C E G C, bells over a soft swelling chord
    ch = S['ident']['chime']
    for i, nn in enumerate([72, 76, 79, 84]):
        place(sfx, bell(midi(nn), 2.2, 0.8), ch + i * 0.16)
    place(sfx, pad([60, 64, 67, 72], 3.0, 2.2), ch)
    sparkle(ch + 0.7, sfx, start=91, n=6, vel=0.2)

    # the chew: the bed's last instant dragged down to nothing, crinkle, a motor fighting
    cs = S['chew']['start']
    tc = t_(1.9)
    crinkle = bp(RNG.standard_normal(len(tc)), 800, 6000) * (RNG.random(len(tc)) > 0.82) * 0.35
    crinkle = crinkle * np.clip((1.9 - tc) / 0.4, 0, 1)
    motor = np.sin(2 * np.pi * np.cumsum(55 + 25 * np.sin(2 * np.pi * 3.2 * tc) - 30 * tc / 1.9) / SR) * 0.18 * np.exp(-tc * 0.8)
    place(sfx, crinkle + motor, cs)
    # the TV's hiss, from the end of the chew to the end — 'silence under the hiss'; quieter for the small print
    hs = cs + 1.9
    th = np.arange(int((total - hs) * SR)) / SR
    hiss = hp(RNG.standard_normal(len(th)), 2500) * 0.036
    e0 = S['end']['start'] - hs
    level = np.where(th < e0, 1.0, 1.0 - 0.55 * np.clip((th - e0) / 1.5, 0, 1))
    level *= np.clip(th / 0.08, 0, 1) * np.clip((total - hs - th) / 2.0, 0, 1)
    place(sfx, hiss * level, hs)

    # 7 · mix; the tape portion gets a tape's wow and a tape's top end
    L = min(len(music), len(vo), len(sfx))
    mix = music[:L] * 0.9 + vo[:L] * 1.0 + sfx[:L]
    te = int(cs * SR)
    tape = mix[:te]
    wob = np.arange(te) + 0.0018 * SR * np.sin(2 * np.pi * 0.45 * np.arange(te) / SR) / (2 * np.pi * 0.45)
    tape = np.interp(np.clip(wob, 0, te - 1), np.arange(te), tape)
    tape = lp(tape, 11000) + 0.004 * hp(RNG.standard_normal(te), 4000)
    mix[:te] = tape
    mix = mix[:int(total * SR)]
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    # a little width: the bed's pad and EP wider than the narrator
    width = lp(music[:len(mix)] * 0.06, 3000)
    stereo = np.stack([mix + width, mix - width], axis=1)
    write_wav(work / 'advert_audio.wav', stereo)
    (work / 'timeline.json').write_text(json.dumps(T, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'timeline: {total:.2f} s · {len(T["lines"])} lines · audio → {work / "advert_audio.wav"}')
    for s in T['shots']:
        print(f"  {s['id']:9s} {s['start']:6.2f} → {s['end']:6.2f}  ({s['end'] - s['start']:.2f} s)")


if __name__ == '__main__':
    main()
