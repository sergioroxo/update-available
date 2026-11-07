STATUS: live

# Brief 8, ready for Codex (7 Nov 2026) — Vera's ordinary message before the platform

*Paste everything below the line into a NEW Codex chat.*

---

Repository: sergioroxo/update-available, branch `reinterp` (contains S317: Vera's 2016 v2 is merged).
**Work in your own folder:** `cd /Users/sergiogalvaoroxo/update-available-reinterp && git fetch origin && git worktree add -b codex/e3-mirrored-message ../codex-e3-message origin/reinterp`,
then work only in /Users/sergiogalvaoroxo/codex-e3-message (symlink node_modules from the main folder). NEVER run
`git checkout` in /Users/sergiogalvaoroxo/update-available-reinterp. Push your branch at the end, not `reinterp`.

Build **Brief 8** exactly as written in docs/reinterp/CODEX_BRIEFS_BUILD_E3_E4_2026-11-03.md (§8, the core, then
increments (a), (b), (c), one commit each), with the shared rules and GUARDS at the top of
docs/reinterp/CODEX_BRIEFS_OWN_THING_2026-11-03.md. **Sérgio's decisions (7 Nov), which settle the brief's open points:**

1. **Guard 2 is confirmed:** her own thing is an ordinary private object or act — never an identity signal — and
   nobody declares acceptance of her to make the scene work.
2. **Placement:** the first workstation screen that takes input BEFORE any platform work. The brief says the
   "SisterSignal" sign-in screen; Vera's 2016 v2 (S317, "Vera's welcome") may have changed that screen — check the
   current `graceQueueLite.ts` and put the notice on whatever is now the first input screen before the work, never
   inside a Lambient line.
3. **The Lamb mark is hidden while the personal notice is up** (it would read as the platform watching her).
   "Silent" also covers the Start menu map and the guide glow on that screen.
4. **The copy** (use exactly; mark nothing PENDING):
   - The mirrored message (workstation card + phone lock screen, same moment): sender **Orla**, text
     **"are you coming thursday? dee's keeping the corner table. no pressure x"**
   - (a) Groups: **"The Wick lot"** — muted, **87** unread; **"SisterSignal team"** — **3** unread.
   - (b) The unsent draft in Notes, titled **"Mam"**: **"Mam — I won't make Sunday. It isn't you. It's"** (it stops
     there; nothing explains why).
     Two more of her own notes above it, ordinary (guard 2): **"shop: oat milk · bin bags · card for dee"** and
     **"leisure centre car park free after 6"**. Read-only, newest first, the Mam draft at the top.
   - (c) Camera roll: three near-duplicate photos of the same slice of birthday cake on a saucer (14 March), one of
     them blurred; and one screenshot: **"46A · last bus 22:40"**. Drawn as pre-authored sprites in the era's
     palette; no faces, no people, no captions that explain. Measure the bytes/preload first, as the brief says.
5. Clears on the next real navigation; no clock, no repeat. E3 has no respite: these are `felt`.

Verify as the brief says (`npx tsc --noEmit -p .`, `npm test`, photograph each increment, then
`node tools/walk.mjs --port 3114 --max 2600 --require-close` must reach the Close). Write
docs/reinterp/CODEX_E3_MIRRORED_MESSAGE_REPORT_2026-11-07.md (STATUS: live) and one BUILD_LOG.md line. Reply with the
branch, the commits, whether the walk reached the Close, and an 8-line plain summary.

**Already done, do not redo (S318, 7 Nov):** the guard-1 transition lines from `OWN_THING_AUDIT_2026-11-03.md`
§ "Jump legibility / guard 1" were rewritten on `reinterp` in `data/strings/updates.json` and `slice.json`. Rule
they now follow: the file stays with the programme; the person does not carry it. "Your" never reaches across an
era change (Daniel E1→E2 is the one exception). If you touch Vera's arrival, keep "Installed. A file was opened
for you." and "= your file: new, cross-referenced".
