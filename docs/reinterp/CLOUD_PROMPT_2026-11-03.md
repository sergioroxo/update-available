STATUS: live

# Prompt for a Claude Code cloud session (~$10 of credits)

*Start a cloud session on the repository (branch `reinterp`) and paste everything below the line. It is a code-only
job: no browser, no walk — it is checked by the type checker and the tests, which a cloud sandbox can run.*

---

You are working on "YOUR UPDATE HAS FAILED" (PlayCanvas + Vite + TypeScript). Branch from `reinterp` to
`claude/one-voice`. Read CLAUDE.md first; its laws bind you (one voice at a time; Lamby never in felt or respite scenes;
no storage; explicit `git add` paths; never stage README.md; one BUILD_LOG.md line; every docs/**.md starts with
`STATUS:`). Keep the job small and finish it: budget about $10 — stop and report rather than start anything else.

Task — docs/reinterp/CODEX_BRIEFS_2026-11-02.md, brief 3 "One voice at a time, everywhere": audit every place in
src/desktop/os.ts (and the 2016 workstation src/room/graceQueueLite.ts) that opens a window or shows a toast on a timer
(`openPacket(`, `openProvotype(`, `this.toast =`, `openRestorify(`, `openAccountabilityAlert(`, `startEvening(`, the
forced opens `formForced` / `checkinForced`) and make each wait while Lamby/Lambient is speaking
(`lambyGuide.active`), capped at 20 seconds so a balloon never holds the story — follow S304's pattern
(`packetLambyT`, `PACKET_LAMBY_WAIT` in os.ts). Felt surfaces are untouched. Run `npx tsc --noEmit -p .` and `npm test`
(both must pass). Write docs/reinterp/ONE_VOICE_REPORT_2026-11-03.md (STATUS: live) listing every opener and what it
now waits for. Commit, push the branch `claude/one-voice`, and open a pull request into `reinterp` titled
"One voice at a time, everywhere".
