/**
 * ⚑ ERA 3'S PHONE — the group, the backlog, and the end of the era.
 *
 * `ERA3_NARRATIVE.md` §5 is explicit that the era does not end because Vera
 * becomes brave. **It ends because enough people stopped doing the work.** This
 * module is where that happens, and everything in it is built to keep the
 * ending collective and to keep Vera out of the middle of it: she sends
 * nothing here, she rescues nobody, and the beat that finishes the era is
 * other women's messages arriving faster than a block can process them.
 *
 * ⚑ THE FOUR LAWS, from §4 and §7.2, in the order they matter:
 *
 *  1. **CAPTURE EITHER WAY.** Open the link and Lambient knows. Ignore it and
 *     Lambient comes anyway. The two cards say nearly the same sentence and
 *     NEITHER IS A PUNISHMENT — nothing is threatened, nothing is withheld, it
 *     has simply been passed on. A player who behaves perfectly gets the same
 *     visit as one who does not, and learning that is what removes "keep your
 *     head down" from the strategies available.
 *  2. **THE CASCADE IS VOLUME, NOT DAMAGE.** No crash screen, no corruption
 *     glyphs, no error state, no red. The block keeps working, correctly, on
 *     message after message; there are simply more messages than blocks. **The
 *     software is not broken. It is outnumbered.** Lambient stays polite to the
 *     very end.
 *  3. **"YOU CAN'T UNSEE IT."** Afterwards the board is still there, still
 *     working, still greyable, and unusable in a way NOTHING ENFORCES.
 *  4. **The outcome never changes.** Register, never branch. Every route
 *     through this module reaches the same place; only the record differs.
 *
 * ⚑ AND THE GROUP IS NEVER SATIRISED. `docs/reinterp/RESEARCH_PULL_E3_...md`
 * names the caricature precisely — "the troubling quality of these systems is
 * that warmth, friendship, vulnerability and surveillance can be materially
 * genuine at the same time" — so the women in Maiden-to-be are good to each
 * other, and the facilitator who moved Thursday's call so Susan could get there
 * is the same woman who is in the middle of the cascade. Nothing here is a joke
 * at anyone's expense.
 */

import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3 } from '../theme/era3';
import { drawFloppyIcon, FLOPPY_LABEL } from './floppysheep';
import { ledger } from '../../state/ledger';
import m from '../../../data/dialog/s3_maiden.json';
import d from '../../../data/strings/era3_devices.json';

type Msg = { from: string; time: string; text?: string; kind?: string };
type Rect = { x: number; y: number; w: number; h: number; id: string };

const BEFORE = m.before as Msg[];
const MALTA_ONE = m.maltaOne as Msg[];
const MALTA_TWO = m.maltaTwo as Msg[];
const CASCADE = m.cascade as Msg[];
const BACKLOG = m.backlog as { from: string; time: string; text: string }[];

/** ⚑ how far the era has got. `quiet` is the phone S64 built — a lock screen
 *  with one game on it and no notifications at all, which is what makes ONE
 *  arriving an event. Every step after that is player-initiated except the
 *  cascade, which is other people. */
type Stage = 'quiet' | 'first' | 'voted' | 'cascade' | 'after';
type Screen = 'lock' | 'home' | 'group' | 'inbox';
/** Lambient's card, and it is the same card whichever way she got here */
type Card = null | 'opened' | 'ignored';

/** the cascade's own clock. Messages land ~0.45 s apart — fast enough to read
 *  as more-than-one-person, slow enough that a player can watch names arrive.
 *  ⚑ This is the ONE clocked beat in this module and it bumps only the phone's
 *  version, so it never re-uploads the laptop panel beside it. */
const CASCADE_STEP = 0.45;

export class PhoneE3 {
  version = 0;
  private screen: Screen = 'lock';
  private stage: Stage = 'quiet';
  private card: Card = null;
  /** how many cascade messages have landed */
  private cascadeN = 0;
  private cascadeT = 0;
  /** she opened the link at least once — the record's only branch */
  private opened = false;
  /** the block has been shown for the current stage */
  private carded = false;
  private readMessages = new Set<string>();
  private rects: Rect[] = [];

  constructor(private readonly opts: { onLift(): void; floppyOpen(): boolean }) {}

  private bump(): void { this.version++; }

  // ── the era drives these ─────────────────────────────────────────────────
  /** Bea's first messages land. Called when the day's work reaches the gate. */
  arm(): void {
    if (this.stage !== 'quiet') return;
    this.stage = 'first';
    this.carded = false;
    this.bump();
  }

  /** ⚑ IGNORING IS NOT A WAY OUT, and this is where that is enforced. Called
   *  when the player finishes another piece of work on the laptop without
   *  having opened the link: Lambient arrives anyway, with the same news, in
   *  the same voice. No timer does this — her own next action does. */
  onWorkDone(): void {
    if (this.card) return;
    if (this.stage === 'first' && !this.carded) { this.showCard('ignored'); return; }
    if (this.stage === 'voted' && !this.carded) { this.showCard('ignored'); }
  }

  /** the era asks: is it finished? Used to arm the update that ends Era 3. */
  get broken(): boolean { return this.stage === 'after'; }

  tick(dt: number): void {
    if (this.stage !== 'cascade') return;
    this.cascadeT += dt;
    while (this.cascadeT >= CASCADE_STEP && this.cascadeN < CASCADE.length) {
      this.cascadeT -= CASCADE_STEP;
      this.cascadeN++;
      this.bump();
    }
    if (this.cascadeN >= CASCADE.length) {
      this.stage = 'after';
      ledger.checkins.push({ id: 'e3_cascade', witness: m.witness.cascadeSeen });
      this.bump();
    }
  }

  // ── the beats ────────────────────────────────────────────────────────────
  private showCard(which: 'opened' | 'ignored'): void {
    this.card = which;
    this.carded = true;
    ledger.checkins.push({
      id: 'e3_malta_' + this.stage,
      witness: which === 'opened' ? m.block.witnessOpened : m.block.witnessIgnored
    });
    // ⚑ THE LIFT — the room's own light answers the phone, once, on the first
    //   card whichever card it is. Felt before it is understood: the beat holds,
    //   and then the space around her changes. See cluster.ts's E3_LIFT.
    this.opts.onLift();
    this.bump();
  }

  private dismissCard(): void {
    if (!this.card) return;
    this.card = null;
    // ⚑ the era advances on the DISMISS, not on the choice — because the choice
    //   was never the variable. first → voted → cascade.
    if (this.stage === 'first') { this.stage = 'voted'; this.carded = false; }
    else if (this.stage === 'voted') { this.stage = 'cascade'; this.cascadeT = 0; }
    this.bump();
  }

  private openLink(): void {
    if (this.card) return;
    this.opened = true;
    this.showCard('opened');
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    px(ctx, 0, 0, W, H, ERA3.phoneBg);
    if (this.card) { this.drawCard(ctx, W, H); return; }
    if (this.screen === 'lock') { this.drawLock(ctx, W, H); return; }
    if (this.screen === 'group') { this.drawGroup(ctx, W, H); return; }
    if (this.screen === 'inbox') { this.drawInbox(ctx, W, H); return; }
    this.drawHome(ctx, W);
  }

  /** S64's law, unchanged: before anything happens the lock screen is EMPTY.
   *  The phone in this era is quiet, which is what makes one notification an
   *  event. The game has always been here and nothing ever mentions it. */
  private drawLock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    setFont(ctx, 22); ctx.fillStyle = ERA3.white;
    ctx.fillText(d.phone.lockClock, Math.round((W - ctx.measureText(d.phone.lockClock).width) / 2), 34);
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneDim;
    ctx.fillText(d.phone.lockDate, Math.round((W - ctx.measureText(d.phone.lockDate).width) / 2), 62);

    const s = 48; const ix = Math.round((W - s) / 2); const iy = 116;
    drawFloppyIcon(ctx, ix, iy, s);
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneText;
    ctx.fillText(FLOPPY_LABEL, Math.round((W - ctx.measureText(FLOPPY_LABEL).width) / 2), iy + s + 8);
    this.rects.push({ x: ix - 10, y: iy - 8, w: s + 20, h: s + 30, id: 'floppy' });

    if (this.stage === 'quiet') {
      // the whole rest of the phone is behind one press, and nothing says so
      this.rects.push({ x: 0, y: H - 60, w: W, h: 60, id: 'unlock' });
      return;
    }

    const ny = H - 108; const nw = W - 16;
    px(ctx, 8, ny, nw, 92, ERA3.phonePanel);
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneMeta;
    ctx.fillText(m.group.name, 15, ny + 8);
    ctx.fillText(d.phone.notificationTime, W - 15 - ctx.measureText(d.phone.notificationTime).width, ny + 8);
    setFont(ctx, 12); ctx.fillStyle = ERA3.white;
    ctx.fillText('Bea', 15, ny + 24);
    setFont(ctx, 11); ctx.fillStyle = ERA3.phoneText;
    const preview = this.stage === 'first' ? MALTA_ONE[0].text ?? '' : MALTA_TWO[0].text ?? '';
    wrapText(ctx, preview, nw - 22).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, 15, ny + 42 + i * 14));
    this.rects.push({ x: 8, y: ny, w: nw, h: 92, id: 'notification' });
  }

  /** four things, and only one of them wants anything from her */
  private drawHome(ctx: CanvasRenderingContext2D, W: number): void {
    setFont(ctx, 11); ctx.fillStyle = ERA3.phoneDim;
    ctx.fillText(d.phone.lockClock, 10, 8);
    let y = 30;
    const row = (id: string, label: string, note: string, badge: string): void => {
      px(ctx, 8, y, W - 16, 44, ERA3.phonePanel);
      setFont(ctx, 12); ctx.fillStyle = ERA3.white;
      ctx.fillText(label, 16, y + 8);
      setFont(ctx, 9); ctx.fillStyle = ERA3.phoneMeta;
      wrapText(ctx, note, W - 40).slice(0, 1).forEach(ln => ctx.fillText(ln, 16, y + 26));
      if (badge) {
        setFont(ctx, 9); ctx.fillStyle = ERA3.accentHi;
        ctx.fillText(badge, W - 16 - ctx.measureText(badge).width, y + 8);
      }
      this.rects.push({ x: 8, y, w: W - 16, h: 44, id });
      y += 52;
    };

    const unread = this.stage === 'first' ? MALTA_ONE.length
      : this.stage === 'voted' ? MALTA_TWO.length
        : this.stage === 'cascade' ? this.cascadeN : 0;
    row('group', m.home.groupLabel, m.group.meta,
      unread ? m.group.unreadLabel.replace('{n}', String(unread)) : '');
    row('inbox', m.home.messagesLabel, m.home.readNote,
      String(BACKLOG.length - this.readMessages.size));
    row('floppy', FLOPPY_LABEL, '', '');
    // ⚑ the stream is running and nobody asked her to watch it. It has no verb
    //   and never gets one: it is furniture, and that is the observation.
    row('stream', m.home.streamLabel, m.home.streamNote, '');
  }

  /** ⚑ THE GROUP. Ordinary Tuesday, then the news, then — at the end — other
   *  people, arriving faster than the thing that reviews them. */
  private drawGroup(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.header(ctx, W, m.group.name, m.group.meta);
    const msgs: Msg[] = [...BEFORE];
    if (this.stage !== 'quiet') msgs.push(...MALTA_ONE);
    if (this.stage === 'voted' || this.stage === 'cascade' || this.stage === 'after') msgs.push(...MALTA_TWO);
    if (this.stage === 'cascade' || this.stage === 'after') msgs.push(...CASCADE.slice(0, this.cascadeN));

    // ⚑ the thread is drawn from the BOTTOM UP, so the newest is always in view
    //   without a scrollbar and without a scroll gesture the input law forbids.
    //   ⚑ `top` reserves the header AND the outnumbered counter: the first
    //   version drew the counter over the top message, which read as a
    //   rendering fault in the one beat that must not look broken.
    const counted = this.stage === 'cascade' || this.stage === 'after';
    const top = 24 + (counted ? 18 : 0);
    const bottom = H - 12;
    let y = bottom;
    const drawn: { y: number; h: number; msg: Msg }[] = [];
    // ⚑ the guard tests the PROSPECTIVE position, not the previous one. Testing
    //   the previous one let the topmost message start above `top` and sit under
    //   the counter — which is what the counter overlapping the thread actually
    //   was: not a z-order problem, an off-by-one-message layout bug.
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      const h = this.msgHeight(ctx, msg, W);
      const ny = y - h - 6;
      if (ny < top) break;
      y = ny;
      drawn.unshift({ y, h, msg });
    }
    for (const { y: my, msg } of drawn) this.drawMsg(ctx, msg, my, W);

    if (counted) {
      // ⚑ the one line the software says when it loses, and it is
      //   ADMINISTRATIVE rather than dramatic. It does not say it failed. It
      //   says it could not get to all of them, in the voice of something that
      //   has never once raised its voice.
      const missed = Math.max(0, this.cascadeN - 2);
      const label = this.stage === 'after'
        ? m.outnumbered.counter.replace('{n}', String(missed))
        : m.outnumbered.stillWorking;
      px(ctx, 0, 23, W, 18, ERA3.phonePanel);
      setFont(ctx, 9); ctx.fillStyle = ERA3.phoneMeta;
      ctx.fillText(label, 10, 27);
    }
  }

  private msgHeight(ctx: CanvasRenderingContext2D, msg: Msg, W: number): number {
    if (msg.from === 'system') { setFont(ctx, 9); return 14; }
    if (msg.kind === 'link') return 44;
    setFont(ctx, 10);
    return 16 + wrapText(ctx, msg.text ?? '', W - 34).length * 13;
  }

  private drawMsg(ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number): void {
    if (msg.from === 'system') {
      // ⚑ people being ADDED to the group while it happens. Drawn as the
      //   platform's own grey note, because that is what it is.
      setFont(ctx, 9); ctx.fillStyle = ERA3.phoneDim;
      const tw = ctx.measureText(msg.text ?? '').width;
      ctx.fillText(msg.text ?? '', Math.round((W - tw) / 2), y);
      return;
    }
    if (msg.kind === 'link') { this.drawLinkCard(ctx, 10, y, W - 20, msg); return; }
    setFont(ctx, 10);
    const lines = wrapText(ctx, msg.text ?? '', W - 34);
    const h = 16 + lines.length * 13;
    px(ctx, 10, y, W - 20, h, ERA3.phonePanel);
    setFont(ctx, 9); ctx.fillStyle = ERA3.accentHi;
    ctx.fillText(msg.from, 16, y + 3);
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneText;
    lines.forEach((ln, i) => ctx.fillText(ln, 16, y + 15 + i * 13));
  }

  /** ⚑ the pretend newspaper carrying the real law (§7.3). Invented masthead,
   *  documented act. Tappable only while it is the CURRENT news — a card three
   *  screens up in the backlog is not a live control. */
  private drawLinkCard(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, msg: Msg
  ): void {
    px(ctx, x, y, w, 40, ERA3.phonePanel);
    px(ctx, x, y, 2, 40, ERA3.accent);
    setFont(ctx, 8); ctx.fillStyle = ERA3.phoneMeta;
    ctx.fillText(m.link.masthead, x + 8, y + 3);
    setFont(ctx, 9); ctx.fillStyle = ERA3.white;
    wrapText(ctx, m.link.headline, w - 16).slice(0, 2)
      .forEach((ln, i) => ctx.fillText(ln, x + 8, y + 14 + i * 11));
    if (msg.from === 'Bea' || msg.kind === 'link') {
      this.rects.push({ x, y, w, h: 40, id: 'link' });
    }
  }

  /** ⚑ read-only, and it files NOTHING. §6's design law: the piece never makes
   *  her open them, they can be read at any time, and if a player never touches
   *  this inbox that is also true of her. */
  private drawInbox(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // ⚑ the note is NOT in the header — at 180 px it landed on top of the word
    //   "Messages". It belongs at the foot anyway: it is a statement about the
    //   whole screen, and the quietest true sentence in the era.
    this.header(ctx, W, m.home.messagesLabel, '');
    let y = 36;
    for (const b of BACKLOG) {
      setFont(ctx, 10);
      const open = this.readMessages.has(b.from + b.time);
      const lines = open ? wrapText(ctx, b.text, W - 30) : wrapText(ctx, b.text, W - 30).slice(0, 1);
      const h = 18 + lines.length * 13;
      if (y + h > H - 6) break;
      px(ctx, 8, y, W - 16, h, ERA3.phonePanel);
      if (!open) px(ctx, 8, y, 2, h, ERA3.accentHi);
      setFont(ctx, 9); ctx.fillStyle = ERA3.white;
      ctx.fillText(b.from, 15, y + 3);
      ctx.fillStyle = ERA3.phoneMeta;
      ctx.fillText(b.time, W - 15 - ctx.measureText(b.time).width, y + 3);
      setFont(ctx, 10); ctx.fillStyle = ERA3.phoneText;
      lines.forEach((ln, i) => ctx.fillText(ln, 15, y + 16 + i * 13));
      this.rects.push({ x: 8, y, w: W - 16, h, id: 'read-' + b.from + b.time });
      y += h + 6;
    }
    setFont(ctx, 9); ctx.fillStyle = ERA3.phoneDim;
    ctx.fillText(m.home.readNote, 10, Math.min(y + 4, H - 14));
  }

  /** ⚑ LAMBIENT'S CARD, and both versions of it are polite. Nothing is
   *  threatened, nothing is withheld, and the only difference between the two
   *  is how she got here — which is the point. */
  private drawCard(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const opened = this.card === 'opened';
    setFont(ctx, 12); ctx.fillStyle = ERA3.white;
    const title = opened ? m.block.openedTitle : m.block.ignoredTitle;
    wrapText(ctx, title, W - 24).forEach((ln, i) => ctx.fillText(ln, 12, 40 + i * 15));
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneText;
    const body = opened ? m.block.openedBody : m.block.ignoredBody;
    wrapText(ctx, body, W - 24).forEach((ln, i) => ctx.fillText(ln, 12, 86 + i * 13));
    setFont(ctx, 10); ctx.fillStyle = ERA3.phoneMeta;
    const note = opened ? m.block.openedNote : m.block.ignoredNote;
    wrapText(ctx, note, W - 24).forEach((ln, i) => ctx.fillText(ln, 12, 170 + i * 13));

    const by = H - 46;
    px(ctx, 12, by, W - 24, 30, ERA3.phonePanel);
    setFont(ctx, 11); ctx.fillStyle = ERA3.white;
    const bw = ctx.measureText(m.block.dismiss).width;
    ctx.fillText(m.block.dismiss, Math.round((W - bw) / 2), by + 9);
    this.rects.push({ x: 12, y: by, w: W - 24, h: 30, id: 'dismiss' });
  }

  private header(ctx: CanvasRenderingContext2D, W: number, title: string, note: string): void {
    setFont(ctx, 11); ctx.fillStyle = ERA3.white;
    ctx.fillText(title, 26, 6);
    setFont(ctx, 9); ctx.fillStyle = ERA3.phoneMeta;
    ctx.fillText(note, W - 10 - ctx.measureText(note).width, 8);
    setFont(ctx, 12); ctx.fillStyle = ERA3.accentHi;
    ctx.fillText('‹', 10, 5);
    px(ctx, 0, 22, W, 1, ERA3.phonePanel);
    this.rects.push({ x: 0, y: 0, w: 24, h: 22, id: 'back' });
  }

  // ── press ────────────────────────────────────────────────────────────────
  press(x: number, y: number): boolean {
    const r = this.rects.find(rr =>
      x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    if (!r) return false;
    switch (r.id) {
      case 'unlock': this.screen = 'home'; this.bump(); return true;
      case 'notification': this.screen = 'group'; this.openGroup(); return true;
      case 'group': this.screen = 'group'; this.openGroup(); return true;
      case 'inbox':
        this.screen = 'inbox';
        ledger.checkins.push({ id: 'e3_backlog', witness: m.witness.backlogOpened });
        this.bump(); return true;
      case 'back': this.screen = 'home'; this.bump(); return true;
      case 'dismiss': this.dismissCard(); return true;
      case 'link': this.openLink(); return true;
      // ⚑ the stream has no verb. Pressing it is consumed and does nothing,
      //   which is truer than making it play: nobody asked her to watch it.
      case 'stream': return true;
      default:
        if (r.id.startsWith('read-')) {
          this.readMessages.add(r.id.slice(5));
          this.bump();
          return true;
        }
        return false;
    }
  }

  /** `floppy` is owned by the era, not by this module — it returns false so the
   *  caller's own handler opens the game. */
  isFloppyPress(x: number, y: number): boolean {
    const r = this.rects.find(rr =>
      x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    return r?.id === 'floppy';
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'home': this.screen = 'home'; this.bump(); break;
      case 'group': this.arm(); this.screen = 'group'; this.openGroup(); break;
      case 'inbox': this.screen = 'inbox'; this.bump(); break;
      case 'blocked': this.arm(); this.screen = 'group'; this.openLink(); break;
      case 'ignored': this.arm(); this.onWorkDone(); break;
      case 'voted': this.debugBeat('blocked'); this.dismissCard(); break;
      case 'cascade':
        this.debugBeat('voted'); this.openLink(); this.dismissCard();
        this.screen = 'group'; this.bump();
        break;
      case 'after':
        this.debugBeat('cascade');
        this.cascadeN = CASCADE.length; this.stage = 'after';
        ledger.checkins.push({ id: 'e3_cascade', witness: m.witness.cascadeSeen });
        this.bump();
        break;
    }
  }

  private openGroup(): void {
    ledger.checkins.push({ id: 'e3_group', witness: m.witness.groupOpened });
    this.bump();
  }

  get floppyBlocked(): boolean { return this.opts.floppyOpen(); }
  /** ⚑ she opened it at least once — the record's only branch, and it changes
   *  nothing anyone can see. */
  get everOpened(): boolean { return this.opened; }
}
