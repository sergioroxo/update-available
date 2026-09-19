/**
 * The provotype runtime (reinterpretation build · Session R1) — the one
 * reusable grammar every provotype uses: a diegetic assistant INVITATION -> a
 * two-sentence FRAME -> an interactive VIGNETTE (click states) -> a
 * dossier-grade DEBRIEF (provenance, status + player-visible confidence). All
 * content is data-driven (`data/provotypes/*.json`); this file is only the
 * shell. Rendered on the era desktop canvas with that era's theme tokens.
 *
 * Laws honored here (CLAUDE.md · master plan R1):
 *   - Leave and Pause are live from frame one, at a FIXED position, every phase.
 *   - Click/tap only. No score, streak, timer, progress counter, or win/lose —
 *     repetition is allowed but never juiced.
 *   - `felt` lines render bare (the person's side), never joked at.
 *   - Both completion and abandonment are filed to the ledger (abandonment is
 *     not invisible); the witness line comes from data, not from here.
 *
 * NOTE: only the Era-1 theme exists in code today, so every era renders with
 * ERA1 tokens for now. When later era themes land, select tokens by `data.era`.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import chrome from '../../../data/strings/reinterp.json';

export interface ProvotypeSource {
  status: 'documentary' | 'contested' | 'speculative';
  confidence: string;
  text: string;
}
/**
 * A tagged, registering option (R2/§R8-5 framework addition). Choices REGISTER
 * to the ledger — they never branch the content. `goto`, when present, is a
 * navigation instruction (a state index, or `"debrief"`) taken immediately on
 * click instead of the default show-response-then-advance flow; this is how
 * the pillow's Repeat/Finish gate works without introducing narrative forks.
 */
export interface ProvotypeChoice {
  label: string;
  ledgerTag?: string;
  response?: string;
  goto?: number | 'debrief' | 'close';
}
export interface ProvotypeState {
  prompt: string;
  /** legacy simple confirm buttons (R1 dummy) — no tagging, no goto */
  buttons?: string[];
  /** R2 addition: tagged/registering options, optionally overriding the response or navigating directly */
  choices?: ProvotypeChoice[];
  response: string;
  felt?: string;
  /** restrained low-poly pose shown alongside the response — see drawFigure. Never juiced. */
  animPose?: 'lift' | 'exhale' | 'strike';
}
export interface Provotype {
  id: string;
  era: string;
  register: string;
  failure: 'silence' | 'glitch';
  cuts: string[];
  invitation: { from?: string; lines: string[]; accept: string };
  frame: { text: string; continue: string };
  states: ProvotypeState[];
  /**
   * Embodiment revision (§4, REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS_2026-07-03):
   * a short, near-wordless narrative beat between the vignette's end and the
   * sourced debrief — the felt/emotional landing, kept separate from the
   * debrief's documentary function. Optional so R1-era data (the dummy) still
   * works unchanged; when absent, the runtime falls straight to debrief.
   */
  close?: { lines: string[]; continue?: string };
  debrief: { body: string[]; close?: string; sources: ProvotypeSource[] };
  ledgerTags: string[];
  witness?: { completed?: string; abandoned?: string };
}

type Phase = 'invitation' | 'frame' | 'vignette' | 'close' | 'debrief';
interface Hit { x: number; y: number; w: number; h: number; id: string }
/** S86: one laid-out row of the debrief, so the body can be cut into pages
 *  that fit the frame instead of running off the bottom of it. `h` is the
 *  vertical advance this row costs, which is the only thing paging needs. */
type DebriefLine =
  | { kind: 'gap'; h: number }
  | { kind: 'rule'; h: number }
  | { kind: 'text'; h: number; text: string; size: number; color: string; dx: number }
  /** 'status' carries `tail` — the "· high confidence" run after the status word */
  | { kind: 'status'; h: number; text: string; size: number; color: string; dx: number; tail: string };

// window geometry — one modal on the era desktop; constant so the fixed
// Leave/Pause row never moves between phases.
// h=336 (was 300) — the pillow's 4-source debrief needs the room; no scroll
// input exists (click/tap only), so the fixed window must simply be tall
// enough for the longest debrief instead. Capped below the era desktop's
// taskbar (H=384, taskbar from H-22) so the window never overlaps it.
const WIN = { x: 36, y: 24, w: 440, h: 336 } as const;
const ROW_Y = WIN.y + WIN.h - 28; // the fixed button row
const STATUS_COLOR: Record<ProvotypeSource['status'], string> = {
  documentary: ERA1.ok,
  contested: ERA1.olive,
  speculative: ERA1.grey
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export class ProvotypeApp {
  open = true;
  dirty = true;
  /** the OS listens: the app has closed (Leave, or Close from the debrief) */
  onClose?: () => void;

  private phase: Phase = 'invitation';
  private stateIndex = 0;
  private showResponse = false;
  /** per-choice response override for the current state, if any (R2 addition) */
  private lastResponse?: string;
  /** §4: the felt line gets its own beat — true once the response screen has been advanced past once */
  private feltRevealed = false;
  private reachedDebrief = false;
  private filed = false;
  private paused = false;
  private hover = '';
  private hits: Hit[] = [];
  /** S86: which page of the debrief is showing, and how many there are */
  private debriefPage = 0;
  private debriefPageCount = 1;
  /** internal only — never rendered as a score (master plan §R2-2) */
  private reps = 0;
  private readonly hasAnim: boolean;

  constructor(private readonly data: Provotype) {
    this.hasAnim = data.states.some(s => !!s.animPose);
  }

  /** does this state have any pre-response tap/choice at all? */
  private hasOptions(state: ProvotypeState): boolean {
    return (!!state.choices && state.choices.length > 0) || (!!state.buttons && state.buttons.length > 0);
  }

  /** move to a state by index; states with no options reveal their response immediately */
  private enterState(idx: number): void {
    this.stateIndex = idx;
    this.lastResponse = undefined;
    this.feltRevealed = false;
    this.showResponse = !this.hasOptions(this.data.states[idx]);
    this.dirty = true;
  }

  update(_dt: number): void {
    // no timers, no animation loop in R1 — the framework is click-driven.
    // (The pillow's restrained low-poly animation arrives with R2.)
  }

  // ── draw ────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const title = chrome.windowTitle[this.phase];
    // §4: the vignette (and its narrative close) render IN THE ROOM — an
    // environment behind/around the interaction, with the UI as an overlay —
    // instead of ordinary Win95 app-window chrome. Invitation/frame/debrief
    // (the system's own surfaces, and the sourced dossier) keep the chrome.
    const isRoomPhase = this.phase === 'vignette' || this.phase === 'close';
    let c: ui.ContentRect;
    if (isRoomPhase) {
      this.drawRoomBackdrop(ctx, WIN.x, WIN.y, WIN.w, WIN.h);
      c = this.drawOverlayPanel(ctx, WIN.x, WIN.y, WIN.w, WIN.h);
    } else {
      c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, title, true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
      // S149 — the frame's X is drawn and was never a control (Sérgio, 09-17 R3-11:
      //   "the X button doesn't work"); it does what Leave does
      if (c.closeBox.w > 0) this.hits.push({ ...c.closeBox, id: 'leave' });
    }

    const bodyTop = c.y + 8;
    const bodyMaxW = c.w - 24;
    const bodyX = c.x + 12;
    // reserve a quiet panel on the right for the restrained pose (pillow only)
    const FIGURE_W = 78;
    const vignetteMaxW = this.hasAnim ? bodyMaxW - FIGURE_W : bodyMaxW;

    switch (this.phase) {
      case 'invitation': this.drawInvitation(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'frame': this.drawFrame(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'vignette':
        this.drawVignette(ctx, bodyX, bodyTop, vignetteMaxW);
        if (this.hasAnim) this.drawFigure(ctx, c.x + c.w - FIGURE_W - 4, bodyTop);
        break;
      case 'close': this.drawClose(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'debrief': this.drawDebrief(ctx, bodyX, bodyTop, bodyMaxW); break;
    }

    this.drawFixedRow(ctx);
    if (this.paused) this.drawPaused(ctx, c);
  }

  /**
   * §4: a quiet, low-poly corner of Daniel's room — flat blocks only, ERA1
   * tokens only (Soft Lo-Fi: cozy, underdefined edges, never horror-dark).
   * Deliberately abstracted, not a reconstruction of any reference photograph
   * (G9 — the Brothers Road image is never traced). This is what "the vignette
   * is happening somewhere" looks like without a new asset pipeline.
   */
  private drawRoomBackdrop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.px(ctx, x, y, w, h, ERA1.paper); // the wall
    const floorH = Math.round(h * 0.22);
    ui.px(ctx, x, y + h - floorH, w, floorH, ERA1.silver); // the floor

    // a window, upper-left — the night outside, unremarked
    const winX = x + 24, winY = y + 20, winW = 84, winH = 64;
    ui.px(ctx, winX, winY, winW, winH, ERA1.tealDark);
    ui.px(ctx, winX + winW / 2 - 1, winY, 2, winH, ERA1.silver);
    ui.px(ctx, winX, winY + winH / 2 - 1, winW, 2, ERA1.silver);

    // the bed corner, lower-left — where this is happening
    const bedY = y + h - floorH - 34;
    ui.px(ctx, x + 12, bedY, 96, 34, ERA1.beige);
    ui.px(ctx, x + 12, bedY, 96, 6, ERA1.white); // the pillow, at the head

    // the lamp, lower-right — the one warm constant (era-spanning motif)
    const lampX = x + w - 54, lampY = y + h - floorH - 30;
    ui.px(ctx, lampX, lampY, 6, 28, ERA1.greyDark);
    ui.px(ctx, lampX - 10, lampY - 4, 26, 10, ERA1.tooltip);

    // a thin outline — a bounded surface, never Win95 chrome
    ui.px(ctx, x, y, w, 1, ERA1.silver);
    ui.px(ctx, x, y, 1, h, ERA1.silver);
    ui.px(ctx, x, y + h - 1, w, 1, ERA1.silver);
    ui.px(ctx, x + w - 1, y, 1, h, ERA1.silver);
  }

  /**
   * §4: the interaction floats as a translucent card over the room rather
   * than filling it — margins stay visible so the environment reads as
   * present, not replaced. Returns a ContentRect so the existing body-layout
   * math (bodyTop/bodyMaxW/bodyX) needs no further change.
   */
  private drawOverlayPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): ui.ContentRect {
    const pad = 14;
    const topGap = 30; // the wall + window stay visible above the card
    const px_ = x + pad;
    const py_ = y + topGap;
    const pw = w - pad * 2;
    const ph = (y + h - 28) - py_ - 6; // stop above the fixed Leave/Pause row
    ctx.fillStyle = 'rgba(245,244,237,0.92)';
    ctx.fillRect(px_, py_, pw, ph);
    ui.px(ctx, px_, py_, pw, 1, ERA1.silver);
    ui.px(ctx, px_, py_, 1, ph, ERA1.silver);
    ui.px(ctx, px_, py_ + ph - 1, pw, 1, ERA1.silver);
    ui.px(ctx, px_ + pw - 1, py_, 1, ph, ERA1.silver);
    return { x: px_ + 10, y: py_ + 8, w: pw - 20, h: ph - 16, closeBox: { x: 0, y: 0, w: 0, h: 0 } };
  }

  private drawInvitation(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const inv = this.data.invitation;
    let y = top;
    if (inv.from) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(inv.from, x, y);
      y += 16;
    }
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    for (const line of inv.lines) {
      for (const w of wrap(ctx, line, maxW)) { ctx.fillText(w, x, y); y += 15; }
      y += 4;
    }
    this.primary(ctx, inv.accept);
  }

  private drawFrame(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    let y = top;
    for (const w of wrap(ctx, this.data.frame.text, maxW)) { ctx.fillText(w, x, y); y += 15; }
    this.primary(ctx, this.data.frame.continue);
  }

  private drawVignette(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const st = this.data.states[this.stateIndex];

    // §4: Daniel's felt line gets its own beat — the system's paragraph is
    // gone from the screen entirely for this one breath, not just visually
    // de-emphasized underneath it.
    if (this.showResponse && this.feltRevealed && st.felt) {
      ui.setFont(ctx, 11); // bare, unstyled — but no longer the smallest text on screen
      ctx.fillStyle = ERA1.grey;
      let fy = top + 34;
      for (const w of wrap(ctx, st.felt, maxW)) { ctx.fillText(w, x, fy); fy += 15; }
      this.primary(ctx, chrome.next);
      return;
    }

    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    let y = top;
    for (const w of wrap(ctx, st.prompt, maxW)) { ctx.fillText(w, x, y); y += 15; }
    y += 8;

    if (!this.showResponse) {
      // the options — each click-confirm registers; no choice is "right"
      const labels = st.choices ? st.choices.map(c => c.label) : (st.buttons ?? []);
      labels.forEach((label, i) => {
        const bw = Math.min(220, Math.max(120, ctx.measureText(label).width + 28));
        const by = y + i * 28;
        ui.button(ctx, x, by, bw, 22, label, { hover: this.hover === `choice:${i}` });
        this.hits.push({ x, y: by, w: bw, h: 22, id: `choice:${i}` });
      });
      return;
    }

    // the system's reply — flat, unrewarding by design. (felt now lives in
    // its own beat above, once the player advances past this screen.)
    const response = this.lastResponse ?? st.response;
    ctx.fillStyle = ERA1.greyDark;
    for (const w of wrap(ctx, response, maxW)) { ctx.fillText(w, x, y); y += 15; }
    this.primary(ctx, chrome.next);
  }

  /**
   * §4: the narrative close — a short, near-wordless beat between the
   * vignette's end and the sourced debrief. Still in the room (register:
   * felt — no system voice, no charm, no mechanics); the debrief afterward
   * is where the documentary/dossier function lives, separately.
   */
  private drawClose(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const cl = this.data.close;
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.grey;
    let y = top + 30;
    for (const line of cl?.lines ?? []) {
      for (const w of wrap(ctx, line, maxW)) { ctx.fillText(w, x, y); y += 15; }
      y += 4;
    }
    this.primary(ctx, cl?.continue ?? chrome.next);
  }

  /**
   * The restrained low-poly pose (master plan §R2-2 design law): a few
   * blocky positions, no rhythm, no impact lines, no screen shake. It must
   * NOT feel like a satisfying swing — administrative, not kinaesthetic.
   */
  /**
   * ⚑ THE POSE THE DIAGRAM IS HOLDING, for the ROOM to mirror.
   *
   * Sérgio, 2026-08-21: *"when we have the moment of the racket, it should move
   * in front of us like a visualizer, as if exemplifying IRL… as if it was a
   * tutorial in the screen but also in the space."* The screen half of that
   * already existed — drawFigure has drawn lift/exhale/strike since the beat was
   * built. What was missing is the object: the real racket lies on the Room-1
   * floor and does nothing while a diagram of it performs on the monitor.
   *
   * ⚑ The room mirror obeys drawFigure's own law, which is the important part:
   * "a few blocky positions, no rhythm, no impact lines… administrative, not
   * kinaesthetic. It must NOT feel like a satisfying swing." A racket that
   * swung well would make the practice feel good, and the practice is the
   * subject. It moves the way an instruction manual moves.
   */
  get roomPose(): 'lift' | 'exhale' | 'strike' | null {
    if (!this.hasAnim) return null;
    const st = this.data.states[this.stateIndex];
    return (this.showResponse ? st.animPose : undefined) ?? null;
  }

  private drawFigure(ctx: CanvasRenderingContext2D, x: number, top: number): void {
    const st = this.data.states[this.stateIndex];
    const pose = this.showResponse ? st.animPose : undefined;
    const w = 74, h = 92;
    ui.px(ctx, x, top, w, h, ERA1.paper);
    ui.px(ctx, x, top, w, 1, ERA1.silver);
    ui.px(ctx, x, top, 1, h, ERA1.silver);
    ui.px(ctx, x, top + h - 1, w, 1, ERA1.silver);
    ui.px(ctx, x + w - 1, top, 1, h, ERA1.silver);

    const headX = x + 30, headY = top + 18;
    const torsoX = x + 28, torsoY = top + 30, torsoW = 14, torsoH = 24;
    ui.px(ctx, headX, headY, 10, 10, ERA1.greyDark);
    ui.px(ctx, torsoX, torsoY, torsoW, torsoH, ERA1.greyDark);

    // the pillow — a soft low block, never struck with force lines
    const pillowX = x + 16, pillowY = top + 62;
    const pillowH = pose === 'strike' ? 9 : 11; // the barest give, not an impact
    ui.px(ctx, pillowX, pillowY, 26, pillowH, ERA1.beige);

    // the arm — three still positions, no interpolation, no bounce
    switch (pose) {
      case 'lift':
        ui.px(ctx, x + 44, top + 22, 4, 16, ERA1.greyDark);
        ui.px(ctx, x + 46, top + 20, 12, 3, ERA1.grey); // the racket, raised
        break;
      case 'exhale':
        ui.px(ctx, x + 44, top + 34, 4, 14, ERA1.greyDark);
        break;
      case 'strike':
        ui.px(ctx, x + 40, top + 46, 4, 16, ERA1.greyDark);
        ui.px(ctx, x + 38, top + 58, 12, 3, ERA1.grey); // the racket, at rest on the pillow
        break;
      default:
        ui.px(ctx, x + 44, top + 34, 4, 14, ERA1.greyDark); // idle
    }
  }

  /**
   * ⚑⚑ S86 — THE DOSSIER USED TO OVERFLOW ITS OWN WINDOW, AND THAT IS WORSE
   * THAN UGLY.
   *
   * Sérgio, on an iPad: *"what is this mess of text on the Family form??"* —
   * the body ran past the frame and underneath the Leave / Pause / Return row.
   * This method simply accumulated `y` through every source's wrapped text with
   * no clamp and no scroll, while `drawFixedRow()` painted the buttons at a
   * fixed `ROW_Y` on top of whatever had got there. `WIN.h` was sized (336, up
   * from 300) *for the pillow's four-source debrief* — its own comment says so
   * — and `origin_intake_e1.json` carries four sources of 300–380 characters,
   * which wrap far past the ~271 px of content height. Two real citations lived
   * under the buttons: the Flentje/Heck/Cochran entry and the APA / UK MoU one.
   *
   * ⚑ THE DOSSIER IS THE PIECE'S EVIDENCE SURFACE. It is where
   * `documentary | contested | speculative`, the confidence ratings and the
   * `[VERIFY SOURCE]` marks live — the thing that makes this research rather
   * than assertion. Citations spilling over their own buttons read as
   * unmaintained, which is exactly the impression the piece cannot afford.
   *
   * The fix is PAGING, not a scrollbar: this build is click/tap only by law
   * (R28 amendment 3 — no wheel, no drag-scroll), and the EULA has already
   * taught the player this exact idiom (Read on → the live button on the last
   * page). The body is laid out once as a flat run of drawable lines, cut into
   * pages that fit the real content box, and the care row is untouched and
   * always reachable. A window sized to one card's content was the bug; the
   * body being unbounded was the cause.
   */
  private debriefLines(ctx: CanvasRenderingContext2D, maxW: number): DebriefLine[] {
    const out: DebriefLine[] = [];
    ui.setFont(ctx, 10);
    for (const line of this.data.debrief.body) {
      for (const w of wrap(ctx, line, maxW)) {
        out.push({ kind: 'text', text: w, size: 10, color: ERA1.black, dx: 0, h: 12 });
      }
      out.push({ kind: 'gap', h: 2 });
    }
    out.push({ kind: 'gap', h: 2 });
    out.push({ kind: 'rule', h: 7 });
    out.push({ kind: 'text', text: chrome.debriefHeading, size: 8, color: ERA1.greyDark, dx: 0, h: 12 });
    for (const src of this.data.debrief.sources) {
      out.push({
        kind: 'status', text: src.status, size: 8, color: STATUS_COLOR[src.status], dx: 0, h: 10,
        tail: `· ${src.confidence} confidence`
      });
      ui.setFont(ctx, 8);
      for (const w of wrap(ctx, src.text, maxW - 8)) {
        out.push({ kind: 'text', text: w, size: 8, color: ERA1.black, dx: 8, h: 10 });
      }
      out.push({ kind: 'gap', h: 2 });
    }
    return out;
  }

  /**
   * Cut the run into pages that fit `availH`; never returns fewer than one.
   *
   * ⚑ A CITATION IS NOT ALLOWED TO BE SPLIT FROM ITS STATUS. Naive paging put
   * "documentary · high confidence" at the foot of one page and the sentence it
   * qualifies at the head of the next, which is a worse failure than the
   * overflow it replaced — the status enum IS the claim's warrant, and orphaned
   * from its text it reads as decoration. So a break that would land inside a
   * source rewinds to that source's own first line, whenever the source fits on
   * a page by itself. One longer than a whole page still splits: better a split
   * long entry than an unreachable one.
   */
  private debriefPages(lines: DebriefLine[], availH: number): number[][] {
    const pages: number[][] = [];
    let cur: number[] = [];
    let h = 0;
    /** height of the source block that starts at `s`, up to the next status */
    const blockHeight = (s: number): number => {
      let t = 0;
      for (let j = s; j < lines.length; j++) {
        if (j > s && lines[j].kind === 'status') break;
        t += lines[j].h;
      }
      return t;
    };
    for (let i = 0; i < lines.length; i++) {
      const lh = lines[i].h;
      if (h + lh > availH && cur.length) {
        // rewind to the start of the source we are in the middle of, if it can
        // live on a page of its own
        let back = -1;
        for (let k = cur.length - 1; k >= 0; k--) {
          if (lines[cur[k]].kind === 'status') { back = k; break; }
        }
        if (back > 0 && blockHeight(cur[back]) <= availH) {
          i = cur[back] - 1;          // re-emit the block on the next page
          cur = cur.slice(0, back);
        }
        pages.push(cur);
        cur = [];
        h = 0;
        continue;
      }
      // a gap that lands at the top of a page is dead space — drop it
      if (!cur.length && lines[i].kind === 'gap') continue;
      cur.push(i);
      h += lh;
    }
    if (cur.length) pages.push(cur);
    return pages.length ? pages : [[]];
  }

  private drawDebrief(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const lines = this.debriefLines(ctx, maxW);
    const availH = ROW_Y - 8 - top;
    const pages = this.debriefPages(lines, availH);
    this.debriefPageCount = pages.length;
    if (this.debriefPage >= pages.length) this.debriefPage = pages.length - 1;
    let y = top;
    for (const i of pages[this.debriefPage]) {
      const l = lines[i];
      if (l.kind === 'rule') {
        ui.px(ctx, x, y, maxW, 1, ERA1.silver);
      } else if (l.kind === 'text' || l.kind === 'status') {
        ui.setFont(ctx, l.size);
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, x + l.dx, y);
        if (l.kind === 'status') {
          const sw = ctx.measureText(l.text).width;
          ctx.fillStyle = ERA1.greyDark;
          ctx.fillText(l.tail, x + l.dx + sw + 6, y);
        }
      }
      y += l.h;
    }
    // the page indicator sits in the row's own empty middle — between Pause and
    // the forward buttons — where it cannot land on a line of the dossier
    if (pages.length > 1) {
      ui.setFont(ctx, 8);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(
        chrome.pageOf.replace('{n}', String(this.debriefPage + 1)).replace('{total}', String(pages.length)),
        WIN.x + 166, ROW_Y + 13
      );
    }
    // exactly the EULA's grammar: Read on until the last page, then the card's
    // own close label. Back appears only once there is something to go back to.
    const last = this.debriefPage >= pages.length - 1;
    if (this.debriefPage > 0) this.secondary(ctx, chrome.backPage, 'backPage');
    this.primary(ctx, last ? (this.data.debrief.close ?? chrome.next) : chrome.readOn);
  }

  /** the fixed care row — Leave + Pause, present every phase, never moves */
  private drawFixedRow(ctx: CanvasRenderingContext2D): void {
    ui.button(ctx, WIN.x + 8, ROW_Y, 70, 20, chrome.leave, { hover: this.hover === 'leave' });
    this.hits.push({ x: WIN.x + 8, y: ROW_Y, w: 70, h: 20, id: 'leave' });
    const pauseLabel = this.paused ? chrome.resume : chrome.pause;
    ui.button(ctx, WIN.x + 86, ROW_Y, 70, 20, pauseLabel, { hover: this.hover === 'pause' });
    this.hits.push({ x: WIN.x + 86, y: ROW_Y, w: 70, h: 20, id: 'pause' });
  }

  /** the phase's forward button, bottom-right of the fixed row */
  private primary(ctx: CanvasRenderingContext2D, label: string): void {
    if (this.paused) return;
    const w = 110;
    const x = WIN.x + WIN.w - 8 - w;
    ui.button(ctx, x, ROW_Y, w, 20, label, { hover: this.hover === 'primary' });
    this.hits.push({ x, y: ROW_Y, w, h: 20, id: 'primary' });
  }

  /** S86: an optional second button, immediately left of `primary`, in the
   *  same pinned row. Used by the paged debrief for Back; the row's Leave and
   *  Pause are untouched and stay where they have always been. */
  private secondary(ctx: CanvasRenderingContext2D, label: string, id: string): void {
    if (this.paused) return;
    const w = 70;
    const x = WIN.x + WIN.w - 8 - 110 - 8 - w;
    ui.button(ctx, x, ROW_Y, w, 20, label, { hover: this.hover === id });
    this.hits.push({ x, y: ROW_Y, w, h: 20, id });
  }

  private drawPaused(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    ctx.fillStyle = 'rgba(212,208,200,0.82)'; // the era's chrome beige, veiled
    ctx.fillRect(c.x, c.y, c.w, c.h - 24);
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(chrome.paused, c.x + 12, c.y + 12);
  }

  // ── input ─────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    // while paused only the care row responds
    if (this.paused) {
      if (hit.id === 'leave') this.exit();
      else if (hit.id === 'pause') { this.paused = false; this.dirty = true; }
      return;
    }
    if (hit.id === 'leave') { this.exit(); return; }
    if (hit.id === 'pause') { this.paused = true; this.dirty = true; return; }
    if (hit.id === 'primary') { this.advance(); return; }
    if (hit.id === 'backPage') { // S86 — paging back through the dossier
      this.debriefPage = Math.max(0, this.debriefPage - 1);
      this.dirty = true;
      return;
    }
    if (hit.id.startsWith('choice:')) { this.choose(Number(hit.id.split(':')[1])); return; }
  }

  private choose(i: number): void {
    const st = this.data.states[this.stateIndex];
    const chosen = st.choices?.[i];
    if (chosen?.ledgerTag) this.registerTag(chosen.ledgerTag);
    if (chosen?.goto !== undefined) {
      // the meaningful choice (e.g. Repeat/Finish) — no choice is "correct";
      // this only decides how much longer the same content repeats.
      if (chosen.goto === 'debrief' || chosen.goto === 'close') {
        this.phase = chosen.goto;
        this.debriefPage = 0; // S86: a direct jump starts at page one too
        this.reachedDebrief = true; // finishing the vignette is "completed" whether or not the debrief is opened next
        this.dirty = true;
      } else {
        if (chosen.goto <= this.stateIndex) this.reps++; // internal only — never shown as a score
        this.enterState(chosen.goto);
      }
      return;
    }
    // no choice is scored or "correct" — the confirm only surfaces the reply
    this.lastResponse = chosen?.response;
    this.showResponse = true;
    this.dirty = true;
  }

  private registerTag(tag: string): void {
    if (!ledger.tags.includes(tag)) ledger.tags.push(tag);
  }

  private advance(): void {
    switch (this.phase) {
      case 'invitation': this.phase = 'frame'; break;
      case 'frame':
        this.phase = 'vignette';
        this.enterState(0);
        break;
      case 'vignette': {
        const st = this.data.states[this.stateIndex];
        // §4: the response screen and the felt screen are two separate taps —
        // the first advance past a response reveals felt; only the second
        // actually moves the vignette forward.
        if (this.showResponse && st.felt && !this.feltRevealed) {
          this.feltRevealed = true;
          break;
        }
        if (this.stateIndex < this.data.states.length - 1) {
          this.enterState(this.stateIndex + 1);
        } else {
          this.phase = 'close';
          this.reachedDebrief = true;
        }
        break;
      }
      case 'close':
        this.phase = 'debrief';
        this.debriefPage = 0;
        break;
      case 'debrief':
        // S86: Read on walks the pages; only the LAST page's button closes, so
        // no citation can be left behind a button the way it used to be.
        if (this.debriefPage < this.debriefPageCount - 1) this.debriefPage += 1;
        else this.exit();
        break;
    }
    this.dirty = true;
  }

  /** close back to the era desktop; file the outcome once */
  private exit(): void {
    this.file();
    this.open = false;
    this.dirty = true;
    this.onClose?.();
  }

  /** both outcomes filed to the in-memory ledger; witness copy comes from data */
  private file(): void {
    if (this.filed) return;
    this.filed = true;
    const outcome: 'completed' | 'abandoned' = this.reachedDebrief ? 'completed' : 'abandoned';
    const witness = this.data.witness?.[outcome] ?? '';
    // reps: counted internally only (master plan §R2-2) — never rendered as a score
    ledger.provotypes.push({ id: this.data.id, outcome, witness, reps: this.reps });
    if (outcome === 'completed') {
      for (const tag of this.data.ledgerTags) {
        if (!ledger.tags.includes(tag)) ledger.tags.push(tag);
      }
    }
  }
}
