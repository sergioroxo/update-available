/**
 * lamby_rig.exe — THE ERA-1 EASTER EGG (Session 55,
 * docs/REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md Part 2, adopted as the
 * "E1 precursor" placement). Per the R28 amendment, Lamby the CHARACTER does
 * not exist in Era 1 — E1 has only impersonal system side-messages. This is
 * the apparatus's own puppet-rigging tool, found as a file nobody meant the
 * player to open: mood/action sliders over the same puppet who debuts,
 * charming, at the start of E2. Meeting the rig before the mascot is the
 * whole point (docs cite it twice: the E2 debut recognition, and S2R.3C's
 * shame-hold, which the player will have already produced themselves here,
 * an era earlier, out of curiosity).
 *
 * NOT CHARMING YET (binding tone requirement, not a style note): E1's
 * register is grave, and Lamby has no charm to spend yet — this reads as an
 * unfinished dev artifact someone left on the disk, not a toy. That reading
 * comes ENTIRELY from context (an unlabeled file, the lab's own placeholder/
 * test-surface copy in data/strings/lamby_rig.json, a window that closes with
 * no comment) — never from a different puppet. `LambyRigPanel` (imported from
 * `../../lambyrig/lambyRig`) is drawn EXACTLY as `?lambyrig=1` draws it: the
 * shared definition, reused, not forked, per the brief.
 *
 * RULES THIS FILE ENFORCES, NOT JUST DOCUMENTS:
 *   - Never rewarded: no achievement, no toast, no assistant remark, no
 *     score. Opening it changes nothing else about the desktop.
 *   - Filed, never spoken: opening it pushes one plain tag into
 *     `ledger.records` (the same generic bag `kit-inserted`/`went-online`/
 *     `diary-glitch` already live in) — `src/witness/intake.ts` has no
 *     branch for this tag (out of this session's file fence, left untouched
 *     on purpose), so it sits in the cold record and is never surfaced in
 *     any on-screen witness text. Filed like any other act; remarked on by
 *     nothing.
 *   - Register `operable` (a system surface — it may glitter within E1's
 *     limits) — see CLAUDE.md. It carries no register tag of its own beyond
 *     that because there is only one instance of it, always in E1.
 *   - Reachability: `src/desktop/os.ts` only draws and hit-tests this file's
 *     desktop icon while the E1 desktop is otherwise idle (no kit/irc/
 *     packet/diary/provotype window open) — so it can never be seen or
 *     clicked while a `felt` scene (the IRC channel, the placement packet)
 *     is on screen. See os.ts's `e1DesktopIdle()` and the session log.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { LambyRigPanel, RIG_WINDOW_W, RIG_WINDOW_H } from '../../lambyrig/lambyRig';
import copy from '../../../data/strings/lamby_rig.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }

const RIG_X = 24;
const RIG_Y = 10;

export class LambyRigFileApp {
  open = true;
  private readonly panel = new LambyRigPanel();
  private hits: Hit[] = [];
  private hover = '';
  private t = 0;
  /** engine/OS listens: the player closed the window */
  onClose?: () => void;

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, RIG_X, RIG_Y, RIG_WINDOW_W, RIG_WINDOW_H, copy.title, true, 'lambyrig');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.tealDark);
    for (const h of this.panel.draw(ctx, c, this.t, this.hover)) this.hits.push(h);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'lambyrig-close' });
  }

  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) this.hover = id;
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.id === 'lambyrig-close') {
      this.open = false;
      this.onClose?.();
      return;
    }
    this.panel.handleClick(hit.id, this.t);
  }
}
