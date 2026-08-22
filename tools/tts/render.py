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
    'pureMail.lines[]'    -> ' '.join(doc['pureMail']['lines']);
    'tapes[tapeA].segments[a-welcome].caption'
                          -> the list item whose own 'id' is tapeA / a-welcome.

    The third form exists because the tape captions live in a LIST keyed by id,
    not a dict, and the alternative was pasting the text into the manifest. That
    would have frozen a copy: these captions are PLACEHOLDER pending Sérgio's
    voice pass, so a manifest copy would go stale the moment he rewrites a line
    and the rendered audio would quietly stop matching the subtitle under it.
    ⚑ The manifest names WHERE the words live; it must never hold the words."""
    parts = re.findall(r"[^.\[\]]+(?:\[[^\]]*\])?", dotted)
    cur = doc
    for part in parts:
        m = re.match(r"^([^\[]+)(?:\[([^\]]*)\])?$", part)
        key, sel = m.group(1), m.group(2)
        cur = cur[key]
        if sel is None:
            continue
        if sel == "":
            return " ".join(str(x) for x in cur)
        match = next((x for x in cur if isinstance(x, dict) and x.get("id") == sel), None)
        if match is None:
            raise KeyError(f"no item with id '{sel}' in '{key}' (field: {dotted})")
        cur = match
    return cur


def resolve_text(entry: dict) -> str:
    if "text" in entry:
        return entry["text"]
    src = entry["source"]
    doc = load_json(ROOT / src["file"])
    pieces = [resolve_field(doc, f) for f in src["fields"]]
    return " ".join(str(p) for p in pieces)


def collect_batch(node, requires, out):
    """Walk a parsed narrative JSON and collect every object that carries ALL of
    `requires` (e.g. ["text", "audio"]) with non-empty values.

    ⚑ WHY A WALK AND NOT A PATH EXPRESSION (S77). Era 4's L has ~30 short lines
    spread across conversation units, chip replies and label beats, and the
    whole point of the voice is that they are ONE VOICE IN ONE SITTING — the
    design doc's own words: "one voice, one description, ALL lines in one batch
    (drift kills the effect)". Hand-listing thirty dotted paths in the manifest
    would be thirty chances for a line to be added later and quietly never
    voiced, and the failure mode of that is a conversation where one sentence
    sounds like a different machine. A walk cannot miss a line that exists.

    ⚑ AND A LINE WITH NO `audio` KEY IS DELIBERATELY SKIPPED, not an error:
    s4_l.json's held silences (u3's fourth beat) carry empty text and no
    filename on purpose. Nothing renders a silence.
    """
    if isinstance(node, dict):
        if all(str(node.get(k, "")).strip() for k in requires):
            out.append(node)
        for key, value in node.items():
            if key.startswith("_"):
                continue  # authoring metadata, this repo's own convention
            collect_batch(value, requires, out)
    elif isinstance(node, list):
        for value in node:
            collect_batch(value, requires, out)
    return out


def load_tts():
    try:
        from supertonic import TTS
    except ImportError:
        raise SystemExit(
            "supertonic is not installed. Run:\n"
            "  python3 -m venv .venv && source .venv/bin/activate\n"
            "  pip install supertonic\n"
            "(see this file's SETUP header for details)."
        )
    return TTS(auto_download=True)


def check_register(entry: dict) -> None:
    register = entry.get("register")
    if register != ALLOWED_REGISTER:
        raise SystemExit(
            f"REFUSED: entry '{entry['id']}' has register '{register}', not "
            f"'{ALLOWED_REGISTER}'. This tool only synthesizes apparatus/"
            f"system voice — see the ETHICS BOUNDARY in this file's header."
        )


def render(tts, entry: dict, text: str, out_rel: str, label: str) -> None:
    style = tts.get_voice_style(voice_name=entry.get("voice", "F1"))
    wav, duration = tts.synthesize(
        text=text,
        lang=entry.get("lang", "en"),
        voice_style=style,
        total_steps=entry.get("steps", 8),
        speed=entry.get("speed", 1.0),
    )
    out_path = ROOT / out_rel
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tts.save_audio(wav, str(out_path))
    print(f"[{label}] wrote {out_path.relative_to(ROOT)} ({float(duration[0]):.2f}s)")


def synth_batch(entry: dict) -> None:
    """⚑ ONE VOICE, ONE SITTING (S77). A `batch` entry renders EVERY line in a
    narrative data file through a single TTS instance with a single voice style,
    in one process. That is not a convenience — it is the design constraint:
    `REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md` §4 says all lines go in one
    batch because drift kills the effect, and Era 4's whole premise is a voice
    that never varies, never tires and never has a bad day.

    ⚑ THE ETHICS BOUNDARY IS UNCHANGED AND IS CHECKED FIRST: `register` must
    still be "apparatus". A batch is a bigger gun, so it gets the same safety.
    """
    check_register(entry)
    spec = entry["batch"]
    requires = spec.get("requires", ["text", "audio"])
    doc = load_json(ROOT / spec["file"])
    lines = collect_batch(doc, requires, [])
    if not lines:
        raise SystemExit(f"batch '{entry['id']}' matched no lines in {spec['file']}.")
    text_field = spec.get("textField", "text")
    audio_field = spec.get("audioField", "audio")
    out_dir = spec.get("outDir", "public/assets/audio/")
    print(f"[{entry['id']}] {len(lines)} line(s), one voice ({entry.get('voice', 'F1')}), one sitting")
    tts = load_tts()
    for line in lines:
        render(tts, entry, line[text_field], out_dir + line[audio_field], line.get("id", "?"))


def synth_one(entry: dict) -> None:
    if "batch" in entry:
        synth_batch(entry)
        return
    check_register(entry)
    text = resolve_text(entry)
    if not text.strip():
        raise SystemExit(f"entry '{entry['id']}' resolved to empty text — nothing to render.")
    render(load_tts(), entry, text, entry["outFile"], entry["id"])


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
