/**
 * ⚑ THE SEAM EVERY ERA-3 JOB MOUNTS ON — built 2026-08-24, ERA3_BUILD_PLAN
 * stage 4, so the day's six jobs can be written in six files instead of six
 * edits to one 1,400-line class.
 *
 * `ERA3_NARRATIVE.md` §3 gives Era 3 a POOL: six jobs, any order, each with its
 * own verbs and its own screen. Before this file every one of them would have
 * had to be threaded through `graceQueueLite.ts`'s draw/click/version paths by
 * hand, which is how a queue becomes a knot. A job now implements this
 * interface, lives in its own module, and the board finds it by `id`.
 *
 * ⚑ WHAT THE SEAM DELIBERATELY DOES NOT GIVE A JOB:
 *  · **no canvas of its own** — it draws into the ONE surface (CLAUDE.md: all
 *    interaction lives on the offscreen 2D desktop canvas). It is handed a
 *    rectangle inside the maximised window and stays inside it;
 *  · **no direct pointer access** — it registers hit rects and is told which id
 *    was pressed, so the piece's press/release law (a press that travels is a
 *    look, a press that stays is a tap) stays in one place and cannot be
 *    reimplemented six slightly different ways;
 *  · **no timers, no animation clock it owns** — `version()` is the whole
 *    contract with the dirty-upload discipline, and a job that ticks would
 *    re-upload a 676×390 texture forever. If a job genuinely needs to animate,
 *    it takes a clock from the caller, the way the video already does;
 *  · **no writing to the ledger except through its own witness strings**, which
 *    live in `data/` like every other line in the piece.
 *
 * ⚑ AND THE RULE THAT IS NOT ABOUT ARCHITECTURE. A job is a `register:
 * operable` surface: it may glitter, charm and play, and the satire lives in
 * its self-presentation — but the moment a real person's words are on the
 * screen, the surrounding chrome goes quiet. Nothing in a job's own voice ever
 * comments on the person whose testimony, picture, or family it is handling.
 */

/** a rectangle in logical canvas pixels */
export interface TaskRect { x: number; y: number; w: number; h: number }

/** a rectangle the player can press */
export interface TaskHit extends TaskRect { id: string }

/** the area a job may draw in: inside the window's body, above Lambient's lane */
export interface TaskArea extends TaskRect { /** marker only */ readonly task?: true }

export interface TaskSurface {
  /** matches the `id` of this job's row in data/dialog/s3_queue.json's `board` */
  readonly id: string;

  /** the window's title bar while this job is open. GracePlatform names its
   *  own tools; keep the `GracePlatform · X` shape the era already uses. */
  readonly windowTitle: string;

  /** ⚑ the tile goes grey when this returns true, and nothing else decides it.
   *  A job is finished when its own work is finished — never when a count is
   *  reached, never on a timer. */
  complete(): boolean;

  /** monotonic; bumped on every real state change. The board and the open task
   *  both re-upload only when this moves (S37's dirty law). NEVER bump it from
   *  a clock. */
  version(): number;

  /** ⚑ the tile's PICTURE, and it carries the job before the label does
   *  (Sérgio: "every task should be legible as a THUMBNAIL before it is
   *  legible as text"). Draw the thing, not an icon of the category: the
   *  comments job shows comments, the podcast job shows waveforms. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;

  /** the open job. Draw inside `area`; call `hit` for anything pressable. */
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void;

  /** a registered rect was pressed. Return true if it was consumed. */
  press(id: string): boolean;

  /** S157 — a job with a clock of its own (the Story's playback) advances here, once
   *  per frame while it is the open job; it bumps its own version when something moved */
  tick?(dt: number): void;

  /** ⚑ SHE PUT IT DOWN. Optional, and it exists because a job could not tell
   *  the difference between "finished" and "walked away from" — `board-back` is
   *  resolved by the board before a job's `press` ever sees it, so a surface had
   *  no lifecycle hook for leaving. That gap was found by the agent building
   *  `storyCut`, which had a `witness.declined` string it could not reach and
   *  said so rather than manufacturing a second back button that secretly
   *  logged something.
   *
   *  ⚑ It matters beyond tidiness: ERA3_NARRATIVE §4 is that there is NO
   *  compliant path, and a record that notices finishing but not leaving would
   *  quietly contradict that. Leaving is a thing the apparatus notices too.
   *  Called once per put-down, never on completion. */
  onLeave?(): void;

  /** ⚑ ?debug=1 only — every beat this surface has, reachable without playing
   *  to it. check-spec's C6 exists because three sessions shipped beats Sérgio
   *  could not reach and concluded content was missing when it wasn't. A job
   *  with no debug beats is a job nobody will ever review. */
  debugBeat(beat: string): void;

  /** the ids `debugBeat` accepts, so the panel can offer them all */
  readonly beats: readonly string[];
}
