STATUS: live

# Isolated itch trial — integration record

Trial folder: `/Users/sergiogalvaoroxo/update-available-itch-trial`.
Branch: `codex/itch-cphdox`.
The original folder remains on its existing branch, with its working files untouched.
Nothing is pushed or merged back into `reinterp` by this integration.

| Codex task | Source | Included in trial | Runtime status |
|---|---|---|---|
| WebXR quad layers | `codex/quad-layers`, `c93326a7` | The compatibility report, copied verbatim as `CODEX__REPORT_2026-11-02.md` | **Not implemented.** The source commit contains no runtime patch. |

The quad-layer task stopped at its explicit compatibility gate. Adding its report does not improve headset text or
provide a compositor-layer comparison. The installed WebGL renderer still uses `XRWebGLLayer` as `baseLayer`.
Implementing compositor layers remains a separate renderer-integration task; no unsupported layer path is enabled here.
See [the original compatibility evidence](CODEX__REPORT_2026-11-02.md).

This integration changes documentation only. It does not require a new zip: the playable runtime is unchanged.
No new TypeScript, browser, headset or compositor test is claimed. The source report's checks describe the earlier task.
