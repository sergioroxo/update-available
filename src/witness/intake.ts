/**
 * The witness side — the INTAKE RECORD, computed live from the ledger
 * (SCRIPT_UPDATE v0.3 Part V / v0.5: every field traceable to something the
 * player actually did). Register law: this surface is SHARP and cold —
 * surveillance is high-definition. It never responds to input.
 */
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../desktop/theme/era1';
import { px, setFont } from '../desktop/theme/chrome';
import { FLAG, RECORD } from '../desktop/theme/witness';
import { ledger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import opening from '../../data/strings/opening.json';
import updates from '../../data/strings/updates.json';

// Local aliases onto the witness palette (src/desktop/theme/witness.ts).
const INK = RECORD.ink;
const DIM = RECORD.dim;
const PANEL = RECORD.panel;
const FIELD = RECORD.field;
const LINE = RECORD.line;
const HARDEN_SECONDS = 2.2;
/** S144: how long a fresh filing stays lit on the record */
const PULSE_SECONDS = 1.6;

interface OpeningProfileSnapshot {
  active: boolean;
  stage: 'inactive' | 'boot' | 'profile' | 'recap';
  icon: string;
  chips: string[];
  goal: string;
  filed: boolean;
}

export class WitnessCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private t = 0;
  /** message count is sampled at flip time so the record reads as "filed" */
  messagesOnFile = 0;
  dirty = true;
  private openingProfile: OpeningProfileSnapshot = {
    active: false,
    stage: 'inactive',
    icon: '',
    chips: [],
    goal: '',
    filed: false
  };
  private hardenT = HARDEN_SECONDS;
  /**
   * ⚑ S106 — WHICH DECADE THE RECORD THINKS IT IS IN (review R1, finding A-3).
   * This class is deliberately told almost nothing (everything else it draws is
   * computed live from `ledger`), and the era is the one exception it cannot
   * compute: the ledger records what was DONE, never when the room around the
   * panel last changed. `app.ts` sets it from the same era shift that moves the
   * plane onto Maya's wall, so the surface and its wording migrate together.
   * Defaults to 'e1' so a build that never calls the setter reads exactly as it
   * did before this session.
   */
  private era: 'e1' | 'e2' | 'e3' | 'e4' = 'e1';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width * RENDER_SCALE;
    this.canvas.height = ERA1_CANVAS.height * RENDER_SCALE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE); // layout stays logical
  }

  /** the era shift's one word to this surface — see `era` above */
  setEra(era: 'e1' | 'e2' | 'e3' | 'e4'): void {
    if (era === this.era) return;
    this.era = era;
    this.dirty = true;
  }

  /** the era's own stamps, falling back to the flat era-1 wording */
  private eraStrings(): {
    subheader: string; sourceValue: string; statusValue: string; card: string;
    trustedAssigned?: string; notOnline?: string;
  } {
    const s = strings.witness;
    const table = (s as unknown as {
      eras?: Record<string, {
        subheader: string; sourceValue: string; statusValue: string; card: string;
        trustedAssigned?: string; notOnline?: string;
      }>
    }).eras;
    return table?.[this.era] ?? {
      subheader: s.subheader,
      sourceValue: s.sourceValue,
      statusValue: s.statusValue,
      card: 'index · era 1 · drawer 12'
    };
  }

  /** ⚑ S144: a filing landed — the record re-hardens for a beat (the pulse) */
  pulse(): void { this.pulseT = 0; this.dirty = true; }
  private pulseT = 9;

  setOpeningProfile(profile: OpeningProfileSnapshot): void {
    const wasFiled = this.openingProfile.filed;
    this.openingProfile = {
      active: profile.active,
      stage: profile.stage,
      icon: profile.icon,
      chips: [...profile.chips],
      goal: profile.goal,
      filed: profile.filed
    };
    if (!wasFiled && profile.filed) this.hardenT = 0;
    this.dirty = true;
  }

  update(dt: number): void {
    const was = this.t;
    this.t += dt;
    /**
     * ⚑ S105 — THE RECORD RE-UPLOADS ON ITS OWN PULSE, NOT EVERY FRAME
     * (review R1, finding B-1). This line used to read `this.dirty = true;`
     * with nothing guarding it, and Lane B measured the result: ~240 texture
     * uploads a second across this surface and the OS canvas together, flat,
     * whether the piece was idle or animating, in every era — against
     * CLAUDE.md's own "render-texture uploads on dirty only".
     *
     * What this wall actually draws that MOVES is two pulses and one wake:
     * the dormant wall's slow breath (`floor(t * 0.8) % 2`), the record's
     * footer hint (`floor(t * 1.5) % 2`), and the 2.2 s hardening bands. So
     * the flag follows the same quantised-step comparison `space.ts` and
     * `era3Devices.ts` use for their screens — the STEP is compared, not the
     * clock, against the step one frame ago, so nothing has to be stored.
     * At rest that is ~2.3 uploads a second instead of ~120.
     *
     * ⚑ AND THE CONTENT RIDES THE PULSE, deliberately. Everything else here
     * is computed live from `ledger`, which this class is never told about —
     * it has no hook, and a filing can land from anywhere in the piece. The
     * pulse is therefore also the record's refresh: a new line appears within
     * ~0.7 s of being filed, on a cold wall that is BEHIND the seat and takes
     * the piece's one bodily ask to look at. The two paths that must not wait
     * do not: `setOpeningProfile` flags directly, and the wake it starts is
     * drawn every frame below.
     */
    const stepped = (rate: number): boolean =>
      Math.floor(this.t * rate) !== Math.floor(was * rate);
    if (stepped(0.8) || stepped(1.5)) this.dirty = true;
    if (this.hardenT < HARDEN_SECONDS) {
      this.hardenT = Math.min(HARDEN_SECONDS, this.hardenT + dt);
      this.dirty = true; // the wake: bands land over 2.2 s and the line warms through
    }
    if (this.pulseT < PULSE_SECONDS) {   // S144: a filing landed — the newest row lights, then settles
      const b4 = this.pulseT;
      this.pulseT += dt;
      if (Math.floor(b4 * 8) !== Math.floor(this.pulseT * 8)) this.dirty = true;
    }
    const profileLines = this.profileRecaptionLines();
    // The witness lineage's warm→cold arc, as of the opening decision
    // (docs/REINTERP_OPENING_DECISION_2026-07-24.md §1/§5, Sérgio): the cork
    // board is RETIRED — this wall never renders warm any more. The warm
    // first note is the lit room plus "complete your profile, Daniel"; this
    // surface sleeps through all of that (drawDormant) and wakes by
    // HARDENING, on the first filing, into the cold record it stays. Once
    // filed, the intake content is the authority; profile clicks merely add
    // traceable filed lines. (S40 retired the "Start-up options" panel that
    // used to render here first; the interim log-in panel is the
    // disclaimer/controls surface now.)
    if (this.openingProfile.active && !this.openingProfile.filed) {
      this.drawDormant();
    } else if (this.hardenT < HARDEN_SECONDS) {
      this.drawHardening();
    } else if (
      ledger.records.includes('kit-inserted') || ledger.provotypes.length > 0
      || ledger.sends.length > 0 || profileLines.length > 0
      || ledger.guidance.length > 0 || ledger.records.includes('profile-initialized')
      // S2R.7: the migration filing wakes the record on its own. In an
      // ordinary playthrough something above is always true long before u3,
      // but the record must never sleep through a filing it has made — and
      // a review that enters at E2 is exactly the case that proves it.
      || ledger.records.includes('subject-migrated')
    ) {
      this.draw();
    } else {
      this.drawDormant();
    }
  }

  /** before activation: a dark wall, barely breathing — not yet a system */
  private drawDormant(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    px(ctx, 0, 0, W, H, RECORD.voidBg);
    const pulse = Math.floor(this.t * 0.8) % 2 === 0;
    setFont(ctx, 10);
    ctx.fillStyle = pulse ? RECORD.pulseOn : RECORD.pulseOff;
    ctx.fillText(strings.witness.dormant, Math.round(W / 2) - 10, Math.round(H / 2) - 5);
  }

  private field(label: string, value: string, y: number, valueColor: string = INK): void {
    const { ctx } = this;
    setFont(ctx, 9);
    ctx.fillStyle = DIM;
    ctx.fillText(label, 28, y + 3);
    const vx = 170;
    const vw = ERA1_CANVAS.width - vx - 28;
    px(ctx, vx, y, vw, 16, FIELD);
    px(ctx, vx, y, vw, 1, LINE);
    px(ctx, vx, y, 1, 16, LINE);
    px(ctx, vx, y + 15, vw, 1, LINE);
    px(ctx, vx + vw - 1, y, 1, 16, LINE);
    setFont(ctx, 10);
    ctx.fillStyle = valueColor;
    ctx.fillText(this.fitText(value, vw - 12), vx + 6, y + 3);
  }

  private fitText(value: string, maxWidth: number): string {
    const { ctx } = this;
    if (ctx.measureText(value).width <= maxWidth) return value;
    let out = value;
    while (out.length > 3 && ctx.measureText(`${out}...`).width > maxWidth) out = out.slice(0, -1);
    return `${out}...`;
  }

  private profileRecaptionLines(): string[] {
    const recap = opening.recaptions as {
      icon: Record<string, string>; chip: Record<string, string>; goal: Record<string, string>;
    };
    const lines: string[] = [];
    for (const tag of ledger.tags) {
      if (tag.startsWith('profile:icon:')) {
        const id = tag.slice('profile:icon:'.length);
        lines.push(recap.icon[id] ?? id);
      } else if (tag.startsWith('profile:chip:')) {
        const id = tag.slice('profile:chip:'.length);
        lines.push(recap.chip[id] ?? id);
      } else if (tag.startsWith('profile:goal:')) {
        const id = tag.slice('profile:goal:'.length);
        lines.push(recap.goal[id] ?? id);
      }
    }
    return lines;
  }

  private tagsValue(): string {
    const profileLines = this.profileRecaptionLines();
    const other = ledger.tags.filter(t => !t.startsWith('profile:'));
    const parts = [...profileLines, ...other];
    return parts.join(', ') || '—';
  }

  /** S2R.7 item 5 — THE LAST FILING UNDER DANIEL'S NAME. One line, filed by
   *  the u3 restart itself (src/desktop/os.ts pushes the `subject-migrated`
   *  record), copy resolved from data/strings/updates.json like every other
   *  display string. It renders in ordinary INK, not the amber the record
   *  keeps for refusals: nobody refused anything here. The subject moved; the
   *  file stayed. That is the whole of what the record has to say about the
   *  end of a life it spent six years annotating. */
  private migrationLines(): string[] {
    if (!ledger.records.includes('subject-migrated')) return [];
    const u3 = (updates as unknown as Record<string, { migrationFiling?: string }>).u3;
    return u3?.migrationFiling ? [u3.migrationFiling] : [];
  }

  private endingRecordLines(): string[] {
    const e = strings.witness.endingRecords;
    const lines: string[] = [];
    if (ledger.records.includes('enrollment-acknowledged')) lines.push(e.enrollment);
    if (ledger.records.includes('diary-committed')) lines.push(e.diary);
    if (ledger.records.includes('deletion-failed')) lines.push(e.deletion);
    if (ledger.records.includes('diary-glitch')) lines.push(e.glitch);
    return lines;
  }

  /** the wake: the dormant wall bands over into the cold record, once, on
   *  the first filing. This is the lineage's warm→cold hinge — the warm side
   *  now lives in the room (lit lamp) and on the monitor (the profile you
   *  were just completing), never here. */
  private drawHardening(): void {
    this.drawDormant();
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const k = this.hardenT / HARDEN_SECONDS;
    const bands = Math.floor(k * 9);
    for (let i = 0; i < bands; i++) {
      const y = 18 + i * 34;
      px(ctx, 22, y, W - 44, 18, PANEL);
      px(ctx, 22, y + 18, W - 44, 1, LINE);
    }
    setFont(ctx, 10);
    ctx.fillStyle = k > 0.45 ? INK : ERA1.warnDark;
    ctx.fillText(opening.o3_board_hardening, 28, H - 50);
  }

  private draw(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const s = strings.witness;

    const era = this.eraStrings();

    px(ctx, 0, 0, W, H, RECORD.voidBg);
    // header
    px(ctx, 0, 0, W, 24, PANEL);
    px(ctx, 0, 24, W, 1, LINE);
    setFont(ctx, 11);
    ctx.fillStyle = INK;
    ctx.fillText(s.header, 16, 5);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText(era.subheader, W - 190, 8);

    /**
     * ⚑ 2026-09-05 — THE ERA-4 MISFILE IS GONE, WITH THE MIGRATION THAT NEEDED IT.
     *
     * S106 gave this row an era-4 branch reading `Maya — under the old file`,
     * because the plane it draws on had been hung in Maya's room. Sérgio retired
     * that link (`cluster.ts`, same day) — the two are not one file — so the row
     * goes back to what it has always honestly been: the subject of THIS record,
     * which is the name the player typed in 1997 and nobody else's.
     *
     * ⚑ What survives is the half of S106 that was never about Maya: the record
     * still AGES within Daniel's own six years (`witness.eras`, e1/e2). That was
     * review R1's finding A-3 and his own complaint — *"on Era 2 it should change
     * styles and content… it still says era-1"* — and it stands.
     */
    this.field(s.subject, ledger.name, 40);
    this.field(s.source, era.sourceValue, 62);
    this.field(
      s.trustedContact,
      ledger.tags.includes('pastoral-referral') ? s.trustedMade : (era.trustedAssigned ?? s.trustedAssigned),
      84,
      ledger.tags.includes('pastoral-referral') ? FLAG : INK
    );
    this.field(
      s.channelLog,
      ledger.records.includes('went-online')
        ? s.messagesLogged.replace('{n}', String(this.messagesOnFile))
        : (era.notOnline ?? s.notOnline),
      106
    );
    this.field(s.tags, this.tagsValue(), 128, ledger.tags.length ? FLAG : INK);
    this.field(s.status, era.statusValue, 150, FLAG);

    // the index card — the name copied into the era's filing artifact
    const cx = 28; const cy = 190; const cw = 200; const ch = 64;
    px(ctx, cx, cy, cw, ch, RECORD.pulseOn);
    px(ctx, cx, cy, cw, 1, LINE);
    px(ctx, cx, cy, 1, ch, LINE);
    px(ctx, cx, cy + ch - 1, cw, 1, LINE);
    px(ctx, cx + cw - 1, cy, 1, ch, LINE);
    for (let i = 1; i < 4; i++) px(ctx, cx + 8, cy + 14 + i * 12, cw - 16, 1, RECORD.pulseOff);
    /**
     * ⚑ The card carries the file's own registered name, and in this build that
     * is the only name it ever carries. Sérgio, 2026-09-05: *"Please prepare for
     * the 'Daniel' from the Intake, that is not okay."* — struck the same hour,
     * and then the migration that had put this panel in her room at all was
     * retired behind it, so the question cannot arise again.
     */
    setFont(ctx, 10);
    ctx.fillStyle = INK;
    ctx.fillText(ledger.name, cx + 10, cy + 16);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText(era.card, cx + 10, cy + 44);

    // dead FILE button — no raised bevel; it looks inert because it is
    const bx = W - 140; const by = 212;
    px(ctx, bx, by, 110, 22, RECORD.pulseOn);
    px(ctx, bx, by, 110, 1, LINE);
    px(ctx, bx, by, 1, 22, LINE);
    setFont(ctx, 9);
    ctx.fillStyle = RECORD.cardLine;
    ctx.fillText(s.file, bx + 22, by + 6);

    // reinterpretation session log — one cold line per provotype filed, and
    // one per SEND event (offered/visited/declined all appear — declining is
    // never invisible, Ethics #10; the cross-reference lines MESH into the
    // same record, ◆N2). Copy comes from each item's own data (resolved at
    // file time), never composed here. Baseline never populates either.
    const profileLines = this.profileRecaptionLines();
    const endingLines = this.endingRecordLines();
    // R28-2a: guidance responses appear like every other filed thing —
    // followed in ink, declined in the same amber as abandoned/declined
    // elsewhere (witness symmetry: ignoring guidance is never invisible).
    // The first-touch line (FIND #5) leads the log: it was filed first.
    const firstTouchLines = ledger.records.includes('profile-initialized')
      ? [opening.witness_profile_init]
      : [];
    const migrationLines = this.migrationLines();
    if (migrationLines.length > 0
        || profileLines.length > 0 || ledger.provotypes.length > 0 || ledger.sends.length > 0
        || endingLines.length > 0 || ledger.guidance.length > 0 || ledger.belongings.length > 0
        || ledger.lamby.length > 0 || ledger.checkins.length > 0 || ledger.media.length > 0
        || ledger.caleb.length > 0
        || ledger.era3Arrival.length > 0 || ledger.graceQueue.length > 0
        || firstTouchLines.length > 0) {
      setFont(ctx, 8);
      ctx.fillStyle = DIM;
      ctx.fillText(s.sessionLog, 28, 262);
      setFont(ctx, 9);
      const pinned: { text: string; color: string }[] =
        firstTouchLines.map(text => ({ text, color: DIM }));
      const lines: { text: string; color: string }[] = [
        ...profileLines.map(text => ({ text, color: INK })),
        ...ledger.provotypes.map(p => ({
          text: p.witness || `${p.id}: ${p.outcome}`,
          color: p.outcome === 'abandoned' ? FLAG : INK
        })),
        ...ledger.sends.map(sd => ({
          text: sd.witness || `${sd.id}: ${sd.outcome}`,
          color: sd.outcome === 'declined' ? FLAG : INK
        })),
        ...ledger.guidance.map(g => ({
          text: g.witness || `${g.id}: ${g.outcome}`,
          color: g.outcome === 'declined' ? FLAG : INK
        })),
        // R28-2c: the belongings beat — one line per kept item, or one
        // "processed" line on the Update-Now-direct path. Un-kept eligible
        // items file nothing (silence is the record's answer), so there is
        // no un-kept branch to render here.
        ...ledger.belongings.map(b => ({ text: b.witness || `${b.id}: ${b.outcome}`, color: INK })),
        // S2R.0/S2R.1 (Session 34): the return press + Lamby's debut outcome —
        // dismissed renders in the same amber as other declined/abandoned
        // lines (witness symmetry: dismissing the assistant is never invisible).
        ...ledger.lamby.map(l => ({
          text: l.witness || `${l.id}: ${l.outcome}`,
          color: l.outcome === 'dismissed' ? FLAG : INK
        })),
        // S2R.2: every Daily Realignment chip files its own tag — none is a
        // branch, so all render the same ink (register, not judgement).
        ...ledger.checkins.map(c => ({ text: c.witness || `${c.id}`, color: INK })),
        // S2R.4 (Session 35): the NetVision Player offer + outcome — declining
        // the offer and skipping the video both render in the same amber as
        // other declined/abandoned lines (witness symmetry: either response
        // is data); watching to THE BREAK renders in ink like everything else.
        ...ledger.media.map(m => ({
          text: m.witness || `${m.id}: ${m.outcome}`,
          color: (m.outcome === 'declined' || m.outcome === 'skipped') ? FLAG : INK
        })),
        // S2R.3–S2R.6 (Session 45): the Caleb thread. Symmetric by law — a
        // reply files, and so does reading without replying (`held` renders
        // in the same amber as every other refusal here). The COMMIT-PRESS
        // renders amber because it is the thing the apparatus flagged: the
        // wanting was the conduct. The system's own acts (`intervened`) file
        // in ordinary ink, in its own cheerful vocabulary — that cheerfulness
        // is the collapse-material later. The RESIDUE is the one line the
        // record cannot classify: it renders DIM, as the gap it is, and never
        // carries the committed sentence itself.
        ...ledger.caleb.map(cb => ({
          text: cb.witness || `${cb.id}: ${cb.outcome}`,
          color: cb.outcome === 'residue' ? DIM
            : (cb.outcome === 'held' || cb.outcome === 'committed' || cb.outcome === 'dismissed')
              ? FLAG : INK
        })),
        // S2R.7 (Session 58): the migration filing — chronologically the last
        // thing filed under Daniel's name, so it sits here, after the Caleb
        // thread and before the E3 arrival that follows it on screen.
        ...migrationLines.map(text => ({ text, color: INK })),
        // S3R.0 (Session 37): the three-screen room's arrival, once — Lambient's
        // fragments settling visibly across every device (register, not a
        // choice, so it always renders in the same ink as an ordinary filing).
        ...ledger.era3Arrival.map(a => ({ text: a.witness, color: INK })),
        // S3R.1/S3R.5 (Session 38): the GraceQueue moderation record — every
        // card action files, witness-symmetrically. 'approved'/'reviewed'
        // (compliance with the system's suggestion) render in ink; 'stood'
        // (the player declined the suggestion — including Mira's "I won't
        // bury her story.") renders in the same amber as every other
        // refusal/deviation line here (the record marks noncompliance, it
        // never hides it). No counts, no scores — just the lines.
        ...ledger.graceQueue.map(g => ({
          text: g.witness || `card ${g.cardId}: ${g.outcome}`,
          color: g.outcome === 'stood' ? FLAG : INK
        })),
        ...endingLines.map(text => ({ text, color: FLAG }))
      ];
      // the well between the log heading and the footer holds ~7 rows. The
      // FIRST filing stays pinned at the top for the whole session (FIND #5:
      // the record never forgets your first click); the rest shows the most
      // recent filings (the CLASSIFICATION field still carries the profile).
      const shown = [...pinned, ...lines.slice(-(7 - pinned.length))];
      shown.forEach((l, i) => {
        // S144: the row that just landed is lit for a beat — the wall answering
        const fresh = i === shown.length - 1 && this.pulseT < PULSE_SECONDS;
        if (fresh) px(ctx, 24, 274 + i * 12, W - 48, 12, RECORD.pulseOn);
        ctx.fillStyle = fresh ? RECORD.cardLine : l.color;
        ctx.fillText(l.text, 28, 276 + i * 12);
      });
    }

    // footer
    px(ctx, 0, H - 22, W, 22, PANEL);
    px(ctx, 0, H - 22, W, 1, LINE);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText(s.footer, 16, H - 16);
    const pulse = Math.floor(this.t * 1.5) % 2 === 0;
    if (pulse) {
      ctx.fillStyle = RECORD.footer;
      ctx.fillText(s.hint, W - 180, H - 16);
    }
  }
}
