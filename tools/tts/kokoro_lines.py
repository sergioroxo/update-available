#!/usr/bin/env python3
"""
tools/tts/kokoro_lines.py — the 2026 company's one voice, rendered at build time (S412, UiB job 33 Part A; T97·H6).

WHAT THIS IS. An OFFLINE production tool, like tools/tts/render.py: it runs on a developer's machine, never in the app,
never in `npm run build` or `npm test`, and only the rendered audio enters the project. It reads a dialog file
(default data/dialog/s4_acts.json), finds every object whose `audio` name begins `l_`, and speaks its `say` (or its
`text`, joined) in the file's `voice` (Kokoro-82M, Apache-2.0, run offline with mlx-audio from his MimikaStudio install:
memory note `kokoro-via-mimikastudio`). For each line it
  1. renders a WAV master (24 kHz mono) and keeps it in assets/audio/ (the masters directory),
  2. publishes the MP3 that ships (96 kbps mono, 44.1 kHz) to public/assets/audio/,
  3. measures the clip and writes its length back into the dialog file as `seconds`, so the director can hold every
     caption for max(its reading time, the clip's real length + a breath) (memory note `rendered-audio-needs-registering`).
It does NOT register the name: add each new name to src/audio/tapeAudio.ts's REGISTRY by hand (an unregistered name is
never requested, silently).

ETHICS BOUNDARY (binding, as in render.py): the apparatus only. The file's `voice.register` must be "apparatus", and a
line inside a block marked `"register": "felt"` or `"respite"` is refused. L, Second Thoughts and Shepherd are the
company's products; no person in the piece is ever voiced.

USAGE (Parts B and C render Second Thoughts' and Shepherd's lines the same way: give them `audio: "l_b5_….mp3"` and an
optional per-line `speed`):
  python3 tools/tts/kokoro_lines.py                 # every l_ line whose MP3 is missing
  python3 tools/tts/kokoro_lines.py --force          # every l_ line, again
  python3 tools/tts/kokoro_lines.py --only l_a1_hello.mp3
  python3 tools/tts/kokoro_lines.py --file data/dialog/s4_acts.json --voice af_heart
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIMIKA = Path('/Applications/MimikaStudio.app/Contents/Resources')
PY = MIMIKA / 'python/bin/python3.11'
SITE = MIMIKA / 'backend/venv/lib/python3.11/site-packages'
HF_HOME = Path.home() / 'Library/Application Support/MimikaStudio/huggingface'
SNAP = HF_HOME / 'hub/models--mlx-community--Kokoro-82M-bf16/snapshots/a71e4d38b236d968966a2002c4c895dbd12b1c3c'


def lines_in(node, path='', inherited=None):
    """every (path, obj) whose `audio` begins l_, with the register of the nearest block that names one"""
    reg = inherited
    if isinstance(node, dict):
        reg = node.get('register', inherited)
        a = node.get('audio')
        if isinstance(a, str) and a.startswith('l_'):
            yield path, node, reg
        for k, v in node.items():
            if k.startswith('_'):
                continue
            yield from lines_in(v, f'{path}.{k}' if path else k, reg)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from lines_in(v, f'{path}[{i}]', reg)


def spoken(obj):
    if isinstance(obj.get('say'), str):
        return obj['say']
    t = obj.get('text')
    return ' '.join(t) if isinstance(t, list) else str(t)


def duration(path: Path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return round(float(out), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', default='data/dialog/s4_acts.json')
    ap.add_argument('--only', default=None)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--voice', default=None)
    args = ap.parse_args()
    f = ROOT / args.file
    doc = json.loads(f.read_text(encoding='utf-8'))
    voice = doc.get('voice', {})
    if voice.get('register') != 'apparatus':
        sys.exit('refused: the file\'s voice.register must be "apparatus" (the company\'s products only; never a person)')
    name = args.voice or voice.get('name', 'af_heart')
    vfile = SNAP / 'voices' / f'{name}.safetensors'
    if not PY.exists() or not vfile.exists():
        sys.exit(f'Kokoro is not where his MimikaStudio keeps it ({PY}, {vfile})')
    pub = ROOT / 'public/assets/audio'
    archive = ROOT / 'assets/audio'
    archive.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, HF_HOME=str(HF_HOME), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', PYTHONPATH=str(SITE))
    done = 0
    for path, obj, reg in lines_in(doc):
        audio = obj['audio']
        if reg in ('felt', 'respite'):
            sys.exit(f'refused: {path} is inside a {reg} block — a person is never voiced')
        if args.only and audio != args.only:
            continue
        mp3 = pub / audio
        if mp3.exists() and not args.force and obj.get('seconds'):
            continue
        stem = audio.rsplit('.', 1)[0]
        text = spoken(obj)
        speed = obj.get('speed', voice.get('speed', 1.0))
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run([str(PY), '-m', 'mlx_audio.tts.generate', '--model', 'mlx-community/Kokoro-82M-bf16',
                            '--voice', str(vfile), '--lang_code', voice.get('lang', 'a'), '--speed', str(speed),
                            '--text', text, '--output_path', tmp, '--file_prefix', stem, '--audio_format', 'wav',
                            '--join_audio'], env=env, check=True, capture_output=True)
            wavs = sorted(Path(tmp).glob(f'{stem}*.wav'))
            if not wavs:
                sys.exit(f'no WAV came back for {audio}')
            master = archive / f'{stem}.wav'
            shutil.copyfile(wavs[0], master)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(master), '-ac', '1', '-ar', '44100',
                        '-codec:a', 'libmp3lame', '-b:a', '96k', str(mp3)], check=True)
        obj['seconds'] = duration(mp3)
        done += 1
        print(f'{audio}: {obj["seconds"]} s · {name} × {speed} · "{text}"')
    f.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{done} rendered; register any new name in src/audio/tapeAudio.ts')


if __name__ == '__main__':
    main()
