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
import { isSpeedrun } from '../../state/cut';
import { reducedMotion } from '../../state/motion';
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
  guided?: boolean;
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
  /** ⚑ Phase 7 — when present, invitation/frame/vignette open in the Un-Walk wizard's look (pillow.json) */
  wizard?: { title: string; heading: string; frameHeading: string; step: string; round: string; steps: string[];
    /** ⚑ T36 — the programme's own one-line claim of what the exercise is FOR, on the intro's note */
    purposeLabel?: string; purpose?: string };
  /** ⚑ S343 / T37 — the Family Form in its ministry's own 1997 print look (origin_intake_e1.json `ministry`) */
  ministry?: { name: string; tagline: string; formNo: string; stamp: string; question: string;
    ad: { heading: string; lines: string[]; foot: string; coupon?: string[] }; verse: string; envelope: string[]; onHold: string };
}

type Pose = 'lift' | 'exhale' | 'strike';
/**
 * ⚑ T36 (his, 8 Nov: "Release Work shows the racket's movement and what it's meant to be" — and "it's
 * still flipped") — THE DIAGRAM'S POSTURES, in the figure card's own 74×92 logical pixels (drawn at ×2).
 * The card is a side view as the seat sees the room: the wall on the LEFT (Room 1's west wall is on your
 * left at the desk), the bed along it with the pillow at the wall end, the striker standing at the bed's
 * near side and facing the wall. The old figure had its arm on the side AWAY from the pillow, so the
 * racket was raised and laid down beside nothing: that was the flip. Now the arm reaches to the pillow.
 * `sx,sy` the shoulder, `hx,hy` the hand, `ang` the racket's head direction in degrees (0 = right, 90 =
 * up) — the SAME angles as the room's racket (app.ts RACKET_OVER: pitch −60 / −64 / −188), so the window
 * and the room show one movement: raised with the head back, held, down with the head on the pillow.
 */
interface Posture { sx: number; sy: number; hx: number; hy: number; ang: number }
const POSTURE: Record<Pose, Posture> = {
  lift:   { sx: 55, sy: 42, hx: 49, hy: 24, ang: 60 },
  exhale: { sx: 55, sy: 43, hx: 49, hy: 26, ang: 64 },
  strike: { sx: 47, sy: 46, hx: 26, hy: 60, ang: 188 }
};
/** the intro's loop, as a manual would print it: hold, move, hold — never a rhythm to swing to.
 *  `lit` is the step the list lights while that segment plays. */
const LOOP: { from: Pose; to: Pose; secs: number; lit: number }[] = [
  { from: 'lift',   to: 'lift',   secs: 1.2, lit: 0 },
  { from: 'lift',   to: 'exhale', secs: 0.5, lit: 1 },
  { from: 'exhale', to: 'exhale', secs: 1.0, lit: 1 },
  { from: 'exhale', to: 'strike', secs: 0.9, lit: 2 },
  { from: 'strike', to: 'strike', secs: 1.4, lit: 2 },
  { from: 'strike', to: 'lift',   secs: 1.1, lit: 0 }
];
const LOOP_SECONDS = LOOP.reduce((a, l) => a + l.secs, 0);
/** the vignette's move into the asked step — the room's racket takes the same 0.8 s */
const FIG_TWEEN_SECONDS = 0.8;
/** the diagram is redrawn at a period animation rate, and only while something moves */
const FIG_FPS = 12;
const ease = (k: number): number => k * k * (3 - 2 * k);
function lerpPosture(a: Posture, b: Posture, k: number): Posture {
  const l = (p: number, q: number): number => p + (q - p) * k;
  return { sx: l(a.sx, b.sx), sy: l(a.sy, b.sy), hx: l(a.hx, b.hx), hy: l(a.hy, b.hy), ang: l(a.ang, b.ang) };
}

type Phase = 'invitation' | 'frame' | 'vignette' | 'close';
interface Hit { x: number; y: number; w: number; h: number; id: string }
// window geometry — one modal on the era desktop; constant so the fixed
// Leave/Pause row never moves between phases.
// h=336 (was 300) — the pillow's 4-source debrief needs the room; no scroll
// input exists (click/tap only), so the fixed window must simply be tall
// enough for the longest debrief instead. Capped below the era desktop's
// taskbar (H=384, taskbar from H-22) so the window never overlaps it.
const WIN = { x: 36, y: 24, w: 440, h: 336 } as const;
const ROW_Y = WIN.y + WIN.h - 28; // the fixed button row
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
  /** internal only — never rendered as a score (master plan §R2-2) */
  private reps = 0;
  private readonly hasAnim: boolean;
  /** the step the player last PRESSED — the room's racket holds it between steps (roomPose) */
  private lastDone: Pose | null = null;
  // ⚑ T36 — the wizard's diagram: where it is drawn now, and where it is going
  private figNow: Posture = POSTURE.lift;
  private figFrom: Posture = POSTURE.lift;
  private figTarget: Pose | null = null;
  private figK = 1;
  private figLit = 0;
  private loopT = 0;
  private figKey = '';

  constructor(private readonly data: Provotype) {
    this.hasAnim = data.states.some(s => !!s.animPose);
  }

  /** does this state have any pre-response tap/choice at all? */
  private hasOptions(state: ProvotypeState): boolean {
    return (!!state.choices && state.choices.length > 0) || (!!state.buttons && state.buttons.length > 0);
  }

  /** move to a state by index; states with no options reveal their response immediately */
  private enterState(idx: number): void {
    // Also resolves numeric goto targets; no skipped answer/tag/witness is ever filed.
    while (isSpeedrun() && this.data.states[idx]?.guided === false) idx++;
    if (idx >= this.data.states.length) {
      this.phase = 'close'; this.reachedDebrief = true; this.dirty = true; return;
    }
    this.stateIndex = idx;
    this.lastResponse = undefined;
    this.feltRevealed = false;
    this.showResponse = !this.hasOptions(this.data.states[idx]);
    this.dirty = true;
  }

  /**
   * Still click-driven: nothing here advances the session. ⚑ T36 — only the wizard's diagram moves: on
   * the intro it loops the exercise (raised, held, down) so the window shows what is being asked before
   * it is asked; in the steps it eases into the asked position. It marks the window dirty only when a
   * drawn pixel would change (FIG_FPS while moving, nothing during a hold), pauses with Pause, and holds
   * still under Reduce motion.
   */
  update(dt: number): void {
    if (!this.data.wizard || !this.hasAnim) return;
    const still = reducedMotion();
    if (this.phase === 'invitation' || this.phase === 'frame') {
      if (still) { this.figNow = POSTURE.lift; this.figLit = 0; }
      else {
        if (!this.paused) this.loopT = (this.loopT + dt) % LOOP_SECONDS;
        let t = Math.floor(this.loopT * FIG_FPS) / FIG_FPS;
        for (const seg of LOOP) {
          if (t <= seg.secs) {
            this.figNow = lerpPosture(POSTURE[seg.from], POSTURE[seg.to], ease(Math.min(1, t / seg.secs)));
            this.figLit = seg.lit;
            break;
          }
          t -= seg.secs;
        }
      }
    } else if (this.phase === 'vignette') {
      const want = this.data.states[this.stateIndex]?.animPose ?? this.figTarget;
      if (want && want !== this.figTarget) {
        this.figFrom = this.figNow; this.figTarget = want; this.figK = still ? 1 : 0;
      }
      if (this.figTarget) {
        if (this.figK < 1 && !this.paused) this.figK = Math.min(1, this.figK + dt / FIG_TWEEN_SECONDS);
        const steps = FIG_TWEEN_SECONDS * FIG_FPS;
        const kq = this.figK >= 1 ? 1 : Math.floor(this.figK * steps) / steps;
        this.figNow = lerpPosture(this.figFrom, POSTURE[this.figTarget], ease(kq));
      }
    }
    const f = this.figNow;
    const key = [f.sx, f.sy, f.hx, f.hy, f.ang].map(v => Math.round(v * 2)).join(',') + `:${this.figLit}`;
    if (key !== this.figKey) { this.figKey = key; this.dirty = true; }
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
    // ⚑ Phase 7 — Release Work in the Un-Walk programme's own wizard (pillow.json `wizard`)
    const Wz = this.data.wizard;
    if (Wz && (this.phase === 'invitation' || this.phase === 'frame' || this.phase === 'vignette')) {
      const wc = this.drawWizard(ctx, Wz);
      this.drawFixedRow(ctx);
      if (this.paused) this.drawPaused(ctx, wc);
      return;
    }
    let c: ui.ContentRect;
    const Mn = this.data.ministry;
    const stNow = this.data.states[this.stateIndex];
    const feltBeat = this.phase === 'vignette' && this.showResponse && this.feltRevealed && !!stNow?.felt;
    if (Mn && !feltBeat && this.phase !== 'close') {
      c = this.drawMinistry(ctx, Mn, title);
    } else if (Mn && this.phase === 'close') {
      c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, title, true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
      if (c.closeBox.w > 0) this.hits.push({ ...c.closeBox, id: 'leave' });
      this.drawEnvelope(ctx, Mn, c.x + Math.round((c.w - 220) / 2), c.y + 112);
    } else if (isRoomPhase) {
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

    let y = top;
    const Mn = this.data.ministry;
    if (Mn) {   // S343 — a printed form numbers its questions
      ui.setFont(ctx, 8); ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(Mn.question.replace('{n}', String(this.stateIndex + 1)).replace('{of}', String(this.data.states.length)), x, y);
      ui.px(ctx, x, y + 11, maxW, 1, ERA1.silver);
      y += 18;
    }
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    for (const w of wrap(ctx, st.prompt, maxW)) { ctx.fillText(w, x, y); y += 15; }
    y += 8;

    if (!this.showResponse) {
      // the options — each click-confirm registers; no choice is "right"
      const labels = st.choices ? st.choices.map(c => c.label) : (st.buttons ?? []);
      labels.forEach((label, i) => {
        const bw = Math.min(Mn ? maxW : 220, Math.max(120, ctx.measureText(label).width + (Mn ? 40 : 28)));
        const by = y + i * 28;
        ui.button(ctx, x, by, bw, 22, Mn ? `   ${label}` : label, { hover: this.hover === `choice:${i}` });
        if (Mn) {   // the printed form's tick box, inside the button
          ui.px(ctx, x + 7, by + 6, 10, 10, ERA1.greyDark); ui.px(ctx, x + 8, by + 7, 8, 8, ERA1.white);
        }
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
    let y = top + (this.data.ministry ? 14 : 30);   // S343: the envelope sits under the lines
    for (const line of cl?.lines ?? []) {
      for (const w of wrap(ctx, line, maxW)) { ctx.fillText(w, x, y); y += 15; }
      y += 4;
    }
    // S283: this button closes the window now (nothing follows the close) — the card's own 'Return' where it has one
    this.primary(ctx, this.data.debrief.close ?? cl?.continue ?? chrome.next);
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
  /** ⚑ S343 — the programme is speaking (the invitation, the frame, a question or its reply): its music may play;
   *  never under the person's own felt line, the close, or the hold */
  get programmeVoice(): boolean {
    if (this.paused || this.phase === 'close') return false;
    const st = this.data.states[this.stateIndex];
    return !(this.phase === 'vignette' && this.showResponse && this.feltRevealed && !!st?.felt);
  }

  /** which provotype this is — the guide thread reads it (S151) */
  get id(): string { return this.data.id; }

  /** ⚑ T36 (8 Nov) — the room shows the step the player PRESSED and holds it until the next press; it is
   *  no longer sent back to the wall between steps (with the tween that would be the racket flying
   *  wall↔pillow six times a round). Off the vignette — the close, or the window shut — it goes home. */
  get roomPose(): Pose | null {
    if (!this.hasAnim || this.phase !== 'vignette') return null;
    const st = this.data.states[this.stateIndex];
    return (this.showResponse ? st.animPose : undefined) ?? this.lastDone;
  }

  /**
   * ⚑ Phase 7 — THE WIZARD (his: "does it need visualizers, does it need the photos like the book?").
   * The kit's grammar: the picture panel on the left, the words on the right, the etched rule and the row.
   * The panel is the visualizer: the figure performing the step being ASKED (a tutorial shows the move
   * before you make it), twice its old size, and the three steps with the current one lit. For a felt
   * line the panel empties and the heading goes: the programme has nothing to show there.
   *
   * ⚑ T36 (8 Nov, headset: "text sits on a bare grey area") — the words sit on a CARD now, the kit's own
   * pledge-card look (paper, grey rule, navy caption), not on the window's beige; and the intro carries
   * one note of what the exercise is FOR, in the programme's own words (pillow.json `wizard.purpose`).
   * The felt line keeps the card but nothing else on it: bare is the line, not a grey void.
   */
  private drawWizard(ctx: CanvasRenderingContext2D, Wz: NonNullable<Provotype['wizard']>): ui.ContentRect {
    const c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, Wz.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    if (c.closeBox.w > 0) this.hits.push({ ...c.closeBox, id: 'leave' });
    const PIC = 150;
    const px0 = c.x + 8, py0 = c.y + 8, ph = ROW_Y - 12 - py0;
    const st = this.data.states[this.stateIndex];
    const felt = this.phase === 'vignette' && this.showResponse && this.feltRevealed && !!st.felt;
    ui.px(ctx, px0, py0, PIC, ph, ERA1.teal);
    ui.px(ctx, px0, py0, PIC, 1, ERA1.tealDark); ui.px(ctx, px0, py0, 1, ph, ERA1.tealDark);
    const pose = this.phase === 'vignette' ? (st.animPose ?? null) : null;
    const k = pose === 'lift' ? 0 : pose === 'exhale' ? 1 : pose === 'strike' ? 2 : -1;
    const intro = this.phase === 'invitation' || this.phase === 'frame';
    // the lit step: the asked one in the steps; on the intro, the one the loop is showing
    const lit = intro ? this.figLit : k;
    if (!felt) {
      ctx.save(); ctx.translate(px0 + 1, py0 + 6); ctx.scale(2, 2); this.drawDiagram(ctx, 0, 0, this.figNow); ctx.restore();
      Wz.steps.forEach((label, i) => {
        const ry = py0 + 198 + i * 16;
        if (i === lit) ui.px(ctx, px0 + 6, ry - 3, PIC - 12, 15, ERA1.navy);
        ui.setFont(ctx, 10);
        ctx.fillStyle = i === lit ? ERA1.white : ERA1.silver;
        ctx.fillText(`${i + 1}   ${label}`, px0 + 14, ry);
      });
    }
    ui.px(ctx, c.x + 8, ROW_Y - 6, c.w - 16, 1, ERA1.grey);
    ui.px(ctx, c.x + 8, ROW_Y - 5, c.w - 16, 1, ERA1.white);

    // the card the words sit on — the kit's pledge card (kit.ts drawPledge): paper, a grey rule round it
    const cx0 = px0 + PIC + 8, cw = c.x + c.w - 8 - cx0;
    ui.px(ctx, cx0, py0, cw, ph, ERA1.paper);
    ui.px(ctx, cx0, py0, cw, 1, ERA1.grey); ui.px(ctx, cx0, py0 + ph - 1, cw, 1, ERA1.grey);
    ui.px(ctx, cx0, py0, 1, ph, ERA1.grey); ui.px(ctx, cx0 + cw - 1, py0, 1, ph, ERA1.grey);
    const tx = cx0 + 10, tw = cw - 20;
    let ty = py0 + 10;
    if (!felt) {
      ui.setFont(ctx, 14);
      ctx.fillStyle = ERA1.black;
      const head = this.phase === 'invitation' ? Wz.heading : this.phase === 'frame' ? Wz.frameHeading
        : k >= 0 ? Wz.step.replace('{n}', String(k + 1)) : Wz.heading;
      ctx.fillText(head, tx, ty);
      if (this.phase === 'vignette') {
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.greyDark;
        ctx.fillText(Wz.round.replace('{r}', String(Math.floor(this.stateIndex / 4) + 1)), tx, ty + 18);
      }
      ui.px(ctx, tx, ty + 29, tw, 1, ERA1.silver);
      ty += 38;
    }
    // the programme's note of what this is for — the intro only, at the card's foot (a yellow help note)
    if (intro && Wz.purpose) {
      ui.setFont(ctx, 10);
      const lines = ui.wrapText(ctx, Wz.purpose, tw - 16);
      const nh = 22 + lines.length * 13 + 6;
      const ny = py0 + ph - 8 - nh;
      ui.px(ctx, tx, ny, tw, nh, ERA1.tooltip);
      ui.px(ctx, tx, ny, tw, 1, ERA1.grey); ui.px(ctx, tx, ny + nh - 1, tw, 1, ERA1.grey);
      ui.px(ctx, tx, ny, 1, nh, ERA1.grey); ui.px(ctx, tx + tw - 1, ny, 1, nh, ERA1.grey);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(Wz.purposeLabel ?? '', tx + 8, ny + 6);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      lines.forEach((ln, i) => ctx.fillText(ln, tx + 8, ny + 22 + i * 13));
    }
    switch (this.phase) {
      case 'invitation': this.drawInvitation(ctx, tx, ty, tw); break;
      case 'frame': this.drawFrame(ctx, tx, ty, tw); break;
      default: this.drawVignette(ctx, tx, ty, tw);
    }
    return c;
  }

  /** the old card's figure (a non-wizard provotype with poses): the same diagram, standing still in a pose */
  private drawFigure(ctx: CanvasRenderingContext2D, x: number, top: number): void {
    const st = this.data.states[this.stateIndex];
    const pose = this.showResponse ? st.animPose : undefined;
    this.drawDiagram(ctx, x, top, POSTURE[pose ?? 'lift']);
  }

  /**
   * ⚑ T36 — the racket over the pillow, in blocks: the wall, the bed with its pillow at the wall end, the
   * striker at the near side, the arm, the racket (a grip, a throat, a strung oval). Every block lands on
   * the logical pixel grid; the movement is the posture changing, never a rotated canvas.
   *
   * The ethic is drawFigure's, unchanged since R2: administrative, not kinaesthetic. No impact lines, no
   * shake, no blur, no speed marks — the pillow gives by one pixel when the racket rests on it and that is
   * all. The figure is a grey pictogram (anyone; the programme's diagram of "you"), never Daniel's face.
   */
  private drawDiagram(ctx: CanvasRenderingContext2D, x: number, top: number, p: Posture): void {
    const w = 74, h = 92;
    const P = (bx: number, by: number, bw: number, bh: number, col: string): void =>
      ui.px(ctx, x + bx, top + by, bw, bh, col);
    P(0, 0, w, h, ERA1.paper);
    P(0, 0, w, 1, ERA1.silver); P(0, 0, 1, h, ERA1.silver);
    P(0, h - 1, w, 1, ERA1.silver); P(w - 1, 0, 1, h, ERA1.silver);
    // the wall (left) and the floor
    P(1, 1, 3, 88, ERA1.beige); P(4, 1, 1, 88, ERA1.grey);
    P(1, 89, 72, 1, ERA1.grey);
    // the bed along the wall: legs, frame, mattress, the navy blanket
    P(7, 79, 2, 10, ERA1.grey); P(43, 79, 2, 10, ERA1.grey);
    P(5, 77, 42, 2, ERA1.greyDark);
    P(5, 71, 42, 6, ERA1.beige);
    P(24, 69, 23, 6, ERA1.navy);
    // the pillow at the wall end — it gives by one pixel under the resting racket, nothing more
    const resting = p.ang > 180;
    const pt = resting ? 66 : 65;
    P(6, pt, 16, 71 - pt, ERA1.white);
    P(6, pt, 16, 1, ERA1.silver); P(6, pt, 1, 71 - pt, ERA1.silver); P(21, pt, 1, 71 - pt, ERA1.silver);

    const line = (x0: number, y0: number, x1: number, y1: number, t: number, col: string): void => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let i = 0; i <= n; i++) {
        P(Math.round(x0 + (x1 - x0) * i / n - t / 2), Math.round(y0 + (y1 - y0) * i / n - t / 2), t, t, col);
      }
    };
    // the striker: legs, a torso leaning from a fixed hip to the shoulder, the arm, the head facing the wall
    const hipX = 58, hipY = 62;
    P(54, hipY, 3, 89 - hipY, ERA1.grey); P(59, hipY, 3, 89 - hipY, ERA1.grey);
    line(hipX, hipY, p.sx, p.sy, 6, ERA1.grey);
    line(p.sx, p.sy, p.hx, p.hy, 2, ERA1.grey);
    const hx0 = Math.round(p.sx - 5), hy0 = Math.round(p.sy - 12);
    P(hx0, hy0, 8, 8, ERA1.grey);
    P(hx0 - 1, hy0 + 3, 1, 2, ERA1.grey);   // the nose: which way the figure faces
    // the racket: from the hand, a grip behind and a throat ahead, the strung head at 12 px along `ang`
    const a = p.ang * Math.PI / 180;
    const dx = Math.cos(a), dy = -Math.sin(a);
    line(p.hx - 3 * dx, p.hy - 3 * dy, p.hx + dx, p.hy + dy, 2, ERA1.greyDark);
    line(p.hx + dx, p.hy + dy, p.hx + 6.5 * dx, p.hy + 6.5 * dy, 1, ERA1.black);
    const cx = p.hx + 12 * dx, cy = p.hy + 12 * dy;
    for (let j = Math.floor(cy - 7); j <= Math.ceil(cy + 7); j++) {
      for (let i = Math.floor(cx - 7); i <= Math.ceil(cx + 7); i++) {
        const ux = i + 0.5 - cx, uy = j + 0.5 - cy;
        const u = ux * dx + uy * dy, v = -ux * dy + uy * dx;
        if ((u / 6) ** 2 + (v / 4.5) ** 2 > 1) continue;
        const rim = (u / 4.9) ** 2 + (v / 3.4) ** 2 > 1;
        const ru = ((Math.round(u) % 3) + 3) % 3, rv = ((Math.round(v) % 3) + 3) % 3;
        P(i, j, 1, 1, rim ? ERA1.black : (ru === 0 || rv === 0) ? ERA1.silver : ERA1.paper);
      }
    }
    // the hand closed on the grip
    P(Math.round(p.hx - 1), Math.round(p.hy - 1), 2, 2, ERA1.greyDark);
  }

  // ⚑ S283 — the 'About this' dossier window (drawDebrief and its paging) LEFT the experience: the card's
  //   `debrief` text and sources now live on the era websites (public/sites/, tools/gen_era_sites.mjs). The data
  //   stays in data/provotypes/*.json; nothing here draws it any more.

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

  /** ⚑ S343 / T37 (his 8 Nov: the stacked text overlapped — "on hold" as its own box) — the hold is a small dialog of
   *  its own over a veiled form, never words printed over the question */
  private drawPaused(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    ctx.fillStyle = 'rgba(212,208,200,0.82)'; // the era's chrome beige, veiled
    ctx.fillRect(c.x, c.y, c.w, Math.max(0, ROW_Y - 6 - c.y));
    // S168 / R3-12: the hold says what it is
    const w = 260, x = WIN.x + Math.round((WIN.w - w) / 2);
    ui.setFont(ctx, 11);
    const lines = ui.wrapText(ctx, chrome.paused, w - 24);
    const h = 30 + lines.length * 14 + 12, y = WIN.y + Math.round((WIN.h - 28 - h) / 2);
    const f = ui.windowFrame(ctx, x, y, w, h, this.data.ministry?.onHold ?? chrome.pause, false);
    ui.px(ctx, f.x, f.y, f.w, f.h, ERA1.beige);
    ctx.fillStyle = ERA1.black;
    lines.forEach((ln, i) => ctx.fillText(ln, f.x + 10, f.y + 8 + i * 14));
  }

  /** ⚑ S343 / T37 — the ministry's 1997 print look: the letterhead, the ad column, the verse at the foot */
  private drawMinistry(ctx: CanvasRenderingContext2D, M: NonNullable<Provotype['ministry']>, title: string): ui.ContentRect {
    const f = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, title, true);
    if (f.closeBox.w > 0) this.hits.push({ ...f.closeBox, id: 'leave' });
    ui.px(ctx, f.x, f.y, f.w, f.h, ERA1.paper);
    // the letterhead: the mark (a sunrise over a path), the name, the line under it
    const lx = f.x + 10, ly = f.y + 6;
    ui.px(ctx, lx, ly, 34, 30, ERA1.navy);
    for (let r = 0; r < 7; r++) { const half = Math.round(Math.sqrt(49 - (7 - r) * (7 - r)) * 1.4); ui.px(ctx, lx + 17 - half, ly + 6 + r, half * 2, 1, ERA1.tooltip); }
    for (let i = 0; i < 5; i++) ui.px(ctx, lx + 5 + i * 6, ly + 3, 2, 2, ERA1.tooltip);   // the rays
    ui.px(ctx, lx + 2, ly + 14, 30, 14, ERA1.olive);
    for (let r = 0; r < 14; r++) { const w = 2 + Math.round(r * 1.1); ui.px(ctx, lx + 17 - Math.floor(w / 2), ly + 14 + r, w, 1, ERA1.paper); }   // the path
    ui.setFont(ctx, 15); ctx.fillStyle = ERA1.navy; ctx.fillText(M.name, lx + 42, ly + 1);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.warnDark; ctx.fillText(M.tagline, lx + 43, ly + 20);
    // the form number and the stamp, top right
    ui.setFont(ctx, 8);
    const sw = ctx.measureText(M.stamp).width + 8;
    ctx.fillStyle = ERA1.grey; ctx.fillText(M.formNo, f.x + f.w - 10 - ctx.measureText(M.formNo).width, ly);
    ui.px(ctx, f.x + f.w - 10 - sw, ly + 13, sw, 13, ERA1.warn); ui.px(ctx, f.x + f.w - 9 - sw, ly + 14, sw - 2, 11, ERA1.paper);
    ctx.fillStyle = ERA1.warn; ctx.fillText(M.stamp, f.x + f.w - 6 - sw, ly + 15);
    // the double rule under the letterhead
    ui.px(ctx, f.x + 8, ly + 34, f.w - 16, 2, ERA1.navy); ui.px(ctx, f.x + 8, ly + 38, f.w - 16, 1, ERA1.warnDark);
    // the ad column: every mailing carried one
    const aw = 112, ax = f.x + f.w - aw - 8, ay = ly + 46, ah = ROW_Y - 30 - ay;
    ui.px(ctx, ax, ay, aw, ah, ERA1.warnDark); ui.px(ctx, ax + 2, ay + 2, aw - 4, ah - 4, ERA1.tooltip);
    ui.px(ctx, ax + 2, ay + 2, aw - 4, 16, ERA1.warnDark);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(M.ad.heading, ax + Math.round((aw - ctx.measureText(M.ad.heading).width) / 2), ay + 5);
    // a family under the sunrise, in the ministry's clip-art manner
    const px0 = ax + 14, py0 = ay + 26, pw = aw - 28;
    ui.px(ctx, px0, py0, pw, 40, ERA1.titleBlue);
    for (let r = 0; r < 10; r++) { const half = Math.round(Math.sqrt(100 - (10 - r) * (10 - r)) * 1.6); ui.px(ctx, px0 + pw / 2 - half, py0 + 18 + r, half * 2, 1, ERA1.tooltip); }
    ui.px(ctx, px0, py0 + 28, pw, 12, ERA1.olive);
    const fig = (cx: number, h: number): void => { ui.px(ctx, cx - 2, py0 + 40 - h, 4, 4, ERA1.navy); ui.px(ctx, cx - 3, py0 + 44 - h, 6, h - 4, ERA1.navy); };
    fig(px0 + 22, 18); fig(px0 + 34, 15); fig(px0 + 46, 11); fig(px0 + 60, 17);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.navy;
    M.ad.lines.forEach((l, i) => ctx.fillText(l, ax + Math.round((aw - ctx.measureText(l).width) / 2), py0 + 48 + i * 12));
    // the clip-out coupon, dashed, with its own tick box
    if (M.ad.coupon) {
      const cy = py0 + 48 + M.ad.lines.length * 12 + 6, cw = aw - 16, ch = M.ad.coupon.length * 10 + 8;
      for (let i = 0; i < cw; i += 4) { ui.px(ctx, ax + 8 + i, cy, 2, 1, ERA1.greyDark); ui.px(ctx, ax + 8 + i, cy + ch, 2, 1, ERA1.greyDark); }
      for (let j = 0; j < ch; j += 4) { ui.px(ctx, ax + 8, cy + j, 1, 2, ERA1.greyDark); ui.px(ctx, ax + 8 + cw - 1, cy + j, 1, 2, ERA1.greyDark); }
      ui.setFont(ctx, 8); ctx.fillStyle = ERA1.black;
      M.ad.coupon.forEach((l, i) => ctx.fillText(l, ax + 14, cy + 5 + i * 10));
      ui.px(ctx, ax + cw - 6, cy + 5, 8, 8, ERA1.greyDark); ui.px(ctx, ax + cw - 5, cy + 6, 6, 6, ERA1.white);
    }
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.warnDark;
    ctx.fillText(M.ad.foot, ax + Math.round((aw - ctx.measureText(M.ad.foot).width) / 2), ay + ah - 14);
    // the verse at the foot of the page
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(M.verse, f.x + 12, ROW_Y - 22);
    ui.px(ctx, f.x + 8, ROW_Y - 8, f.w - 16, 1, ERA1.silver);
    return { x: f.x, y: ly + 46, w: f.w - aw - 12, h: ROW_Y - 30 - (ly + 46), closeBox: f.closeBox };
  }

  /** ⚑ S343 — the close: the envelope the form goes back into, addressed to the fellowship */
  private drawEnvelope(ctx: CanvasRenderingContext2D, M: NonNullable<Provotype['ministry']>, x: number, y: number): void {
    const w = 220, h = 108;
    ui.px(ctx, x + 3, y + 3, w, h, ERA1.silver);
    ui.px(ctx, x, y, w, h, ERA1.white); ui.px(ctx, x, y, w, 1, ERA1.grey); ui.px(ctx, x, y + h - 1, w, 1, ERA1.grey);
    ui.px(ctx, x, y, 1, h, ERA1.grey); ui.px(ctx, x + w - 1, y, 1, h, ERA1.grey);
    ui.px(ctx, x + w - 36, y + 8, 26, 30, ERA1.warnDark); ui.px(ctx, x + w - 33, y + 11, 20, 24, ERA1.tooltip);   // the stamp
    ui.px(ctx, x + 10, y + 10, 16, 14, ERA1.navy); ui.px(ctx, x + 12, y + 18, 12, 6, ERA1.olive);   // the return mark
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black;
    M.envelope.forEach((l, i) => ctx.fillText(l, x + 62, y + 52 + i * 13));
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
        this.phase = 'close';   // S283: a 'debrief' target lands on the close — the dossier is no longer a phase
        this.reachedDebrief = true; // finishing the vignette is "completed"
        this.dirty = true;
      } else {
        if (chosen.goto <= this.stateIndex) this.reps++; // internal only — never shown as a score
        this.enterState(chosen.goto);
      }
      return;
    }
    // no choice is scored or "correct" — the confirm only surfaces the reply
    if (st.animPose) this.lastDone = st.animPose;
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
        // ⚑ S283 — the narrative close is the last thing in the window: its button closes it. The 'About this'
        //   dossier that used to follow lives on the era websites now.
        this.exit();
        return;
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
