# YOUR UPDATE HAS FAILED

*PC Simulator · SurvivingSOGICE · University of Bergen, Center for Digital
Narrative.* A browser + WebXR (Quest 3) narrative experience about how
conversion-practice (SOGICE) networks target queer people online — and how
the demand never changes, only the disguise.

**Status: scaffold (v0.1.0).** `npm run dev` shows the Era-1 BIOS boot
sequence on the in-world monitor with crisp nearest-neighbour pixels. The
room, name entry, the Witness flip, and the desktop apps arrive with the
vertical slice.

## Run

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # type-check + static build to dist/
npm test             # no-network / no-storage invariants + room fold + spec laws
```

`npm test` runs three checkers in `tools/`:

| checker | defends |
|---|---|
| `check-invariants.mjs` | no runtime network, no storage of user input |
| `check-rooms.mjs` | the room deltas fold cleanly over the base room |
| `check-spec.mjs` | dossier `status`, felt-scene purity, `tier`/`register` vocabulary, the ≤3-hero Quest budget, a palette ratchet, and doc lifecycle tracking (`STATUS:` headers, supersession links, opt-in `KILLS:` assertions — see `docs/reinterp/08_STATUS_REGISTER.md` §5) |

### Quest 3 loop
```bash
npm run dev -- --host
tailscale serve --https=443 localhost:5173   # gives an HTTPS URL
# open that URL in the Quest browser
```

### Flat fallback
`?flat=1` renders the desktop canvas alone — for classrooms, low-end
machines, and archival.

### Reinterpretation worktree
This branch carries the isolated reinterpretation build. `?reinterp=1`
enables reinterpretation-only hooks; without that flag the shipped path is
the regression baseline. For flat preview, use `?flat=1&reinterp=1`.

### Standalone prototypes
`?lambyrig=1` opens the isolated Lamby rig lab. It is a canvas-only procedural
prototype for the assistant-as-guide work and is not integrated into the OS.

## Structure

```
src/engine/    PlayCanvas boot, cameras, (later) XR session + the flip
src/desktop/   the offscreen-canvas OS: window manager + apps + era themes
src/witness/   non-interactive back-of-house scenes (computed intake record)
src/dossier/   the dossier (in-OS app in browser; clipboard in VR)
src/state/     the ledger (in-memory only — see CLAUDE.md invariants)
data/          scenes, dialog, strings, paths — ALL narrative text lives here
assets/        aseprite sources (committed) → exported atlases; palettes
tools/         invariant checker, atlas export
docs/          design docs (copies; source of truth = the knowledge base)
```

## Rules of the house

Read **CLAUDE.md** first (AI assistants and humans alike): the privacy
invariants, the register laws (`operable | felt | respite`), the Soft Lo-Fi
doctrine, and the era-update transition grammar.

## Privacy by architecture

No backend. No analytics. No cookies. No storage. The typed name lives in
memory only and is wiped on exit — enforced by CI (`npm test`) and, in
deployment, by CSP. This page cannot phone home even if code tried.
