#!/usr/bin/env python3
"""
tools/tts/render.py — build-time text-to-speech renderer (Supertonic, ONNX, CPU).

WHAT THIS IS: an OFFLINE production tool. It runs on a developer's machine,
once per line that needs a voice, and writes a plain .wav file that gets
committed to the repo like any other asset (public/assets/audio/, alongside
the tape recordings tools/degrade_audio.sh already produces). It is never
invoked by the app, never runs in a browser, and is not part of `npm run
build` or `npm test`. See CLAUDE.md's "No runtime network calls" invariant —
this script is the reason that invariant can stay absolute: all synthesis
happens here, ahead of time, so the shipped build only ever plays a static
file.

ETHICS BOUNDARY (binding — do not remove or weaken this check):
  Synthesize the APPARATUS, never the person. This tool may only render
  lines whose manifest entry carries `"register": "apparatus"` — Lamby,
  Restorify, PureMail, any system/UI-surface voice. It refuses everything
  else. NEVER run this on a `felt` scene or any survivor-side line (Caleb,
  Daniel, any human character) — a synthetic voice there would undercut
  "darkness earned" (CLAUDE.md tone laws). If a future manifest entry wants
  a human voice, that is a conversation with Sérgio first, not a flag to
  this script.

SETUP (one-time, local, human-run — never part of any automated build):
  python3 -m venv .venv && source .venv/bin/activate
  pip install supertonic

  The first synthesis call downloads Supertonic 3's ONNX model weights
  (~415MB) from https://huggingface.co/Supertone/supertonic-3 into the local
  Hugging Face cache (~/.cache/huggingface/ by default) — NOT into this
  repo, NOT vendored, NOT committed. That download needs network access and
  is a deliberate one-time step a human runs outside of any build or CI
  step; nothing in this repo's build pipeline ever fetches it again.

USAGE
  python3 tools/tts/render.py --manifest data/audio/tts_manifest.json --id lamby_puremail_apology
  python3 tools/tts/render.py --manifest data/audio/tts_manifest.json --all

  Or via the npm alias:
  npm run tts -- --id lamby_puremail_apology

Voice presets are Supertonic's stock styles (F1-F5, M1-M5); pick per entry
in the manifest, not here. Expression tags (<laugh>, <breath>, <sigh>, …)
can be inlined directly into a manifest entry's source text upstream if a
future line wants them — this script does not add or strip any.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ALLOWED_REGISTER = "apparatus"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_field(doc, dotted: str):
    """'pureMail.heading' -> doc['pureMail']['heading'];
    'pureMail.lines[]' -> ' '.join(doc['pureMail']['lines'])."""
    parts = dotted.split(".")
    cur = doc
    for part in parts:
        is_array = part.endswith("[]")
        key = part[:-2] if is_array else part
        cur = cur[key]
        if is_array:
            return " ".join(str(x) for x in cur)
    return cur


def resolve_text(entry: dict) -> str:
    if "text" in entry:
        return entry["text"]
    src = entry["source"]
    doc = load_json(ROOT / src["file"])
    pieces = [resolve_field(doc, f) for f in src["fields"]]
    return " ".join(str(p) for p in pieces)


def synth_one(entry: dict) -> None:
    entry_id = entry["id"]
    register = entry.get("register")
    if register != ALLOWED_REGISTER:
        raise SystemExit(
            f"REFUSED: entry '{entry_id}' has register '{register}', not "
            f"'{ALLOWED_REGISTER}'. This tool only synthesizes apparatus/"
            f"system voice — see the ETHICS BOUNDARY in this file's header."
        )

    try:
        from supertonic import TTS
    except ImportError:
        raise SystemExit(
            "supertonic is not installed. Run:\n"
            "  python3 -m venv .venv && source .venv/bin/activate\n"
            "  pip install supertonic\n"
            "(see this file's SETUP header for details)."
        )

    text = resolve_text(entry)
    if not text.strip():
        raise SystemExit(f"entry '{entry_id}' resolved to empty text — nothing to render.")

    tts = TTS(auto_download=True)
    style = tts.get_voice_style(voice_name=entry.get("voice", "F1"))
    wav, duration = tts.synthesize(
        text=text,
        lang=entry.get("lang", "en"),
        voice_style=style,
        total_steps=entry.get("steps", 8),
        speed=entry.get("speed", 1.0),
    )

    out_path = ROOT / entry["outFile"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tts.save_audio(wav, str(out_path))
    print(f"[{entry_id}] wrote {out_path.relative_to(ROOT)} ({float(duration[0]):.2f}s)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", required=True, help="path to a tts_manifest.json")
    ap.add_argument("--id", help="render only the entry with this id")
    ap.add_argument("--all", action="store_true", help="render every entry in the manifest")
    args = ap.parse_args()

    manifest = load_json(Path(args.manifest))
    entries = manifest["entries"]

    if args.all:
        targets = entries
    elif args.id:
        targets = [e for e in entries if e["id"] == args.id]
        if not targets:
            raise SystemExit(f"no entry '{args.id}' in {args.manifest}")
    else:
        raise SystemExit("pass --id <name> or --all")

    for entry in targets:
        synth_one(entry)


if __name__ == "__main__":
    main()
