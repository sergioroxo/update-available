STATUS: live

# Isolated itch trial — integration record

Trial folder: `/Users/sergiogalvaoroxo/update-available-itch-trial`.
Branch: `codex/itch-cphdox`.
The original folder remains on its existing branch, with its working files untouched.
Nothing is pushed or merged back into `reinterp` by this integration.

| Codex task | Source | Included in trial | Runtime status |
|---|---|---|---|
| Fingertip handheld games | `codex/hand-play`, `897ae5a6` | Runtime, probe and report (`CODEX_HAND_PLAY_REPORT_2026-11-02.md`) | Integrated; mocked hands pass for FIT IN, CLEAR and MATCH MADE. |
| Lamby opener waits | `codex/lamby-opener-waits`, `7a059572` | Runtime, wait tests and original audit report | Integrated; per-opener 20-second cap and dismissal tests pass. |
| Floor-up dollhouse | `codex/dollhouse-build`, `e02ab648` | Runtime, review tool and original report | Integrated; eight-second reveal and headset menu row. Browser miniature retained. |
| WebXR quad layers | `codex/quad-layers`, `c93326a7` | The compatibility report, copied verbatim as `CODEX__REPORT_2026-11-02.md` | **Not implemented.** The source commit contains no runtime patch. |

The quad-layer task stopped at its explicit compatibility gate. Adding its report does not improve headset text or
provide a compositor-layer comparison. The installed WebGL renderer still uses `XRWebGLLayer` as `baseLayer`.
Implementing compositor layers remains a separate renderer-integration task; no unsupported layer path is enabled here.
See [the original compatibility evidence](CODEX__REPORT_2026-11-02.md).

## Combined trial verification

The three feature patches were applied selectively, rather than importing their duplicate S306/S307 log entries or overwriting the quad-layer report with the hand-play report. Conflicts were resolved to retain the festival edition flag, the optional-highlight redraws, the quiet-scene gate on the introduction card, the offered/playing-video gates before PureMail, and the browser miniature's placement and visibility. The S312 chair placement remains in the trial.

TypeScript, `npm test`, the mocked-hand probe and all thirteen festival playtest regressions pass together. Both normal and festival builds pass. The sandboxed-iframe smoke check reports no console/page errors, missing assets or other-host requests; first-press audio works, festival review switches stay disabled and the normal edition retains its existing defaults.

The mocked-headset review renders all four eras without page errors. Dollhouse peak draw counts are 48 / 55 / 58 / 52. Later-era halfway growth is about 0.52; on-demand geometry is complete (scale 1) with no year plate. A mocked physical-ray press on the headset Dollhouse row closes the menu and creates the miniature (`out/itch/dollhouse-menu.json`). Screenshots and metrics are in `out/itch/integrated-xr/`. The source batch groups span rooms, so the later-era reveal grows the whole miniature together, as specified by the source patch's fallback. This is not a room-by-room independent build.

Original task reports describe their source branches; this document records the combined trial. Real Quest hand accuracy, comfort, stereo performance and the actual itch-hosted XR permissions still need testing. No headset validation is claimed. Nothing is pushed or merged into the original working version.

Updated release: `release/your-update-has-failed_itch_2026-11-03.zip`, 48,730,628 bytes, 263 files (53,799,842 bytes extracted). Packaging checks exact-case imports and relative literal resource URLs.
