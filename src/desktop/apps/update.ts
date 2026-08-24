/**
 * THE UPDATE — era transitions as software updates (SCRIPT_UPDATE v0.5 §1;
 * CLAUDE.md law): notification ("Remind me later" works ONCE) → EULA (read
 * through, one live "I Agree") → install (changelog-as-thesis + glitch) →
 * restart. Triggered by documented system failures, never by the player —
 * the SPINE decides when to arm one (src/narrative/spine.ts); this app only
 * performs the ritual on the monitor. All copy data/strings/updates.json
 * (PLACEHOLDER, Sérgio's voice pass pending).
 *
 * The FINAL restart (`close` ritual) is deliberately bare: no terms, no
 * changelog — "Restart as you are." The person's restart, not the system's.
 * Click/tap only (no scroll wheel): the EULA advances by pages via Read on;
 * I Agree goes live only on the last page.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import updates from '../../../data/strings/updates.json';
import { ledger } from '../../state/ledger';
import { drawLambyChar } from './lambyChar';

export type UpdateKey = 'u2' | 'u3' | 'u4' | 'close';
type UpdatePhase = 'cascade' | 'notify' | 'reminded' | 'eula' | 'install' | 'restart';

interface UpdateStrings {
  toEra: string;
  /**
   * ⚑ THE ERROR CASCADE — the beat that runs BEFORE the notice, restored
   * 2026-08-21. It was authored in `s1_end.json`'s `ritual` block and nothing in
   * `src/` ever read it, so it existed as text and never as a beat; Sérgio named
   * it from memory as the loss he could feel. Its own design note calls it
   * "replicating the Error-999 stack".
   *
   * ⚑ It is a STACK, not a dialog. `count` windows arrive `everyMs` apart, each
   * offset from the last, until the screen is a pile of the same refusal — the
   * machine failing loudly and repeatedly at the exact moment the diary proved
   * it could not overwrite a person. Retry and Cancel BOTH lead to the notice:
   * the era's law is register-not-branch, and an error you can genuinely dismiss
   * is not this system.
   *
   * Optional. Only u2 declares one today; omit it and the ritual opens on
   * `notify` exactly as before.
   */
  cascade?: { title: string; line: string; retry: string; cancel: string; count: number; everyMs: number } | null;
  notifyTitle: string;
  notify: string[];
  updateNow: string;
  remindLater: string | null;
  eulaTitle?: string;
  eula: string[][] | null;
  readOn?: string;
  agree?: string;
  installTitle?: string;
  changelog: string[] | null;
  /** THE DISPERSAL (u3 today; data-driven, optional): uninstall-report lines
   *  shown after the changelog finishes typing. A line prefixed '~' renders
   *  small and dim — the quiet line carries the thesis ("companion process —
   *  could not be removed. RENAMED.") — and triggers the fragment beat: LAMBY
   *  HIMSELF thinning out of the report while the pieces that become
   *  Lambient's badges at E3 travel out along the FRAG offsets below. */
  uninstall?: string[];
  /** ⚑ THE INSTALL REPORT (u4, S76) — `uninstall`'s mirror, rendered by the
   *  same code path and with the same '~' quiet-line grammar. u3 reports what
   *  could not be removed and comes apart doing it; u4 reports what ARRIVED,
   *  which is L. The dispersal animation stays u3's alone (see `drawDispersal`'s
   *  call site): the fragments left once, and they are not leaving again. */
  report?: string[];
  /** per-update install length override (u3 needs room for the dispersal) */
  installSeconds?: number;
  restarting: string;
}

/** S61 — the two strings that make "works ONCE" legible (see updates.json's
 *  `_remindDoc`). Shared by every update, so they live beside the ritual
 *  rather than inside any one key's block. */
const REMIND_STATUS: string = (updates as unknown as { remindedStatus: string }).remindedStatus;
const REMIND_SPENT: string = (updates as unknown as { remindSpent: string }).remindSpent;

const REMIND_SECONDS = 40;   // PLACEHOLDER pacing — the one deferral the system allows
const INSTALL_SECONDS = 7.5; // changelog types on + the glitch window
const RESTART_SECONDS = 2.2; // dark beat before the world changes

/**
 * THE DISPERSAL's seven marks (D31, struck by Sérgio 2026-07-25 after the
 * GPAHE check — docs/REINTERP_D31_DISPERSAL_EVIDENCE_2026-07-25.md).
 *
 * These exact offsets are the piece's shared fragment grammar: Session 33
 * authored them here for the uninstall report, and `drawLambMark` in
 * src/desktop/theme/era3.ts renders the SAME seven, SETTLED, as Lambient's
 * badge on all three of Room 2's screens (src/room/era3Devices.ts) — "the
 * fragments have already migrated and arrived, per u3's own line". So the
 * marks that leave here are literally the marks that arrive there; changing
 * one list without the other breaks a payoff that already ships. They are
 * FIXED (no per-frame randomness — pixel discipline) and there are SEVEN of
 * them, fewer and smaller than the thing they came out of: the beat is
 * survival by scattering, not omnipotence (GPAHE 2023 finds deplatforming
 * partly worked, and the piece's own laws forbid an all-powerful apparatus).
 */
const FRAG: readonly (readonly [number, number])[] = [
  [10, -6], [16, 3], [7, 9], [-8, 7], [-13, -4], [4, -12], [-3, 13]
];
/** the marks travel about one puppet-width out, then stop */
const FRAG_SPREAD = 3.0;
const DISPERSAL_SECONDS = 3.4; // the whole fragmenting, start to settled
const DISPERSAL_HOLD = 0.9;    // he simply stands there first — then he goes
const LAMBY_SCALE = 0.5;
const LAMBY_AT = { x: 150, y: 248 }; // under the report, clear of the progress bar

const ERA_NUM: Record<string, number> = { e2: 2, e3: 3, e4: 4, close: 5 };

export class UpdateApp {
  open = true;
  dirty = true;
  /** fires once, after the restart's dark beat — the engine morphs the room */
  onComplete?: (toEra: string) => void;

  readonly key: UpdateKey;
  private readonly s: UpdateStrings;
  // ⚑ An update that declares a cascade OPENS on it; every other update opens
  //   on the notice exactly as before. Set in the constructor once `this.s` is
  //   bound — see below.
  private phase: UpdatePhase = 'notify';
  /** how many error windows have landed so far (drives the stack + the clock) */
  private cascadeShown = 0;
  private t = 0;
  private page = 0;
  private remindUsed = false;
  private completed = false;
  private readonly ledgerEntry: { toEra: number; remindLaterCount: number; eulaScrollPct: number };
  /** R28-2c (the belongings beat) — os.ts wires these for key 'u2' only.
   *  Generic here (costs nothing unused) so u3/u4/close stay untouched. */
  onRemindLaterUsed?: () => void;
  /** fires the instant the notice RETURNS (reminded → notify) — the
   *  gathering window's close, not the eventual era shift. */
  onWindowClosed?: () => void;
  /** fires ONLY when "Update now" is pressed on the FIRST notify screen,
   *  i.e. remind-later was never used — the gathering window never opened. */
  onUpdateNowDirect?: () => void;
  /**
   * ⚑ S86 — THE PRESS THAT LIFTS YOU. Fires the instant the install begins,
   * i.e. on the live "I Agree" (or on "Update now" for a ritual with no terms).
   *
   * Sérgio, 2026-08-15: *"When we press update shouldn't we ascend? Doesn't
   * make sense to do it after the update is done, because that way we can see
   * the room updating as well in sync."* He is right, and it is dramaturgy
   * rather than staging: the piece's whole thesis is that era transitions ARE
   * software updates. Until now `onComplete` fired the room's change AFTER the
   * progress bar and the restart, so the install and the aging were two
   * sequential events and **the player never saw the room change** — the one
   * moment where the argument is literally visible happened off-camera.
   *
   * With this hook the engine starts the relocation HERE, so the ascent and the
   * install are one movement: you rise while the changelog types, the room ages
   * underneath you while the machine is dark, and `onComplete` brings the new
   * era's desktop up on the monitor you are descending back toward.
   */
  onInstallBegin?: (toEra: string) => void;

  constructor(key: UpdateKey) {
    this.key = key;
    this.s = (updates as unknown as Record<string, UpdateStrings>)[key];
    this.ledgerEntry = { toEra: ERA_NUM[this.s.toEra] ?? 0, remindLaterCount: 0, eulaScrollPct: 0 };
    ledger.updates.push(this.ledgerEntry);
    // ⚑ an update that declares a cascade opens on the pile of errors; every
    //   other one opens on its notice, exactly as before.
    if (this.s.cascade) this.phase = 'cascade';
  }

  /** the notification is withdrawn while reminded; it returns once */
  get visible(): boolean {
    return this.phase !== 'reminded';
  }

  /** S76: the last two stages paint the whole surface rather than a dialog.
   *  The room needs to know, because u4 is composited onto a workstation screen that
   *  is wider than this canvas — a full-bleed install must black the whole
   *  panel out, not sit in the middle of somebody's still-open work. */
  get fullScreen(): boolean {
    return this.phase === 'install' || this.phase === 'restart';
  }

  update(dt: number): void {
    // R28-0c (item 7): clamp a single frame's dt. Sérgio's "remind later"
    // ritual report ("it went straight to installing, no EULA/changelog felt
    // lost") is consistent with the browser tab losing focus during the 40s
    // deferral (or install/restart's own short holds) and rAF delivering one
    // giant catch-up frame on return — without a clamp, that single tick can
    // silently satisfy an entire phase's timer (install/restart) before the
    // player ever sees it render even once. Capping dt costs nothing on a
    // normal 60fps frame; it only changes behavior after a real stall/gap.
    const MAX_DT = 0.1;
    this.t += Math.min(dt, MAX_DT);
    // ⚑ the stack builds on its own clock — one window every `everyMs` until
    //   `count` are up. Nothing is required of the player while it fills.
    const casc = this.s.cascade;
    if (this.phase === 'cascade' && casc) {
      const due = Math.min(casc.count, Math.floor((this.t * 1000) / casc.everyMs) + 1);
      this.cascadeShown = due;
    }
    if (this.phase === 'reminded' && this.t >= REMIND_SECONDS) {
      this.phase = 'notify'; // it returns — and this time there is no later
      this.t = 0;
      this.onWindowClosed?.(); // R28-2c: the gathering window closes here
    }
    if (this.phase === 'install' && this.t >= (this.s.installSeconds ?? INSTALL_SECONDS)) {
      this.phase = 'restart';
      this.t = 0;
    }
    if (this.phase === 'restart' && this.t >= RESTART_SECONDS && !this.completed) {
      this.completed = true;
      this.open = false;
      this.onComplete?.(this.s.toEra);
    }
    this.dirty = true;
  }

  private beginInstall(): void {
    // the bare final restart has no changelog — straight to the dark beat
    this.phase = this.s.changelog ? 'install' : 'restart';
    this.t = 0;
    this.onInstallBegin?.(this.s.toEra); // ⚑ S86 — the ascent starts on THIS press
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;

    // ⚑ S61 — THE DEFERRAL IS NOT SILENT ANY MORE (Sérgio: *"Remind me later —
    // what does it do?"*). The notice withdraws, exactly as the law says, but
    // the system leaves one dim line standing at the foot of the screen for
    // the whole 40s: it took your deferral, and it is coming back. Nothing to
    // press, nothing that reads as a window — the apparatus talking to itself
    // where the taskbar would be, over whatever the desktop is doing (at u2/u3
    // that is the belongings gathering window, which is the point of the
    // deferral in this build).
    if (this.phase === 'reminded') {
      ui.setFont(ctx, 9);
      const tw = Math.ceil(ctx.measureText(REMIND_STATUS).width);
      // sits just ABOVE the taskbar (which os.ts draws at H-22 and would
      // otherwise paint straight over this), in the era's own bevelled chrome
      ui.bevel(ctx, 6, H - 40, tw + 16, 15, true);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(REMIND_STATUS, 14, H - 37);
      return;
    }

    if (this.phase === 'cascade' && this.s.cascade) {
      const cs = this.s.cascade;
      const dw = 232; const dh = 92;
      // each window steps down-right from the last, so the pile reads as one
      // failure repeating rather than several different problems
      for (let i = 0; i < this.cascadeShown; i++) {
        const dx = Math.round((W - dw) / 2) - 46 + i * 15;
        const dy = Math.round((H - dh) / 2) - 34 + i * 13;
        const c = ui.windowFrame(ctx, dx, dy, dw, dh, cs.title, true);
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.warnDark;
        ctx.fillText(cs.line, c.x + 10, c.y + 10);
        // ⚑ only the TOP window carries live buttons — a pile of clickable
        //   Retrys would invite the player to fight it, and the beat is that
        //   there is nothing to fight.
        const live = i === this.cascadeShown - 1;
        ui.button(ctx, c.x + c.w - 150, c.y + c.h - 26, 66, 18, cs.retry, { disabled: !live });
        ui.button(ctx, c.x + c.w - 76, c.y + c.h - 26, 66, 18, cs.cancel, { disabled: !live });
      }
      return;
    }
    if (this.phase === 'notify') {
      const bare = this.key === 'close';
      const dw = 320; const dh = bare ? 110 : 150;
      const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
      if (bare) {
        // felt register: no chrome cheer, one line, one button
        ui.px(ctx, dx, dy, dw, dh, ERA1.black);
        ui.setFont(ctx, 12);
        ctx.fillStyle = ERA1.silver;
        this.s.notify.forEach((line, i) => ctx.fillText(line, dx + 24, dy + 22 + i * 16));
        ui.button(ctx, dx + Math.round(dw / 2) - 50, dy + dh - 34, 100, 20, this.s.updateNow, {});
        return;
      }
      const c = ui.windowFrame(ctx, dx, dy, dw, dh, this.s.notifyTitle, true);
      ui.setFont(ctx, 9);
      this.s.notify.forEach((line, i) => {
        ctx.fillStyle = i < 2 ? ERA1.warnDark : ERA1.black;
        ctx.fillText(line, c.x + 10, c.y + 6 + i * 12);
      });
      ui.button(ctx, c.x + c.w - 96, c.y + c.h - 26, 88, 18, this.s.updateNow, {});
      // ⚑ S61 — a SPENT deferral is drawn, not deleted. It used to vanish, so
      // the notice's second appearance looked like a different dialog and the
      // once-only rule was invisible. Greyed is the honest render (S60's
      // ruling, and this is the beat it was written for): the option is still
      // displayed and is no longer one. handleClick has always guarded on
      // `!this.remindUsed`, so the disabled button pushes no live hit — the
      // press does nothing, visibly.
      if (this.s.remindLater) {
        ui.button(ctx, c.x + 8, c.y + c.h - 26, 120, 18,
          this.remindUsed ? REMIND_SPENT : this.s.remindLater, { disabled: this.remindUsed });
      }
      return;
    }

    if (this.phase === 'eula' && this.s.eula) {
      const dw = 400; const dh = 280;
      const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
      const c = ui.windowFrame(ctx, dx, dy, dw, dh, this.s.eulaTitle ?? '', true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      this.s.eula[this.page].forEach((line, i) => {
        ctx.fillText(line, c.x + 14, c.y + 10 + i * 14);
      });
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(`${this.page + 1} / ${this.s.eula.length}`, c.x + 14, c.y + c.h - 22);
      const last = this.page === this.s.eula.length - 1;
      // one live I Agree — armed only on the last page (v0.5 §1)
      ui.button(ctx, c.x + c.w - 96, c.y + c.h - 26, 88, 18, this.s.agree ?? 'I Agree', { disabled: !last });
      ui.button(ctx, c.x + c.w - 196, c.y + c.h - 26, 88, 18, this.s.readOn ?? 'Read on', { disabled: last });
      return;
    }

    if (this.phase === 'install' && this.s.changelog) {
      ui.px(ctx, 0, 0, W, H, ERA1.black);
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(this.s.installTitle ?? '', 40, 30);
      // the changelog is the thesis — it types on, line by line
      ui.setFont(ctx, 10);
      const shown = Math.min(this.s.changelog.length, Math.floor(this.t / 0.8));
      for (let i = 0; i < shown; i++) {
        const line = this.s.changelog[i];
        ctx.fillStyle = line.startsWith('-') ? ERA1.warn : line.startsWith('=') ? ERA1.grey : ERA1.silver;
        ctx.fillText(line, 40, 62 + i * 16);
      }
      // THE DISPERSAL (data-driven; u3 carries it): the uninstall report,
      // after the changelog finishes typing. Plain lines type on like the
      // changelog; a '~' line renders SMALL and DIM (the quiet line is the
      // thesis — "could not be removed. RENAMED."), and under the report
      // LAMBY HIMSELF comes apart into the marks that become Lambient's
      // badges at E3. Nothing in the copy explains it; the staging is the
      // argument (session brief item 6c).
      const trailer = this.s.uninstall ?? this.s.report;
      if (trailer) {
        const clDone = this.s.changelog.length * 0.8 + 0.9;
        const baseY = 62 + this.s.changelog.length * 16 + 14;
        const shownU = Math.min(trailer.length, Math.floor(Math.max(0, this.t - clDone) / 1.1));
        let quietAt = -1;
        for (let i = 0; i < shownU; i++) {
          const raw = trailer[i];
          const quiet = raw.startsWith('~');
          ui.setFont(ctx, quiet ? 8 : 10);
          ctx.fillStyle = quiet ? ERA1.greyDark : ERA1.silver;
          ctx.fillText(quiet ? raw.slice(1).trim() : raw, quiet ? 52 : 40, baseY + i * 15);
          if (quiet && quietAt < 0) quietAt = clDone + (i + 1) * 1.1;
        }
        ui.setFont(ctx, 10);
        // ⚑ u3 ONLY. The dispersal is the beat of one update — Lamby coming
        // apart under the line that says he could not be removed — and u4's
        // report uses the same block for the opposite event. Keyed rather than
        // flagged in data because it is a scene, not a setting.
        if (quietAt >= 0 && this.key === 'u3') this.drawDispersal(ctx, this.t - quietAt);
      }
      // progress + the glitch: the bar stutters near the end (soft, no strobe)
      const bw = 220; const bx = Math.round((W - bw) / 2); const by = H - 70;
      ui.px(ctx, bx - 1, by - 1, bw + 2, 12, ERA1.greyDark);
      ui.px(ctx, bx, by, bw, 10, ERA1.black);
      let k = Math.min(1, this.t / (this.s.installSeconds ?? INSTALL_SECONDS));
      if (k > 0.72 && k < 0.96 && Math.random() < 0.3) k -= 0.05 * Math.random(); // the stutter
      ui.px(ctx, bx, by + 1, Math.round(bw * k), 8, ERA1.titleBlue);
      return;
    }

    if (this.phase === 'restart') {
      ui.px(ctx, 0, 0, W, H, ERA1.black);
      if (this.s.restarting) {
        ui.setFont(ctx, 10);
        ctx.fillStyle = ERA1.greyDark;
        ctx.fillText(this.s.restarting, Math.round(W / 2) - 30, Math.round(H / 2));
      }
    }
  }

  /**
   * THE DISPERSAL (S2R.7 item 6 · D31 struck 2026-07-25). `age` is seconds
   * since the quiet line landed.
   *
   * The staging, in order: he STANDS there for a moment under the report that
   * has just said he could not be removed — `sterile`, the drained mood, not
   * the cheerful one he arrived in — and then he thins out while seven small
   * marks travel out of him along the shared FRAG offsets and settle. What
   * leaves is smaller and fewer than what stood there (3px → 2px, seven marks
   * out of a whole puppet): the apparatus survives by scattering, and loses
   * something doing it. It never grows, never multiplies, never fills the
   * screen — an omnipotent version would be both unsourced (GPAHE 2023:
   * deplatforming partly worked) and against the piece's own laws.
   *
   * He is not drawn inside anything `felt`: this is the install screen, the
   * system's own surface, register `operable` from top to bottom.
   */
  private drawDispersal(ctx: CanvasRenderingContext2D, age: number): void {
    if (age < 0) return;
    const p = Math.min(1, Math.max(0, (age - DISPERSAL_HOLD) / DISPERSAL_SECONDS));
    const e = 1 - (1 - p) * (1 - p); // ease-out: fast to leave, slow to settle
    const cx = LAMBY_AT.x;
    const cy = LAMBY_AT.y;
    if (e < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - e;
      drawLambyChar(ctx, cx, cy, {
        mood: 'sterile', action: 'idle', t: age, moodStart: 0, scale: LAMBY_SCALE
      });
      ctx.restore();
    }
    for (const [fx, fy] of FRAG) {
      const s = Math.max(1, Math.round(3 - e)); // 3px leaving → 2px settled
      ui.px(
        ctx,
        cx + Math.round(fx * FRAG_SPREAD * e),
        cy + Math.round(fy * FRAG_SPREAD * e),
        s, s,
        e > 0.85 ? ERA1.greyDark : ERA1.grey
      );
    }
  }

  /** review aid (?debug=1 only, src/debug/panel.ts): skip the notice and the
   *  terms and land on the install screen, where the dispersal plays. Never
   *  reachable in play — the ritual's own clicks are the only way through it. */
  debugSkipToInstall(): void {
    this.beginInstall(); // S86: the review path must fire the SAME beat, ascent included
  }

  /** click routing — logical canvas coordinates (mirrors the draw geometry) */
  handleClick(x: number, y: number): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;

    // ⚑ RETRY AND CANCEL BOTH LEAD ONWARD, and that is the beat. The era's law
    //   is register-not-branch: a press records HOW you met the machine and
    //   never what it does next. An error dialog you can genuinely dismiss is
    //   not this system — the update was never conditional on your agreement.
    //   Either press ends the pile and opens the notice.
    if (this.phase === 'cascade' && this.s.cascade) {
      if (this.cascadeShown >= 1) { this.phase = 'notify'; this.t = 0; }
      return;
    }
    if (this.phase === 'notify') {
      const bare = this.key === 'close';
      const dw = 320; const dh = bare ? 110 : 150;
      const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
      if (bare) {
        const bx = dx + Math.round(dw / 2) - 50; const by = dy + dh - 34;
        if (x >= bx && x <= bx + 100 && y >= by && y <= by + 20) this.beginInstall();
        return;
      }
      const cx = dx + 4; const cy = dy + 21; const cw = dw - 8; const ch = dh - 25;
      const by = cy + ch - 26;
      if (y >= by && y <= by + 18) {
        if (x >= cx + cw - 96 && x <= cx + cw - 8) {
          // R28-2c: "Update now" pressed while remind-later was NEVER used
          // this instance = the gathering window never opened at all (the
          // short path, spec §4). Fires before the phase changes.
          if (!this.remindUsed) this.onUpdateNowDirect?.();
          if (this.s.eula) { this.phase = 'eula'; this.t = 0; } else { this.beginInstall(); }
          return;
        }
        if (this.s.remindLater && !this.remindUsed && x >= cx + 8 && x <= cx + 128) {
          this.remindUsed = true;              // works exactly once (v0.5 §1)
          this.ledgerEntry.remindLaterCount += 1;
          this.phase = 'reminded';
          this.t = 0;
          this.onRemindLaterUsed?.(); // R28-2c: the gathering window opens
        }
      }
      return;
    }

    if (this.phase === 'eula' && this.s.eula) {
      const dw = 400; const dh = 280;
      const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
      const cx = dx + 4; const cy = dy + 21; const cw = dw - 8; const ch = dh - 25;
      const by = cy + ch - 26;
      const last = this.page === this.s.eula.length - 1;
      if (y >= by && y <= by + 18) {
        if (!last && x >= cx + cw - 196 && x <= cx + cw - 108) {
          this.page += 1;
          this.ledgerEntry.eulaScrollPct = Math.round(((this.page + 1) / this.s.eula.length) * 100);
          this.dirty = true;
          return;
        }
        if (last && x >= cx + cw - 96 && x <= cx + cw - 8) {
          this.ledgerEntry.eulaScrollPct = 100;
          this.beginInstall();
        }
      }
    }
  }
}
