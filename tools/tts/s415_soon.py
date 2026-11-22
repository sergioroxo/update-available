#!/usr/bin/env python3
"""
tools/tts/s415_soon.py — L's last line, its voice slowing and breaking (S415, UiB job 33 Part D, beat 13).

    python3 tools/tts/s415_soon.py            # renders, processes, publishes, writes `seconds` and `parts` back

WHAT THIS IS. An OFFLINE production tool beside tools/tts/kokoro_lines.py (same Kokoro-82M voice, af_heart, from his
MimikaStudio install; memory note `kokoro-via-mimikastudio`); only the rendered audio enters the project. The line is his
(P7-48, data/strings/close_message.json `laptopLine`): "L will be waiting for the next update — coming soon." Draft 3 beat
13 asks for L "its voice slowing and breaking", and the job asks that the slowing be done HONESTLY: so nothing here fakes a
voice. The same voice says the line in three phrases, each RENDERED SLOWER than the one before (Kokoro's own `speed`: L's
0.95, then 0.80, then 0.62), and only the last phrase is processed — a tape running down: its pitch and pace lowered in
steps (ffmpeg `asetrate`), with two short drop-outs, and one stutter of its first syllable as the voice catches. The
phrases are trimmed of their own silence and joined with breaths that lengthen.

It writes, into data/dialog/s4_acts.json `act4.b13.soon`:
  `seconds` — the clip's measured length (the director holds the caption for max(reading time, seconds + a breath));
  `parts`   — each phrase's onset in the clip, so the caption shows the words as the voice reaches them.
The clip is `clip` (not `audio`), so kokoro_lines.py never re-renders it plainly. Register the name in
src/audio/tapeAudio.ts's REGISTRY (done for l_b13_soon.mp3).

ETHICS BOUNDARY (as kokoro_lines.py): the apparatus only. L is the company's product; no person is voiced.
"""
import json
import os
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
SR = 24000

# the line's three phrases (their words must join back into the line exactly), and how slowly each is rendered
PHRASES = [('L will be waiting', 0.95), ('for the next update —', 0.80), ('coming soon.', 0.62)]
# the breaths between them, lengthening (seconds)
GAPS = [0.22, 0.45]


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, **kw)


def duration(path: Path) -> float:
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], text=True).stdout.strip()
    return float(out)


def render(text: str, speed: float, out: Path, voice: Path, env: dict) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        run([str(PY), '-m', 'mlx_audio.tts.generate', '--model', 'mlx-community/Kokoro-82M-bf16', '--voice', str(voice),
             '--lang_code', 'a', '--speed', str(speed), '--text', text, '--output_path', tmp, '--file_prefix', 'p',
             '--audio_format', 'wav', '--join_audio'], env=env)
        wavs = sorted(Path(tmp).glob('p*.wav'))
        if not wavs:
            sys.exit(f'no WAV for "{text}"')
        # trim the phrase's own leading and trailing silence; 24 kHz mono
        run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wavs[0]), '-af',
             'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
             '-ac', '1', '-ar', str(SR), str(out)])


def silence(seconds: float, out: Path) -> None:
    run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', f'{seconds:.3f}', str(out)])


def slice_(src: Path, start: float, end: float | None, out: Path, rate: float = 1.0) -> None:
    """a piece of `src`, played `rate` slower (pitch and pace together, as a tape), back at 24 kHz"""
    trim = f'atrim=start={start:.3f}' + (f':end={end:.3f}' if end is not None else '')
    chain = f'{trim},asetpts=PTS-STARTPTS'
    if rate != 1.0:
        chain += f',asetrate={int(SR * rate)},aresample={SR}'
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af', chain, '-ac', '1', '-ar', str(SR), str(out)])


def main() -> None:
    voice = SNAP / 'voices' / 'af_heart.safetensors'
    if not PY.exists() or not voice.exists():
        sys.exit(f'Kokoro is not where his MimikaStudio keeps it ({PY}, {voice})')
    acts_path = ROOT / 'data/dialog/s4_acts.json'
    doc = json.loads(acts_path.read_text(encoding='utf-8'))
    line = json.loads((ROOT / 'data/strings/close_message.json').read_text(encoding='utf-8'))['laptopLine']
    if ' '.join(p for p, _ in PHRASES) != line:
        sys.exit(f'the phrases do not join into his line exactly: {line!r}')
    soon = doc['act4']['b13']['soon']
    if soon.get('register') != 'apparatus':
        sys.exit('refused: the line must be in an "apparatus" block (L is the company\'s product; no person is voiced)')
    env = dict(os.environ, HF_HOME=str(HF_HOME), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', PYTHONPATH=str(SITE))
    stem = soon['clip'].rsplit('.', 1)[0]
    with tempfile.TemporaryDirectory() as tmpd:
        tmp = Path(tmpd)
        parts = []
        for i, (text, speed) in enumerate(PHRASES):
            p = tmp / f'phrase{i}.wav'
            render(text, speed, p, voice, env)
            parts.append(p)
        # the last phrase runs down: four steps, each slower and lower, two drop-outs and one catch on its first syllable
        last, n = parts[2], duration(parts[2])
        cuts = [0, n * 0.18, n * 0.42, n * 0.7, None]
        rates = [1.0, 0.93, 0.86, 0.78]
        pieces = []
        # the catch: its first syllable, once, then a short break, then the phrase from its start
        s0 = tmp / 'catch.wav'; slice_(last, 0, n * 0.16, s0, 1.0); pieces.append(s0)
        g0 = tmp / 'g0.wav'; silence(0.16, g0); pieces.append(g0)
        for k in range(4):
            sk = tmp / f's{k}.wav'
            slice_(last, cuts[k], cuts[k + 1], sk, rates[k])
            pieces.append(sk)
            if k in (1, 2):   # the two drop-outs, lengthening
                gk = tmp / f'd{k}.wav'; silence(0.07 if k == 1 else 0.13, gk); pieces.append(gk)
        tail = tmp / 'tail.wav'
        lst = tmp / 'tail.txt'; lst.write_text(''.join(f"file '{p}'\n" for p in pieces))
        run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(tail)])
        # the whole line: phrase, breath, phrase, a longer breath, the run-down
        seq = [parts[0], None, parts[1], None, tail]
        files, onsets, t, gi = [], [], 0.0, 0
        for item in seq:
            if item is None:
                g = tmp / f'gap{gi}.wav'; silence(GAPS[gi], g); files.append(g); t += GAPS[gi]; gi += 1
                continue
            onsets.append(round(t, 2)); files.append(item); t += duration(item)
        master = ROOT / 'assets/audio' / f'{stem}.wav'
        master.parent.mkdir(parents=True, exist_ok=True)
        lst2 = tmp / 'all.txt'; lst2.write_text(''.join(f"file '{p}'\n" for p in files))
        run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst2), '-c', 'copy', str(master)])
    mp3 = ROOT / 'public/assets/audio' / soon['clip']
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(master), '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k', str(mp3)])
    soon['seconds'] = round(duration(mp3), 2)
    soon['parts'] = [{'text': text, 'at': at} for (text, _), at in zip(PHRASES, onsets)]
    acts_path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{soon["clip"]}: {soon["seconds"]} s · parts at {[p["at"] for p in soon["parts"]]} · "{line}"')


if __name__ == '__main__':
    main()
