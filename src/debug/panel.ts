/**
 * Debug panel (dev only, ?debug=1) — travel the reinterp build without playing
 * it through. Round 24: rebuilt for LEGIBILITY (Sérgio couldn't tell which
 * version/room he was in — he was on a stale server). It now shows a BUILD TAG,
 * a live "you are here" readout (era + room), clearly-labelled era + room jumps,
 * and a links list of every review URL + the controls. Toggle with backtick (`)
 * or the hide/⚙ buttons.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';

/** bump this each build so the panel says which version is on screen */
/**
 * ⚑ DERIVED AT BUILD TIME, NOT TYPED. Vite substitutes `__BUILD_TAG__` from the
 * live git HEAD (vite.config.ts). S86 and S87 both shipped without touching this
 * constant, so the panel kept announcing "S85a · tablet verification pass" while
 * running their code — and Sérgio and I both spent time unable to tell which
 * build a device was on, which is the exact confusion the Pages cache had
 * already cost three sessions. A version stamp a human has to remember to update
 * is a version stamp that lies. Now it cannot.
 */
declare const __BUILD_TAG__: string;
const BUILD_TAG = typeof __BUILD_TAG__ === 'string' ? __BUILD_TAG__ : 'dev';

interface MotionDiagnostic {
  state: string;
  yawZero: number;
  angles: { alpha: number | null; beta: number | null; gamma: number | null };
  screenAngle: {
    angle: number | null;
    source: 'screen.orientation' | 'legacy' | 'derived' | 'unknown';
    reported: number | null;
  };
  viewport: {
    media: 'portrait' | 'landscape';
    aspect: 'portrait' | 'landscape' | 'square';
    agrees: boolean;
    width: number;
    height: number;
  };
  resolved: { yaw: number; pitch: number; roll: number };
  events: { orientationchange: number; screenChange: number };
  fov?: number;
}

interface DebugOpts {
  /** The live renderer: required for a non-black WebGL canvas readback. */
  app?: pc.Application;
  onEra?: (era: 'e1' | 'e2' | 'e3' | 'e4') => void;
  /** S67 THE BUILDING: replay one era relocation from its own starting seat */
  onRelocate?: (from: 'e1' | 'e2' | 'e3' | 'e4', to: 'e1' | 'e2' | 'e3' | 'e4') => void;
  onReveal?: () => void;
  onClose?: () => void;
  onFacet?: (facet: 'transfem' | 'transmasc' | 'nonbinary' | 'all' | 'none') => void;
  onFlip?: () => void;
  /** dev-only camera jump: seat pose at an exact yaw (review screenshots) */
  onCamProbe?: (yaw: number, pitch: number) => void;
  /**
   * ⚑ S72 — THE POSE TABLES, for the audit tool (`tools/shots.mjs`).
   *
   * `tools/harness/sweep.mjs` kept its own transcription of app.ts's seats and
   * the five S67 overlooks. A copy of a number cannot notice the original
   * moving: the sweep would have gone on photographing retired poses and
   * reporting them clean. So the tool holds no camera numbers at all — it reads
   * `window.__poses` and photographs whatever the build actually flies.
   *
   * Published here rather than in app.ts because this is where the `?debug=1`
   * surface already is (`__camProbe`, three lines below, is the same idiom) —
   * and because it keeps the DEVICE seats, which live in the movement-node
   * graph, and the room seats, which live in app.ts, arriving at the tool
   * through one door.
   */
  poses?: () => unknown;
  /** the send seam (master script §4) — review buttons until beats fire it */
  sends?: { id: string; label: string }[];
  onSend?: (id: string, outcome: 'offered' | 'visited' | 'declined') => void;
  /**
   * ⚑ S80 — LOOK-MODE 3 (the gyro), reviewable from a desk. A desktop browser
   * can neither make the gesture iOS demands nor answer it with a sensor, so
   * without these three the mode is only inspectable on a phone — which is how
   * a look-mode ships broken. `onMotionSim` attaches the REAL listener and
   * feeds it synthetic `deviceorientation` events (see app.ts); `onRecentre`
   * is the same function the game menu's row calls; `onFov` is the pinch
   * zoom's endpoint, so the 30°-legibility question can be looked at rather
   * than argued about.
   */
  onMotionSim?: (on: boolean) => boolean;
  onRecentre?: () => void;
  onFov?: (deg: number) => void;
  /** S83: live, on-device facts; rendered even while the map is collapsed. */
  motionDiagnostic?: () => MotionDiagnostic;
}

/**
 * Every debugJump id `src/desktop/os.ts` accepts, one labelled button each,
 * grouped and ordered as the piece's own spine (S50, per
 * docs/REINTERP_PLAYTHROUGH_NOTES_2026-07-25.md "ROOT CAUSE FOUND"): the panel
 * IS the project lead's map, so a gap here reads as missing content when it
 * isn't. Ids are enumerated from os.ts's debugJump switch directly, not from
 * any notes doc — the notes doc's own count (~51, and a `tape` id) was wrong;
 * `tape` is a profile-ICON case in a different switch (drawProfileIcon), not a
 * debugJump id, so there is nothing to add a button for.
 *
 * check-spec **C6** (tools/check-spec.mjs) parses this file textually for
 * every `id: '...'` below plus OS_BEAT_EXCLUSIONS, and fails the build if
 * os.ts's debugJump accepts an id that appears in neither — so this list
 * cannot silently drift behind the build again. Keep entries as `{ id: '...' }`
 * object literals (not tuples) so that parse stays simple.
 */
type BeatRow = { heading: string } | { label: string; id: string };

const OS_BEATS: BeatRow[] = [
  { heading: 'E1 · 1997 — boot → arrival (Room 1, gay teen)' },
  { label: 'Off (power)', id: 'off' },
  { label: 'O2 — LambyOS boot', id: 'boot' },
  { label: 'O3 — Profile', id: 'profile' },
  { label: 'O3 — Re-caption', id: 'recap' },
  { label: 'Desktop', id: 'desktop' },
  { label: 'Insert kit → O7', id: 'kit' },
  { label: 'Packet · placement form', id: 'packet' },
  { label: 'Diary · deletion beat', id: 'diary' },
  { label: 'Diary glitch → T1', id: 'diaryGlitch' },
  { label: 'Provotype — pillow', id: 'pillow' },
  { label: 'Provotype — intake', id: 'intake' },
  { label: 'lamby_rig.exe — the E1 easter egg (found, not advertised)', id: 'lambyRig' },
  // Session 60: the Dossier card, rebuilt as the second found file — same
  // rules as lamby_rig.exe. In play it appears on an IDLE desktop after the
  // first flip and is never announced; this button opens it directly.
  { label: 'the found file — the renamed dossier (easter egg)', id: 'foundFile' },
  { label: 'T1 ritual · update → E2', id: 'update2' },

  { heading: 'E2 · 2003 — Lamby arrives (Room 1, adult)' },
  // Session 49 (finding 6): every button below jumps INTO the middle of E2.
  // Sérgio reported the video and the check-in as "missing" after landing
  // inside the Caleb thread, where neither is on screen — both are built and
  // both are reachable, but only by PLAYING forward. `e2Silence` is the era's
  // true start, so it is the one button from which the whole chain runs by
  // ordinary clicking: silence → click → Lamby's debut → Begin → Restorify →
  // ONE check-in → Caleb opens by itself → commit-press → the alert → Okay →
  // the video offer → Watch → the New You Program. Verified end-to-end with
  // real clicks in Session 49; the label says so, so a reviewer never has to
  // infer it from the button order.
  { label: 'S2R.0 · silence (play from here)', id: 'e2Silence' },
  // Session 60: the arrival is four beats now, not two — the machine boots at
  // its new version (with its jingle), Lamby introduces HIMSELF, then presents
  // the program he is the face of, then the check-in. Each has its own button
  // so a reviewer can land on the one they mean; `e2Silence` above still plays
  // the whole chain forward by ordinary clicking.
  { label: 'S2R.0b · Restorify splash + LambyOS boot (30 s, the jingle)', id: 'e2Boot' },
  { label: 'S2R.0b · the boot CRAWL alone (skips the splash)', id: 'e2Crawl' },
  { label: 'S2R.1 · ⚑ Lamby introduces himself', id: 'e2Lamby' },
  { label: 'S2R.1b · Lamby presents Restorify', id: 'e2Program' },
  { label: 'S2R.2 · Restorify check-in', id: 'e2Restorify' },
  { label: 'S2R.2b · "a message came in" (Lamby notifies)', id: 'e2Message' },
  { label: 'S2R.3 · Caleb — chat opens', id: 'calebChat' },
  { label: 'S2R.3 · Caleb — commits', id: 'calebCommit' },
  { label: 'S2R.3B · Caleb — apparatus alert', id: 'calebAlert' },
  { label: 'S2R.3C · Caleb — sad Lamby hold', id: 'calebSad' },
  { label: 'S2R.3C · Caleb — caught', id: 'calebCaught' },
  { label: 'S2R.4 · Lamby offers the video', id: 'netvisionOffer' },
  { label: 'S2R.4 · NetVision Player (start)', id: 'netvision' },
  { label: 'S2R.4 · NetVision — THE BREAK', id: 'netvisionBreak' },
  { label: 'S2R.4 · NetVision — static/notice', id: 'netvisionStatic' },
  { label: 'S2R.5 · Caleb — PureMail envelope arrives', id: 'calebMail' },
  { label: 'S2R.6 · Caleb — the residue (quiet after)', id: 'calebResidue' },
  // S2R.7 (Session 58) — the era's ending. `update3` is the whole ritual from
  // its notice (Remind me later → the second belongings gathering → terms →
  // install → restart into Room 2); `u3Dispersal` lands straight on the
  // install screen where Lamby comes apart, since that beat is otherwise ~40s
  // of deferral deep. The residue that CAUSES all of this is `calebResidue`
  // above — play from there to see the era close on its own.
  { label: 'S2R.7 · T2 ritual · update → E3 (+ 2nd belongings pass)', id: 'update3' },
  { label: 'S2R.7 · THE DISPERSAL (u3 install: removed / RENAMED)', id: 'u3Dispersal' },

  { heading: 'E3 → E4 (Room 2 lesbian → Room 3 trans)' },
  // ⚑ S76. In PLAY the ritual arms itself when the correction list is
  // exhausted, and it draws on VERA'S LAPTOP — so this button wants the room at
  // E3 (the era jumps above) or there is nothing on screen to run it on.
  { label: 'T3 ritual · update → E4 (⚑ runs on Vera\'s workstation)', id: 'update4' },
  // …and the era's own two states. Neither moves the room: use the E4 era jump
  // first to land in Maya's seat, then these to set what the visor is showing.
  { label: 'E4 · the headset, waiting (standby — one touch to wear)', id: 'e4Standby' },
  // ⚑ S123 — the fourth boot. 1997 you wait for it, 2003 it announces itself,
  // 2016 it never sleeps, 2026 it RESTORES: it was never off and it kept your
  // place. Six tabs come back and the last one is not hers.
  { label: '⚑⚑ the browser · "Restoring your session" (REVIEW ONLY — not in play)', id: 'e4Browser' },
  { label: '↳ the search she did not finish — four completions, three of them out', id: 'e4BrowserSearch' },
  { label: 'E4 · ⚑ THE PLACE (worn — then turn, and see what happens)', id: 'e4Place' },

  { heading: 'E4 · L — the voice, and the room rewrites (S77)' },
  // ⚑ S77. `e4L` is the LINEAR ENTRY: it is the same thing the one touch does,
  // and from there the whole conversation runs forward by ordinary clicking —
  // L speaks, the chips appear, you answer, it goes on by itself. Every button
  // below lands on one unit with the record filled in as if the ones before it
  // had played; none of them is reachable in play, and none of them is needed.
  { label: 'S4R.1 · L introduces itself (play from here)', id: 'e4L' },
  { label: 'S4R.2 · the room rewrites (L captions her things)', id: 'e4Captions' },
  { label: '⚑ the captions RUN OUT (wrong, wrong, an offer, then nothing)', id: 'e4Unplaced' },
  { label: '⚑⚑ THE DEADNAME · first instance (it lands as paperwork)', id: 'e4Deadname' },
  { label: '⚑⚑ THE DEADNAME · second instance (warmer, and worse)', id: 'e4Deadname2' },
  { label: 'S4R.5 · the chips begin to thin (one greyed)', id: 'e4Shrink' },
  { label: '↳ shrink 2 · the ones you were using grey', id: 'e4Shrink2' },
  { label: '⚑⚑ THE NARROWED FIELD — the correction chip is gone', id: 'e4Narrowed' },
  { label: '↳ …and it comes back, live (the thread out)', id: 'e4Returns' },
  { label: '↳ skip to the chips of whichever unit is up', id: 'e4Chips' },

  { heading: 'E4 · the offers, and the hand-off (S78)' },
  // ⚑ S78. `e4Offers` is the LINEAR ENTRY and it is L's own last unit: press
  // "Show me the quieter month" and everything below runs forward by ordinary
  // clicking, with nothing to press but the memories undo and the careful
  // pause. Every button under it lands on one beat with L already finished,
  // which is where L is whenever the offers are on screen in play.
  { label: 'L\'s last chip hands over (play from here)', id: 'e4Offers' },
  { label: '⚑⚑ THE MEMORIES · "two years ago today" (already enhanced)', id: 'e4Memory' },
  { label: '↳ ⚑ the SAME card, un-enhanced (A/B the two photographs)', id: 'e4MemoryAB' },
  { label: '↳ the second memory — already enhanced, whatever you did', id: 'e4Memory2' },
  { label: 'the wall · four offers put up for her (⚑ read the fine print)', id: 'e4Wall' },
  { label: '⚑ the curation · what was chosen, and what was taken away', id: 'e4Curation' },
  { label: '⚑ the careful pause (two doors, and it waits forever)', id: 'e4Pause' },
  // ⚑ S120 (P4) — moved here from L's units. It is the LAST thing the apparatus
  // asks, and "Opening it now" is the ball arriving.
  { label: '⚑⚑ the friction beat · one reflection, then the stream opens', id: 'e4Friction' },
  { label: '↳ skip its lines and sit on its chips', id: 'e4PauseChips' },
  { heading: 'E4 · ⚑ TRANSCENDANCE — the ball (S79). NO SCREEN: it is in the room' },
  // ⚑ S79. `e4Ball` is the LINEAR ENTRY and it is the break itself: the careful
  // pause has just ended, L has stopped talking for good, and the machine is
  // about to hear something it has no category for. Everything below it runs
  // forward on its own — there is nothing to press until the categories are
  // over, and then the one press is the device on the desk behind you.
  // ⚑ WATCH THE ROOM, NOT THE CANVAS. The ball is light and sound in the
  // building; the visor is on its stand showing standby and the occasional
  // failed caption. Under `?flat=1` there is no room, so these buttons show the
  // captions and the machine only — which is the era's own argument, not a bug.
  { label: '⚑⚑ THE BALL (play from here — the break, then the room)', id: 'e4Ball' },
  { label: '↳ ⚑ NO CATEGORY FOUND (the machine\'s last output, alone)', id: 'e4NoCategory' },
  { label: '↳ the device comes off — the light, and the turn works', id: 'e4BallOpen' },
  { label: '↳ category 1 · THE WAY YOU WALK, TALK AND SIT (1997)', id: 'e4BallCat1' },
  { label: '↳ category 2 · STEADY. STRUGGLING. GRATEFUL. TIRED. (2003)', id: 'e4BallCat2' },
  { label: '↳ category 3 · REMOVE THE UNRESOLVED (2016)', id: 'e4BallCat3' },
  { label: '↳ category 4 · CONDITION: IN REPAIR (tonight)', id: 'e4BallCat4' },
  { label: '↳ ⚑ after · nothing happens, forever (press the device to go on)', id: 'e4BallAfter' },
  // ⚑ S119 — the photo editor's OTHER half, designed 2026-08-05 and built now.
  // Press the small grey line under the picture: it is the same control that
  // worked twice on her own photographs, and here it returns nothing.
  { label: '↳ ⚑⚑ after the ball · L tries to enhance it and cannot', id: 'e4BallShots' },

  { heading: 'E4 · the finale, after the ball (S78)' },
  { label: 'FINALE 1/3 · the glitch', id: 'e4Glitch' },
  { label: 'FINALE 2/3 · the cyclorama (the building\'s own image)', id: 'e4Cyclorama' },
  { label: 'FINALE 3/3 · four panels → hand off (⚑ releases the spine)', id: 'e4Panels' },

  { heading: 'Close' },
  { label: 'Final · Restart as you are', id: 'closeUpdate' },

  { heading: 'Sends — desktop offer review' },
  { label: 'Offer send s1 (desktop)', id: 'send-s1' },
  { label: 'Offer send s2 (desktop)', id: 'send-s2' },
  { label: 'Offer send s3 (desktop)', id: 'send-s3' },
  { label: 'Offer send s4 (desktop)', id: 'send-s4' }
];

/**
 * ⚑ THE E3 DEVICE BEATS (Session 64) — the correction list, the break, the light.
 *
 * These are NOT `debugJump` ids: they live on Room 2's own screens
 * (`src/room/graceQueueLite.ts`), which `src/desktop/os.ts` knows nothing
 * about, so check-spec's C6 cannot see them. They get buttons anyway, and for
 * exactly C6's reason — three previous sessions shipped beats Sérgio could not
 * reach, and concluded content was missing when it wasn't. Deliberately typed
 * as `[label, beat]` tuples rather than `{ id: '…' }` objects so C6's textual
 * parse of this file stays clean and cannot mistake a device beat for an OS one.
 *
 * They reach the live instance through `window.__graceQueue()` — the same
 * `?debug=1` probe app.ts already publishes for review drives — so the panel
 * needs no new wiring through `src/engine/app.ts`.
 */
const E3_DEVICE_BEATS: Array<[string, string]> = [
  ['⚑ the arrival · the IDLE screen (what it does while you fly)', 'idle'],
  ['⚑ the arrival · wake → boot → install GracePlatform', 'arrival'],
  ['⚑⚑ sign in → LAMBIENT ASKS (the initiation)', 'consent'],
  ['↳ Allow — permissions granted', 'consentAllow'],
  ['↳ ⚑ Not now — and it stays anyway', 'consentDecline'],
  ['⚑ sign in → THE BOARD (the day, as tiles)', 'board'],
  ['↳ open tile 1 · the correction list', 'list'],
  ['↳ put the task down (back to today)', 'backToBoard'],
  ['↳ minimise the window (taskbar restores it)', 'minimise'],
  ['↳ ⚑ every tile grey — the day finished', 'boardDone'],
  ['⚑ submission 1 · the seven corrections', 'list'],
  ['apply the open correction', 'apply'],
  ['skip it (files; nothing happens)', 'skip'],
  ['⚑ item 7 · route for mentorship (the hinge)', 'item7'],
  ['⚑ submission 2 · Noa (the video + her corrections)', 'noa'],
  ['↳ her video · press play (24 s)', 'play'],
  ['↳ her video · hold on the last frame', 'playEnd'],
  ['↳ ⚑ correction 13 · APPLY the house look', 'gradeApply'],
  ['↳ ⚑ correction 13 · SKIP it (A/B the picture)', 'gradeSkip'],
  ['the phone · Malta arrives (notification)', 'maltaArrive'],
  ['the phone · open the message', 'maltaOpen'],
  ['the phone · press the reply field', 'reply'],
  ['⚑⚑ THE LIGHT — the brighten, alone', 'light'],
  ['…and back to the E3 rig (A/B)', 'lightOff'],
  // ⚑ S70 — THE TABLET: the comment thread, the template picker, the routing
  // and the propagation. In play the way in is the `N comments` row on the top
  // post of the feed; these land on states that otherwise take minutes of work.
  ['⚑ the tablet · open the comment thread', 'thread'],
  ['↳ pick the first comment (picker opens)', 'threadPick'],
  ['↳ deploy a template (reply + auto-advance)', 'threadReply'],
  ['↳ ⚑ the quiet one — the reply that ROUTES', 'threadRoute'],
  ['↳ pull the next authored arrival forward', 'threadArrive'],
  ['↳ ⚑⚑ THE PROPAGATION — your sentence, returned', 'threadEcho'],
  ['↳ ⚑ the commenter there is no template for', 'threadTrouble'],
  // ⚑ S70 — THE PHONE: FloppySheep. In play the only way in is the icon on her
  // home screen, which nothing points at and nothing ever mentions.
  // ⚑ THE DAY'S OTHER JOBS (stage 4+). Namespaced `<jobId>:<beat>` so a job can
  // name its beats freely; graceQueueLite settles the board and opens the tile
  // before handing the beat on, so each of these lands on a screen a reviewer
  // can actually see — which is the whole reason C6 exists.
  ['⚑⚑ clear the comments · the flagged queue', 'comments:open'],
  ['↳ remove the first kind one', 'comments:removed'],
  ['↳ leave it up instead (files the same)', 'comments:left'],
  ['↳ ⚑ the March reply, last in the queue', 'comments:march'],
  ['↳ the whole queue cleared', 'comments:done'],
  ['⚑ the family line · open it', 'family:open'],
  ['↳ ⚑⚑ the mother no template answers', 'family:quiet'],
  ['↳ send her one anyway', 'family:replied'],
  ['↳ mark her handled without replying', 'family:handled'],
  ['↳ the whole line cleared', 'family:done'],
  ['the podcast · the suggested running order', 'podcast:open'],
  ['↳ moved off the suggestion', 'podcast:reordered'],
  ['↳ locked', 'podcast:published'],
  ['the Story · the suggested forty seconds', 'story:open'],
  ['↳ moved off the suggestion', 'story:moved'],
  ['↳ published (system in-point)', 'story:published'],
  ['↳ ⚑ published on HER sentence instead', 'story:publishedOther'],
  ['⚑ the course · modules and the price', 'course:open'],
  ['↳ priced at the platform pick', 'course:priced'],
  ['↳ ⚑ no charge (real, and unremarked)', 'course:free'],
  ['↳ published', 'course:published'],
  // ⚑⚑ THE PHONE AND THE END OF THE ERA (2026-08-24). Era 3 could not end at
  // all before today — its only exit ran through two retired sends — and it now
  // ends on the cascade, which is what §5 always said it should.
  ['⚑ the phone · the lock screen (quiet)', 'phoneLockQuiet'],
  ['⚑ the phone · home screen', 'phoneHome'],
  ['↳ the group · Maiden-to-be', 'phoneGroup'],
  ['↳ ⚑ the unread backlog (nothing files)', 'phoneInbox'],
  ['↳ open the link → Lambient blocks it', 'phoneBlocked'],
  ['↳ ⚑ IGNORE it → Lambient comes anyway', 'phoneIgnored'],
  ['↳ the law is enacted', 'phoneVoted'],
  ['↳ ⚑⚑ THE CASCADE — it starts', 'phoneCascade'],
  ['↳ ⚑⚑ outnumbered, and the board is still there', 'phoneAfter'],
  ['⚑ the phone · FloppySheep (home screen icon)', 'floppy'],
  ['↳ FloppySheep · running', 'floppyPlay'],
  ['↳ FloppySheep · the oh-no card', 'floppyOver']
];

/**
 * debugJump ids that intentionally have NO panel button — each entry needs a
 * one-line reason. C6 requires every id os.ts's debugJump accepts to be
 * either above (OS_BEATS) or here; currently empty because every id os.ts
 * accepts already has a button above.
 */
const OS_BEAT_EXCLUSIONS: string[] = [
  // (none — see the comment above OS_BEATS)
];

type DebugButtonMark = '⏵ ENTRY' | 'JUMP' | 'ACTION';
/** These are the few desktop states deliberately safe to start cold and then
 * play forward. Every other debugJump is honestly a mid-thread JUMP. */
const OS_ENTRY_IDS = new Set([
  'off', 'update2', 'e2Silence', 'update3', 'update4', 'e4L', 'e4Offers', 'e4Ball'
]);

/** eras with the room + identity + year they now lead (Round 24 model) */
const ERAS: Array<['e1' | 'e2' | 'e3' | 'e4', string]> = [
  ['e1', 'E1 1997 · Room 1 (gay teen)'],
  ['e2', 'E2 2003 · Room 1 adult'],
  ['e3', 'E3 2016 · Room 2 (lesbian)'],
  ['e4', 'E4 now · Room 3 (trans)']
];

/** the three rooms (+ the spine) as seat yaws for the camera jump */
const ROOMS: Array<[string, number]> = [
  ['→ Room 1 · front (gay)', 0],
  ['→ Room 2 · west (lesbian)', 90],
  ['→ Room 3 · east (trans)', 270],
  ['→ spine · door + record', 180]
];

/** review URLs — the "all the options" links Sérgio asked for */
const LINKS: Array<[string, string]> = [
  ['E1 · opening + sealed room', '?reinterp=1&debug=1'],
  ['E2 · Room 1 adult (closed)', '?reinterp=1&era=2&debug=1'],
  ['E3 · rooms open, Vera leads', '?reinterp=1&era=3&debug=1'],
  ['E4 · Maya leads (the TURN)', '?reinterp=1&era=4&debug=1'],
  ['O7 · first-filing reveal', '?reinterp=1&reveal=1&debug=1'],
  ['T1 · watch E1→E2 morph', '?reinterp=1&morph=2&debug=1'],
  ['T2 · watch E2→E3 morph', '?reinterp=1&morph=3&debug=1'],
  ['T3 · watch E3→E4 morph', '?reinterp=1&morph=4&debug=1'],
  ['Close · point cloud', '?reinterp=1&close=1&debug=1'],
  ['Layout T · back = wall', '?reinterp=1&era=2&debug=1'],
  ['Layout X · back = ending arm', '?reinterp=1&era=2&debug=1&layout=x'],
  ['Flat canvas review tool', '?flat=1&reinterp=1']
];

export function mountDebugPanel(os: DesktopOS, opts: DebugOpts = {}): void {
  if (new URLSearchParams(window.location.search).get('debug') !== '1') return;
  if (opts.onCamProbe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__camProbe = opts.onCamProbe;
  }
  if (opts.poses) {
    // S72: see DebugOpts.poses — the audit tool's single source for every
    // camera pose the piece flies, so no tool ever transcribes one again.
    (window as { __poses?: () => unknown }).__poses = opts.poses;
  }

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '8px', left: '8px', zIndex: '9999',
    background: 'rgba(16,18,26,0.94)', color: '#cdd3df',
    font: '11px/1.4 monospace', padding: '8px', borderRadius: '6px',
    border: '1px solid #3a4154', maxHeight: '94vh', overflowY: 'auto',
    width: '238px', userSelect: 'none', boxShadow: '0 2px 12px #0008'
  } as CSSStyleDeclaration);

  const pill = document.createElement('button');
  pill.textContent = '⚙ map';
  Object.assign(pill.style, {
    position: 'fixed', top: '8px', left: '8px', zIndex: '9999', display: 'none',
    background: 'rgba(16,18,26,0.92)', color: '#8fb6ff', border: '1px solid #3a4154',
    font: '11px monospace', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer'
  } as CSSStyleDeclaration);
  const show = (on: boolean): void => {
    panel.style.display = on ? 'block' : 'none';
    pill.style.display = on ? 'none' : 'block';
  };
  pill.addEventListener('click', () => show(true));

  const title = document.createElement('div');
  Object.assign(title.style, {
    fontWeight: 'bold', marginBottom: '2px', color: '#8fb6ff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  } as CSSStyleDeclaration);
  const titleText = document.createElement('span');
  titleText.textContent = 'PIECE MAP';
  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'close ✕';
  Object.assign(hideBtn.style, {
    background: '#222838', color: '#cdd3df', border: '1px solid #39405270',
    font: '10px monospace', padding: '2px 6px', cursor: 'pointer', borderRadius: '3px'
  } as CSSStyleDeclaration);
  hideBtn.addEventListener('click', () => show(false));
  title.appendChild(titleText);
  title.appendChild(hideBtn);
  panel.appendChild(title);

  // BUILD TAG — which version is on screen (answers "which one am I looking at?")
  const build = document.createElement('div');
  build.textContent = 'build: ' + BUILD_TAG;
  build.style.cssText = 'color:#ffd48f;font-size:10px;margin-bottom:4px';
  panel.appendChild(build);

  // ⚑ S85 adds the SECOND half of this key, and it is the half that cost three
  // sessions. S84's marks explain why a button can look like it "does nothing"
  // (a beat whose prerequisites were never met renders as nothing happening).
  // They do not explain the same fault's OTHER symptom: the device findings'
  // §8.2 traced the black board, the floating tape and the missing duck to a
  // jump dropping the ROOM into a fold the played path never reaches — a cold
  // E2 has no filed record, so its wall is legitimately blank. Three reports
  // read as defects because nothing on screen said the state was synthetic.
  const key = document.createElement('div');
  key.textContent = '⏵ ENTRY safe cold · JUMP may need prior state · ACTION only while its beat is live';
  key.style.cssText = 'color:#cdd3df;font-size:9px;line-height:1.35;margin:0 0 3px;padding:4px;border:1px solid #39405270';
  panel.appendChild(key);
  const warn = document.createElement('div');
  warn.textContent = '⚑ a JUMP also leaves the ROOM mid-fold — a blank wall or a missing prop after one is not evidence. Re-check it on the played path.';
  warn.style.cssText = 'color:#ffd48f;font-size:9px;line-height:1.35;margin:0 0 6px;padding:4px;border:1px solid #5a4a2a';
  panel.appendChild(warn);

  // live "you are here": era + room, polled from the app (?debug=1)
  const now = document.createElement('div');
  now.style.cssText = 'color:#8fffc0;font-size:10px;margin:4px 0;min-height:13px;font-weight:bold';
  now.textContent = 'CURRENT: —';
  panel.appendChild(now);
  // draw calls vs the Quest budget (~50–100, WEBXR_PERFORMANCE_NOTES) + how
  // many props the static batcher folded away (?nobatch=1 to compare raw)
  const perf = document.createElement('div');
  perf.style.cssText = 'color:#9fb4c0;font-size:10px;margin-bottom:6px;min-height:13px';
  perf.textContent = 'draw calls: —';
  panel.appendChild(perf);

  // ⚑ S83 — always visible even when the large piece map is collapsed. This
  // is deliberately plain DOM debug chrome, not another diegetic/UI surface:
  // Sérgio needs one iPad photograph that captures the API source, raw sensor
  // noise, rotation-event evidence and the resolved horizon at the same time.
  const motionReadout = document.createElement('pre');
  motionReadout.id = 'motion-diagnostic';
  motionReadout.setAttribute('aria-label', 'device look diagnostic');
  Object.assign(motionReadout.style, {
    position: 'fixed', top: '8px', right: '8px', zIndex: '10000',
    boxSizing: 'border-box', width: 'min(258px, calc(100vw - 16px))',
    margin: '0', padding: '7px 8px', borderRadius: '5px',
    background: 'rgba(16,18,26,0.94)', color: '#cdd3df',
    border: '1px solid #3a4154', font: '10px/1.35 monospace',
    whiteSpace: 'pre-wrap', pointerEvents: 'none', userSelect: 'text',
    boxShadow: '0 2px 12px #0008'
  } as CSSStyleDeclaration);
  motionReadout.textContent = 'GYRO / HORIZON\nwaiting for app…';

  const fmt = (n: number | null): string => n === null ? '—' : `${n.toFixed(1)}°`;
  const paintMotionReadout = (): void => {
    const d = opts.motionDiagnostic?.();
    if (!d) {
      motionReadout.textContent = 'GYRO / HORIZON\ndiagnostic unavailable';
      return;
    }
    const reported = d.screenAngle.reported !== null &&
      d.screenAngle.reported !== d.screenAngle.angle
      ? ` (API said ${fmt(d.screenAngle.reported)})` : '';
    const match = d.viewport.agrees ? 'agree' : 'DISAGREE';
    motionReadout.textContent = [
      `GYRO / HORIZON · ${d.state}`,
      `q₂ ${fmt(d.screenAngle.angle)} · ${d.screenAngle.source}${reported}`,
      `raw α ${fmt(d.angles.alpha)}  β ${fmt(d.angles.beta)}  γ ${fmt(d.angles.gamma)}`,
      `media ${d.viewport.media} · aspect ${d.viewport.aspect}`,
      `${d.viewport.width}×${d.viewport.height} · ${match}`,
      `camera yaw ${fmt(d.resolved.yaw)}  pitch ${fmt(d.resolved.pitch)}  roll ${fmt(d.resolved.roll)}`,
      `events legacy ${d.events.orientationchange} · screen ${d.events.screenChange}`
    ].join('\n');
  };
  window.setInterval(paintMotionReadout, 100);
  paintMotionReadout();

  window.setInterval(() => {
    const s = (window as { __reinterpNow?: string }).__reinterpNow;
    const place = s ?? '— (open a room)';
    now.textContent = 'CURRENT: ' + place;
    pill.textContent = '⚙ ' + (s?.split(' · ')[0] ?? 'map');
    const w = window as {
      __drawCalls?: number;
      __batchedProps?: number;
      __staticBatchedProps?: number;
      __settledBatchedProps?: number;
    };
    if (w.__drawCalls !== undefined) {
      const split = w.__batchedProps
        ? ` · batched props: ${w.__batchedProps} (${w.__staticBatchedProps ?? 0} static + ${w.__settledBatchedProps ?? 0} settled)`
        : ' · UNBATCHED';
      perf.textContent = `draw calls: ${w.__drawCalls}` +
        split;
    }
  }, 250);

  const availabilityPainters: Array<() => void> = [];
  const mkBtn = (parent: HTMLElement, label: string, fn: () => void,
    mark: DebugButtonMark = 'ACTION', armed?: () => boolean): HTMLButtonElement => {
    const b = document.createElement('button');
    b.dataset.mark = mark;
    b.dataset.baseLabel = label;
    const paint = (): void => {
      const unavailable = armed && !armed();
      b.textContent = `${b.dataset.mark} · ${b.dataset.baseLabel}${unavailable ? ' — not armed yet' : ''}`;
      b.style.opacity = unavailable ? '0.66' : '1';
    };
    paint();
    if (armed) availabilityPainters.push(paint);
    Object.assign(b.style, {
      display: 'block', width: '100%', textAlign: 'left', margin: '2px 0',
      background: '#222838', color: '#cdd3df', border: '1px solid #39405270',
      font: '11px monospace', padding: '3px 6px', cursor: 'pointer', borderRadius: '3px'
    } as CSSStyleDeclaration);
    b.addEventListener('mouseenter', () => { b.style.background = '#313a52'; });
    b.addEventListener('mouseleave', () => { b.style.background = '#222838'; });
    b.addEventListener('click', () => {
      if (armed && !armed()) { paint(); return; }
      fn();
    });
    parent.appendChild(b);
    return b;
  };
  const heading = (parent: HTMLElement, text: string): void => {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'color:#7f8aa3;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;margin:8px 0 2px';
    parent.appendChild(h);
  };
  /** Keeps each map branch's open/closed state for the life of this panel. */
  const sectionState: Record<string, boolean> = {};
  const section = (label: string, summary: string, initiallyOpen = false): HTMLElement => {
    const wrap = document.createElement('section');
    wrap.style.cssText = 'border-top:1px solid #39405270;padding-top:4px;margin-top:5px';
    const toggle = document.createElement('button');
    Object.assign(toggle.style, {
      display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
      background: 'transparent', color: '#8fb6ff', border: '0', font: 'bold 10px monospace',
      padding: '2px 0', cursor: 'pointer', textAlign: 'left'
    } as CSSStyleDeclaration);
    const text = document.createElement('span');
    text.textContent = label;
    const marker = document.createElement('span');
    toggle.append(text, marker);
    const detail = document.createElement('div');
    detail.style.cssText = 'color:#7f8aa3;font-size:9px;margin:0 0 3px';
    detail.textContent = summary;
    const body = document.createElement('div');
    const setOpen = (open: boolean): void => {
      sectionState[label] = open;
      body.hidden = !open;
      detail.hidden = open;
      marker.textContent = open ? '−' : '+';
      toggle.setAttribute('aria-expanded', String(open));
    };
    setOpen(initiallyOpen);
    toggle.addEventListener('click', () => setOpen(!sectionState[label]));
    wrap.append(toggle, detail, body);
    panel.appendChild(wrap);
    return body;
  };

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:4px;margin:4px 0 2px';
  panel.appendChild(actions);
  /**
   * ⚑ S85 — `📷 shot` IS DESKTOP-ONLY NOW, and it is omitted rather than
   * disabled (the fullscreen row's precedent: capability-gated, absent when
   * useless — a greyed button only invites the press).
   *
   * On Sérgio's iPad this button ENDED THE RUN. `a.download` is not implemented
   * in iOS Safari: it is ignored and the blob URL is NAVIGATED to instead, so
   * the page is replaced, the piece stops, and the in-memory ledger — the only
   * store there is, by law — goes with it. There is nothing here worth
   * repairing for a tablet: this is a review affordance, and `tools/shots.mjs`
   * is the real capture path. `(pointer: fine)` is the honest question — not
   * "is this iOS", but "is there a mouse", which is also what makes a
   * download-and-inspect workflow mean anything.
   */
  const canDownload = window.matchMedia?.('(pointer: fine)').matches ?? true;
  if (canDownload) {
    const shotBtn = mkBtn(actions, '📷 shot', () => {
      const app = opts.app;
      if (!app) return;
      // WebGL clears its back buffer after presentation. Render and read the
      // PlayCanvas canvas in this same synchronous click path; preserveDrawingBuffer
      // would retain it at a performance cost on every 72 Hz frame.
      app.render();
      const cv = app.graphicsDevice.canvas;
      if (!cv) return;
      cv.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uhf_reinterp_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
        a.click();
        // ⚑ S85: NOT synchronous. The old revoke fired the instant `click()`
        // returned, which can kill the blob before the browser has read it —
        // a race on every platform, not just the one that broke.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      });
    });
    shotBtn.style.cssText += ';color:#8fffc0;flex:1';
  }

  const isFlat = new URLSearchParams(window.location.search).get('flat') === '1';
  const modeBtn = mkBtn(actions, isFlat ? '🖥 3D' : '▭ flat', () => {
    const p = new URLSearchParams(window.location.search);
    if (isFlat) p.delete('flat'); else p.set('flat', '1');
    p.set('debug', '1');
    window.location.search = p.toString();
  });
  modeBtn.style.cssText += ';color:#ffd48f;flex:1';

  // ── NAVIGATE: time, room and witness — the spatial spine, close at hand. ──
  const navigate = section('NAVIGATE', 'time · room · witness', true);
  if (opts.onEra || opts.onReveal || opts.onClose) {
    heading(navigate, 'TIME — the rooms age');
    if (opts.onReveal) mkBtn(navigate, 'O7 · first-filing reveal', opts.onReveal, 'JUMP');
    if (opts.onEra) for (const [era, label] of ERAS) mkBtn(navigate, label, () => opts.onEra?.(era), 'JUMP');
    if (opts.onClose) mkBtn(navigate, 'Close · point cloud', opts.onClose, 'JUMP');
  }
  if (opts.onCamProbe) {
    heading(navigate, 'PLACE — desk seats');
    for (const [label, yaw] of ROOMS) mkBtn(navigate, label, () => opts.onCamProbe?.(yaw, 0), 'JUMP');
    // ⚑ Session 66 — the two DEVICE seats. They are real marker moves, not
    // camera probes, because the whole point of them now is the side effect:
    // taking one lifts that screen off the furniture into the hand (THE HELD
    // READ, era3Devices.ts). A camProbe would put the camera in the right
    // place with the device still lying on the bed, which is precisely the
    // state this session existed to remove.
    heading(navigate, 'PLACE — Room 2 device seats (held read)');
    for (const [label, node] of [
      ['→ the phone · comes to hand', 'r2-phone'],
      ['→ back to the workstation', 'r2-desk']
    ] as const) {
      mkBtn(navigate, label, () => {
        (window as { __requestMove?: (id: string) => void }).__requestMove?.(node);
      }, 'JUMP');
    }
  }
  // ⚑ THE BUILDING (S67) — the four beats of the relocation grammar, each
  // reachable without playing the update ritual that fires it. The fourth is
  // the Close, which does not come back down; it is out of this session's
  // scope and its button is the existing 'Close · point cloud' above.
  if (opts.onRelocate) {
    const building = section('THE BUILDING', 'the rise at every era change');
    const bnote = document.createElement('div');
    bnote.style.cssText = 'color:#7f8aa3;font-size:9px;line-height:1.4;margin:0 0 3px';
    // ⚑ S85: "any click lands you" stopped being true this session — the press
    // now has to STAY to land it, because a press that travels is a look and
    // the whole point of these 21–42 s moves is that you can look while they fly.
    bnote.textContent = 'each seats you in the FROM era first, then flies it. Drag to look; a still press or a key lands you.';
    building.appendChild(bnote);
    if (opts.onRelocate) {
      for (const [label, from, to] of [
        ['1 · E1→E2 — walls ON (21s)', 'e1', 'e2'],
        ['2 · E2→E3 — the walls come off (29.5s)', 'e2', 'e3'],
        ['3 · E3→E4 — routine now (42.5s)', 'e3', 'e4']
      ] as const) {
        mkBtn(building, label, () => opts.onRelocate?.(from, to), '⏵ ENTRY');
      }
    }
  }

  if (opts.onFacet) {
    heading(navigate, 'ROOM 3 — facet');
    mkBtn(navigate, 'Facet — trans-fem', () => opts.onFacet?.('transfem'));
    mkBtn(navigate, 'Facet — trans-masc', () => opts.onFacet?.('transmasc'));
    mkBtn(navigate, 'Facet — non-binary', () => opts.onFacet?.('nonbinary'));
    mkBtn(navigate, 'Facet — all (E3)', () => opts.onFacet?.('all'));
    mkBtn(navigate, 'Facet — none (E1)', () => opts.onFacet?.('none'));
  }
  if (opts.onFlip) {
    heading(navigate, 'WITNESS');
    mkBtn(navigate, 'Flip ⟲ (turn to record)', opts.onFlip);
  }

  // ── ⚑ S80 · LOOK — the three look-modes' shared controls, and the only way
  // to exercise mode 3 without a phone in your hand. ──
  if (opts.onMotionSim || opts.onRecentre || opts.onFov) {
    const look = section('LOOK (mode 3 · gyro)', 'device turn · recentre · zoom');
    const lnote = document.createElement('div');
    lnote.style.cssText = 'color:#7f8aa3;font-size:9px;line-height:1.4;margin:0 0 3px';
    lnote.textContent = 'the simulation drives the REAL listener with fake angles. It cannot tell you how the turn feels — only a device can.';
    look.appendChild(lnote);
    if (opts.onMotionSim) {
      let simOn = false;
      const b = mkBtn(look, '▶ simulate a device turn', () => {
        simOn = opts.onMotionSim?.(!simOn) ?? false;
        b.dataset.baseLabel = simOn ? '■ stop the device turn' : '▶ simulate a device turn';
        b.textContent = `${b.dataset.mark} · ${b.dataset.baseLabel}`;
      });
    }
    if (opts.onRecentre) mkBtn(look, 'recentre the view (menu row)', opts.onRecentre);
    if (opts.onFov) {
      for (const deg of [30, 42, 80]) {
        mkBtn(look, `zoom · FOV ${deg}°${deg === 42 ? ' (authored)' : deg === 30 ? ' (pinched all the way in)' : ' (all the way out)'}`,
          () => opts.onFov?.(deg));
      }
    }
  }

  // ── SENDS (master script §4) — fire the seam the beats will call; every
  // outcome files to the record (flip to see the cross-reference lines) ──
  if (opts.onSend && opts.sends?.length) {
    const sends = section('SENDS', 'summons seam · offer / visit / decline');
    for (const { id, label } of opts.sends) {
      const row = document.createElement('div');
      row.style.cssText = 'margin:2px 0';
      const lab = document.createElement('div');
      lab.textContent = label;
      lab.style.cssText = 'color:#9aa3b8;font-size:9px;margin-bottom:1px';
      row.appendChild(lab);
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:2px';
      const short = { offered: 'offer', visited: 'visit', declined: 'decline' } as const;
      for (const outcome of ['offered', 'visited', 'declined'] as const) {
        const b = document.createElement('button');
        b.textContent = `ACTION · ${short[outcome]}`;
        Object.assign(b.style, {
          flex: '1', background: '#222838', color: '#cdd3df',
          border: '1px solid #39405270', font: '9px monospace',
          padding: '2px 0', cursor: 'pointer', borderRadius: '3px'
        } as CSSStyleDeclaration);
        b.addEventListener('click', () => opts.onSend?.(id, outcome));
        btns.appendChild(b);
      }
      row.appendChild(btns);
      sends.appendChild(row);
    }
  }

  // ── OS beats (the 2D desktop states) ── grouped/ordered as the piece's spine;
  // see the comment above OS_BEATS for how this stays complete (C6).
  const excluded = new Set(OS_BEAT_EXCLUSIONS);
  let beats: HTMLElement | null = null;
  for (const row of OS_BEATS) {
    if ('heading' in row) {
      beats = section(`DESKTOP · ${row.heading}`, 'monitor state jumps');
      continue;
    }
    if (excluded.has(row.id)) continue; // documented exclusion wins if ever double-listed
    if (beats) mkBtn(beats, row.label, () => os.debugJump(row.id),
      OS_ENTRY_IDS.has(row.id) ? '⏵ ENTRY' : 'JUMP');
  }

  // ── E3 DEVICE BEATS: Room 2's own screens (see E3_DEVICE_BEATS above) ──
  const devices = section('E3 · THE CORRECTION LIST', 'workstation · phone · the light');
  const dnote = document.createElement('div');
  dnote.style.cssText = 'color:#7f8aa3;font-size:9px;line-height:1.4;margin:0 0 3px';
  dnote.textContent = 'needs E3 + Room 2 (era button above, then the workstation/phone seats).';
  devices.appendChild(dnote);
  const deviceArmed = (): boolean => {
    const here = (window as { __reinterpNow?: string }).__reinterpNow;
    return here?.startsWith('E3') === true &&
      !!(window as { __graceQueue?: () => unknown }).__graceQueue?.();
  };
  for (const [label, beat] of E3_DEVICE_BEATS) {
    mkBtn(devices, label, () => {
      const probe = (window as { __graceQueue?: () => { debugBeat(b: string): void } | null }).__graceQueue;
      probe?.()?.debugBeat(beat);
    }, beat === 'apply' || beat === 'skip' || beat === 'light' || beat === 'lightOff'
      ? 'ACTION' : 'JUMP', deviceArmed);
  }
  window.setInterval(() => availabilityPainters.forEach(paint => paint()), 250);

  // ── LINKS: every review URL as a clickable link (Sérgio's ask) ──
  const links = section('REVIEW LINKS', 'open a known state in a fresh URL');
  for (const [label, href] of LINKS) {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    Object.assign(a.style, {
      display: 'block', margin: '2px 0', color: '#8fb6ff', textDecoration: 'none',
      font: '10px monospace', padding: '1px 2px'
    } as CSSStyleDeclaration);
    a.addEventListener('mouseenter', () => { a.style.textDecoration = 'underline'; });
    a.addEventListener('mouseleave', () => { a.style.textDecoration = 'none'; });
    links.appendChild(a);
  }

  // ── CONTROLS reference ──
  const controls = section('CONTROLS', 'look · turn · movement · map');
  const ctrls = document.createElement('div');
  ctrls.style.cssText = 'color:#9aa3b8;font-size:10px;line-height:1.5';
  ctrls.innerHTML =
    'drag / ← → = look around (never moves rooms)<br>R = home room · F = flip to record<br>' +
    'click a floor marker = blink-jump there (R28-1, markers E3+)<br>' +
    // ⚑ S80: a press only acts if it neither travelled (>10 px) nor lingered
    // (>1.2 s) — a press that travels is a look. And the two-finger pinch is
    // the camera's FOV, 30°–80°: the room never leaves the frame.
    'a press that DRAGS is a look, not a click · pinch = zoom (FOV 30–80°)<br>' +
    'phone/tablet: turn the device to look (button at the bottom)<br>` = show/hide this panel';
  controls.appendChild(ctrls);

  document.body.appendChild(panel);
  document.body.appendChild(pill);
  document.body.appendChild(motionReadout);
  // Keep review captures clear until the reviewer deliberately opens the map.
  show(false);

  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      show(panel.style.display === 'none');
      e.preventDefault();
    }
  });
}
