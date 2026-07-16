# Phase 5A Real Mixed-Route Observation Audit

Date: 13 July 2026  
Workflow batch: `workflow-20260713-113257`  
Scope: read existing Source Queue/corpus state and write derived dry-run planning
artifacts only. No triage, model, processing command, queue/corpus mutation,
upload, or publication was authorized.

## Result

The real seven-source rehearsal covered all required routes and passed:

| Queue ID | Existing state | Corpus document | Base route | Specialist route | Observed next state |
|---|---|---|---|---|---|
| `987b8608` | triaged | `398f62e9` | ordinary | — | already processed; compile outcome |
| `0c651b34` | triaged | `4629e6edc509` | attended base | media | media report pending |
| `832bd8f2` | triaged | `943c17073c87` | attended base | testimony | stale specialist evidence; repair/rebuild indicated |
| `68b7cbc1` | triaged | `ae461eb8` | attended base | legal | human legal decision required |
| `d3280826` | triaged | `7aad9b2c` | attended base | media | ready for media report |
| `cfba4f06` | triaged | — | technical hold | longform | required source attachment missing |
| `89fa580f` | ingested | `4164338a0d54` | deferred | — | leave settled |

Coverage evidence:

- ordinary: 1;
- media: 2;
- testimony: 1;
- legal: 1;
- longform: 1;
- technical holds: `cfba4f06`;
- human-required: `68b7cbc1`;
- routing errors: 0;
- execution readiness: `not_assessed`;
- execution authorized: `false`.

## Generated derived artifacts

- Workflow:
  `/Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/workflow_batches/workflow-20260713-113257/plans/workflow-20260713-113257--e36072d248ba.json`
- Dispatch:
  `/Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/specialist_dispatch/workflow-20260713-113257/plans/workflow-20260713-113257--0294a9d03945.json`
- Mixed rehearsal:
  `/Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/workflow_rehearsals/workflow-20260713-113257/rehearsals/workflow-20260713-113257--bbdb591a3220.json`

Each artifact also has one replaceable `latest_*.json` projection. Exactly six
derived files were created across the three workflow-specific export folders.

## Independent fingerprint recomputation

| Artifact | Recomputed fingerprint | Stored fingerprint | Match |
|---|---|---|---|
| Workflow | `e36072d248bad403ed0f7d36036ec3148540af4877154b5d4b7e4971bf6bb9f6` | same | yes |
| Dispatch | `0294a9d03945de6001e98df55ca81bf1d09a5345057cef9eda73f76a164207eb` | same | yes |
| Rehearsal | `bbdb591a3220fae485a9296d17ef152c2f80bdca7e0cc672ae7364d6d9dc00a4` | same | yes |

The workflow summary and dispatch summary were independently recomputed and
matched. The dispatch binds the workflow fingerprint, and the rehearsal binds
both the workflow and dispatch fingerprints.

## Existing triage was reused

All seven selected rows had non-empty `triaged_at` and `triage_model_used`
values before planning. Their selected-row projections were identical after the
rehearsal. Triage-history counts and latest timestamps were also unchanged.

Six rows have one existing history event. The older `d3280826` row has a
completed `triaged_at`/`triage_model_used` state but no legacy history-table row;
the rehearsal did not attempt to backfill or alter that historical gap.

## Non-mutation evidence

Source Queue database before and after:

- SHA-256:
  `dcd05c8debc3a0eb66a8779ea7abb07b610e34e1e8fe6b74ac82e8602f14c7e4`;
- size: `6295552` bytes;
- modification timestamp: `1783859853`;
- change timestamp: `1783859853`.

The hash, size, and timestamps were identical before and after.

Selected corpus-directory metadata manifests before and after:

| Document | Files | Metadata-manifest SHA-256 |
|---|---:|---|
| `398f62e9` | 16 | `15e057a371160066da1182a79e0ddfe6fee7b45a2c396626061a4817316fbdd8` |
| `4629e6edc509` | 23 | `c62a897e79f486c86bc2a30c7983c0529b6e483b5456afb6f7c5a73da40c0307` |
| `943c17073c87` | 20 | `057f4600f39f756cc03a17ce882a8f3c683ba24b9084d12f258e0b0197a1fb89` |
| `ae461eb8` | 14 | `8ecfbb656310e044dcddd6866cf97d5548e73c2db5aae8e454196bf07ed38a7f` |
| `7aad9b2c` | 24 | `50fdf8304dd9fb682d552db422096d2216c89fcf48f5e066b14e77237dfad899` |
| `4164338a0d54` | 21 | `12fd65f7f7295bc40616f5fe21e34ed1a2fcaa6b3234d881c0d891f14712f46e` |

Every count and manifest hash was identical before and after. Planned command
arrays in the dispatch JSON are inert data: the rehearsal CLI did not invoke
them, acquire a model lock, import into the corpus, or perform a remote write.

## Research implications observed

- Existing triage successfully produces a coherent mixed route without being
  rerun.
- Specialist artifact validation adds useful information beyond flags: pending,
  stale, ready-for-report, human-required, and waiting-for-base-processing are
  distinguishable.
- The known document `7aad9b2c` can be represented and routed by the new
  workflow/dispatch layer; its earlier Document List `KeyError: 'name'` is a
  separate Streamlit display defect, not a routing failure.
- Missing longform source material fails closed as a technical hold rather than
  disappearing from the batch.
- Already-settled material remains deferred and is not routed back into base
  processing.

## Independent audit verdict

**GO. Phase 5A observational gate satisfied.**

The independent verifier loaded the three live artifacts, validated them against
the live corpus, recomputed all fingerprints and summaries, regenerated the
mixed rehearsal, and confirmed the regenerated stable report exactly matched
the stored report. It also independently confirmed the unchanged database
hash/stat and the six-file derived export footprint.

Non-blocking provenance debt: legacy media item `d3280826` has valid populated
triage fields but no corresponding `source_queue_triage_history` row. This
predates Phase 5A and remained unchanged. If addressed later, it should be
backfilled from existing evidence without rerunning triage.

Phase 5A does not authorize Phase 6 subprocess execution. Phase 6 must retain
its own explicit authorization, allowlist, lease, attempt, and remote-write
boundaries.
