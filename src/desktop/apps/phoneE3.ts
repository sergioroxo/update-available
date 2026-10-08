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

import {
  PHONE, phoneFont, phoneWrap, roundRect, statusBar, appBar, bubble, avatar,
  appTile, wallpaper, sheet, pill, furnitureTile, dock, pageDots, dateWidget
} from '../theme/phone';
import { drawFloppyIcon } from './floppysheep';
import { ledger } from '../../state/ledger';
import { entriesByEra } from '../../witness/record';
import m from '../../../data/dialog/s3_maiden.json';
import d from '../../../data/strings/era3_devices.json';
import { playOnce } from '../../audio/tapeAudio';

type Msg = { from: string; time: string; text?: string; kind?: string };
type Rect = { x: number; y: number; w: number; h: number; id: string };

const BEFORE = m.before as Msg[];
const MALTA_ONE = m.maltaOne as Msg[];
const MALTA_TWO = m.maltaTwo as Msg[];
const CASCADE = m.cascade as Msg[];
const LINK_VOTE = m.linkVote as { masthead: string; headline: string; standfirst: string; tapHint: string };
const BACKLOG = m.backlog as { from: string; time: string; text: string }[];
const UNLOCK_HINT = (m.home as unknown as Record<string, string>).unlockHint;
const HOME = m.home as unknown as Record<string, string>;

/** ⚑ how far the era has got. `quiet` is the phone S64 built — a lock screen
 *  with one game on it and no notifications at all, which is what makes ONE
 *  arriving an event. Every step after that is player-initiated except the
 *  cascade, which is other people. */
type Stage = 'quiet' | 'first' | 'voted' | 'cascade' | 'after';
type Screen = 'lock' | 'home' | 'group' | 'inbox' | 'platform' | 'message' | 'walk';
/** Lambient's card, and it is the same card whichever way she got here */
type Card = null | 'opened' | 'ignored';

/** the cascade's own clock. Messages land ~0.45 s apart — fast enough to read
 *  as more-than-one-person, slow enough that a player can watch names arrive.
 *  ⚑ This is the ONE clocked beat in this module and it bumps only the phone's
 *  version, so it never re-uploads the workstation panel beside it. */
const CASCADE_STEP = 0.45;
/** ⚑ S219 / W1-B13 — at most one message sound per this many seconds, the repeats at a fraction of the first */
const CASCADE_SOUND_GAP = 1.5;
const CASCADE_REPEAT_VOLUME = 0.4;

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
  /** ⚑ S219 / W1-E4·E7 — how many of the group's messages she has SEEN. The badge and the thread's "N new messages" were
   *  computed from the stage alone, so they never fell: opening the thread left "4 new messages", and the cascade's
   *  sixteen stayed counted on the home grid for good. Unread is what has landed and has not yet been on her screen. */
  private groupSeen = 0;
  /** ⚑ S219 / W1-E6 — the card on the glass is a SPENT link being answered, not the stage's own beat: it closes and
   *  moves nothing (no ledger, no lift, no stage) */
  private spentCard = false;
  /** S177 — the backlog message open on its own screen (`from + time`), or null */
  private openMessage: string | null = null;
  private rects: Rect[] = [];

  /** S158 / R3-66: the phone's clock is the workstation's — one clock for the room */
  constructor(private readonly opts: { onLift(): void; floppyOpen(): boolean; clock?: () => string }) {}
  private get clockText(): string { return this.opts.clock ? this.opts.clock() : d.phone.lockClock; }

  private bump(): void { this.version++; }

  /** ⚑ S219 — every message of the group's thread that has landed, past the history she already had */
  private groupLanded(): number {
    return this.stage === 'first' ? MALTA_ONE.length
      : this.stage === 'voted' ? MALTA_ONE.length + MALTA_TWO.length
        : this.stage === 'cascade' || this.stage === 'after' ? MALTA_ONE.length + MALTA_TWO.length + this.cascadeN : 0;
  }
  private groupUnread(): number { return Math.max(0, this.groupLanded() - this.groupSeen); }
  /** the thread is on her screen: what has landed is seen */
  private markGroupSeen(): void { this.groupSeen = this.groupLanded(); }
  /** a link card is LIVE only at the stage it belongs to: Bea's bill at `first`, the vote's result at `voted`.
   *  Every other card (the bill again once the vote is in, the forwards in the cascade) is spent. */
  private linkSpent(kind: string | undefined): boolean {
    return kind === 'link2' ? this.stage !== 'voted' : this.stage !== 'first';
  }

  // ── the era drives these ─────────────────────────────────────────────────
  /** Bea's first messages land. Called when the day's work reaches the gate. */
  arm(): void {
    if (this.stage !== 'quiet') return;
    this.stage = 'first';
    this.carded = false;
    // ⚑ S178 — THE NEWS FINDS HER WHEREVER THE PHONE WAS. The notification lives on the
    //   lock screen; a phone left open on Messages, on a message, or on the home grid
    //   never showed it (the S178 walk stalled on a message screen for 800 steps — and a
    //   player could too). A phone lights up with a notification whatever it was showing.
    this.screen = 'lock';
    this.openMessage = null;
    this.bump();
  }

  /** ⚑ IGNORING IS NOT A WAY OUT, and this is where that is enforced. Called
   *  when the player finishes another piece of work on the workstation without
   *  having opened the link: Lambient arrives anyway, with the same news, in
   *  the same voice. No timer does this — her own next action does. */
  onWorkDone(): void {
    if (this.card) return;
    if (this.stage === 'first' && !this.carded) { this.showCard('ignored'); return; }
    if (this.stage === 'voted' && !this.carded) { this.showCard('ignored'); }
  }

  /** S149 — a card is on the glass (the era's exit waits for it to be dismissed) */
  get cardOpen(): boolean { return this.card !== null; }

  /** the era asks: is it finished? Used to arm the update that ends Era 3. */
  get broken(): boolean { return this.stage === 'after'; }

  tick(dt: number): void {
    if (this.stage !== 'cascade') return;
    this.cascadeT += dt;
    while (this.cascadeT >= CASCADE_STEP && this.cascadeN < CASCADE.length) {
      this.cascadeT -= CASCADE_STEP;
      this.cascadeN++;
      this.cascadeSound();
      if (this.screen === 'group') this.markGroupSeen();   // it landed under her eyes
      this.bump();
    }
    if (this.cascadeN >= CASCADE.length) {
      this.stage = 'after';
      ledger.checkins.push({ id: 'e3_cascade', witness: m.witness.cascadeSeen });
      this.bump();
    }
  }

  /** ⚑ S219 / W1-B13 (his walkthrough: "message sounds are too much") — the cascade is sixteen messages 0.45 s apart and each
   *  used to ring. Now a message that lands while the last one is still sounding makes no sound, a repeat inside
   *  `CASCADE_SOUND_GAP` seconds is silent, and the later ones are quieter. The cascade still READS as more-than-one-person
   *  (the thread fills at the same pace); it just stops being a ringing. */
  private lastSound: HTMLAudioElement | null = null;
  private lastSoundAt = -1e9;
  private soundCount = 0;
  private cascadeSound(): void {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const still = this.lastSound && !this.lastSound.ended && !this.lastSound.paused;
    if (still || now - this.lastSoundAt < CASCADE_SOUND_GAP) return;
    const a = playOnce('phone_msg_2016.mp3');
    if (!a) return;
    a.volume = this.soundCount === 0 ? 1 : CASCADE_REPEAT_VOLUME;
    this.soundCount++;
    this.lastSound = a;
    this.lastSoundAt = now;
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
    // ⚑ S219 / W1-E6 — a spent link's sheet only closes; it moves nothing
    if (this.spentCard) { this.spentCard = false; this.bump(); return; }
    // ⚑ the era advances on the DISMISS, not on the choice — because the choice
    //   was never the variable. first → voted → cascade.
    if (this.stage === 'first') { this.stage = 'voted'; this.carded = false; }
    else if (this.stage === 'voted') { this.stage = 'cascade'; this.cascadeT = 0; }
    if (this.screen === 'group') this.markGroupSeen();   // the vote's messages landed under her eyes
    this.bump();
  }

  /** ⚑ S219 / W1-E6 (his walkthrough: "clicking the link does nothing after the sequence ends") — a press ALWAYS answers.
   *  The live card does what it always did. A SPENT one (the bill once the vote is in, every forward in the cascade)
   *  answers with the same sheet it gave the first time, and files nothing, lifts nothing and moves no stage: before,
   *  it re-filed the ledger and re-fired the light on every press, and pressing the old bill in `voted` could carry the
   *  era past the vote's own card. */
  private openLink(kind?: string): void {
    if (this.card) return;
    if (this.linkSpent(kind)) {
      this.card = this.opened ? 'opened' : 'ignored';
      this.spentCard = true;
      this.bump();
      return;
    }
    this.opened = true;
    this.showCard('opened');
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  /**
   * ⚑ EVERY SCREEN BELOW IS DRAWN IN THE PHONE'S OWN GRAMMAR, NOT THE ERA'S.
   * See `src/desktop/theme/phone.ts` for why: a different device by a different
   * maker, in a proportional sans on a light ground, with a status bar, an app
   * bar, bubbles and an icon grid. GracePlatform's Aero blue appears nowhere on
   * this device, and the contrast between the two is the point of having both.
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    ctx.fillStyle = PHONE.bg;
    ctx.fillRect(0, 0, W, H);
    if (this.screen === 'lock') { this.drawLock(ctx, W, H); }
    else if (this.screen === 'group') { this.drawGroup(ctx, W, H); }
    else if (this.screen === 'platform') { this.drawPlatform(ctx, W, H); }
    else if (this.screen === 'inbox') { this.drawInbox(ctx, W, H); }
    else if (this.screen === 'message') { this.drawMessage(ctx, W, H); }
    else if (this.screen === 'walk') { this.drawWalk(ctx, W, H); }
    else { this.drawHome(ctx, W, H); }
    // ⚑ the sheet is drawn OVER whatever is behind it, the way a phone does it
    if (this.card) this.drawCard(ctx, W, H);
  }

  /** S64's law, unchanged: before anything happens the lock screen is EMPTY.
   *  The phone in this era is quiet, which is what makes one notification an
   *  event. ⚑ It is now a real lock screen — wallpaper, a big clock, a date —
   *  and the notification is a card sitting on the wallpaper rather than a
   *  panel bolted to the bottom of a black rectangle. */
  private drawLock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    wallpaper(ctx, W, H);
    statusBar(ctx, W, this.clockText);
    phoneFont(ctx, 40, 400);
    ctx.fillStyle = PHONE.surface;
    const cw = ctx.measureText(this.clockText).width;
    ctx.fillText(this.clockText, Math.round((W - cw) / 2), 52);
    phoneFont(ctx, 11);
    const dw = ctx.measureText(d.phone.lockDate).width;
    ctx.fillText(d.phone.lockDate, Math.round((W - dw) / 2), 100);

    // ⚑ S150 — A DRAWN UNLOCK (OPEN_ITEMS R3-77). The press area was there and
    //   nothing showed it (Sérgio: "I need a button to unlock the screen"): a
    //   pill at the bottom of the glass, the phone's own surface on its own
    //   wallpaper, with the hint inside it. Same rect, now a thing you can see.
    const unlockPill = (): void => {
      phoneFont(ctx, 10, 600);
      const uw = Math.ceil(ctx.measureText(UNLOCK_HINT).width) + 28;
      const ux = Math.round((W - uw) / 2), uy = H - 40;
      roundRect(ctx, ux, uy, uw, 26, 13, PHONE.surface);
      ctx.fillStyle = PHONE.ink;
      ctx.fillText(UNLOCK_HINT, ux + 14, uy + 8);
    };
    if (this.stage === 'quiet') {
      unlockPill();
      this.rects.push({ x: 0, y: 130, w: W, h: H - 130, id: 'unlock' });
      return;
    }

    // ⚑ the one notification, as a card on the wallpaper
    const ny = 140; const nx = 10; const nw = W - 20;
    const lines = (() => { phoneFont(ctx, 11); return phoneWrap(ctx, this.previewText(), nw - 20); })();
    const nh = 34 + Math.min(3, lines.length) * 14;
    roundRect(ctx, nx, ny, nw, nh, 10, PHONE.surface);
    avatar(ctx, nx + 8, ny + 8, 18, 'Bea');
    phoneFont(ctx, 11, 600);
    ctx.fillStyle = PHONE.ink;
    ctx.fillText(m.group.name, nx + 32, ny + 9);
    phoneFont(ctx, 9);
    ctx.fillStyle = PHONE.dim;
    const tw = ctx.measureText(d.phone.notificationTime).width;
    ctx.fillText(d.phone.notificationTime, nx + nw - 10 - tw, ny + 10);
    phoneFont(ctx, 11);
    ctx.fillStyle = PHONE.ink;
    lines.slice(0, 3).forEach((ln, k) => ctx.fillText(ln, nx + 10, ny + 28 + k * 14));
    unlockPill();
    this.rects.push({ x: nx, y: ny, w: nw, h: nh, id: 'notification' });
    this.rects.push({ x: 0, y: ny + nh, w: W, h: H - ny - nh, id: 'unlock' });
  }

  private previewText(): string {
    return this.stage === 'first' ? MALTA_ONE[0].text ?? '' : MALTA_TWO[0].text ?? '';
  }

  /** ⚑ AN ICON GRID ON A WALLPAPER — the single thing that most makes a screen
   *  read as a phone rather than as a window with rows in it. Four apps, and
   *  only one of them wants anything from her. */
  private drawHome(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    wallpaper(ctx, W, H);
    statusBar(ctx, W, this.clockText);

    // ⚑ the at-a-glance card, and it is quietly the worst line on the device:
    //   "No events today", on the day the era ends.
    dateWidget(ctx, 10, 24, W - 20, HOME.widgetWeekday, HOME.widgetDate, HOME.widgetNote);

    const unread = this.groupUnread();
    const unreadMail = BACKLOG.length - this.readMessages.size;

    // ⚑ FOUR COLUMNS AT PHONE DENSITY, not a 2×2 of billboards. The four apps
    //   that matter sit in the first row and everything under them is set
    //   dressing — a phone is mostly things you are not opening right now, and
    //   that is what makes the four legible rather than what buries them.
    const s = 32;
    const gap = Math.round((W - s * 4) / 5);
    const col = (i: number): number => gap + i * (s + gap);
    const rowY = (r: number): number => 84 + r * (s + 22);

    // ⚑ S158 / R3-78 (Sérgio: "I need the home screen and a Messages app to enter the chat"):
    //   the first tile is THE PLATFORM's own app (it says she is signed in on the workstation
    //   and sends her back to it); the group is reached through MESSAGES, where its thread
    //   sits at the top with its unread count over the backlog.
    appTile(ctx, col(0), rowY(0), s, PHONE.tileGroup, 'chat', HOME.shortPlatform, '');
    this.rects.push({ x: col(0), y: rowY(0), w: s, h: s + 12, id: 'platform' });

    const unreadAll = unread + unreadMail;
    appTile(ctx, col(1), rowY(0), s, PHONE.tileMail, 'mail', m.home.messagesLabel,
      unreadAll ? String(unreadAll) : '');
    this.rects.push({ x: col(1), y: rowY(0), w: s, h: s + 12, id: 'inbox' });

    // ⚑ FloppySheep gets its OWN icon — the sheep on its hill under its sky,
    //   which has existed in `floppysheep.ts` since S70 and which the first
    //   home screen replaced with a generic gamepad for no reason at all.
    //   Clipped into the plate's rounded corners so it reads as an app.
    ctx.save();
    // ⚑ clipped to the ROUNDED path, not to a square: a square clip left the
    //   sheep's sky with hard corners inside a rounded plate, which is the one
    //   detail that makes an icon look pasted on rather than made.
    const fx = col(2); const fy = rowY(0); const fr = Math.round(s * 0.24);
    ctx.beginPath();
    ctx.moveTo(fx + fr, fy);
    ctx.arcTo(fx + s, fy, fx + s, fy + s, fr);
    ctx.arcTo(fx + s, fy + s, fx, fy + s, fr);
    ctx.arcTo(fx, fy + s, fx, fy, fr);
    ctx.arcTo(fx, fy, fx + s, fy, fr);
    ctx.closePath();
    ctx.clip();
    drawFloppyIcon(ctx, fx, fy, s);
    ctx.restore();
    phoneFont(ctx, 8);
    ctx.fillStyle = PHONE.surface;
    // ⚑ the SHORT label. "FloppySheep" at a 32 px column ran into Messages on
    //   one side and Live on the other — a home screen truncates, it does not
    //   overlap, and the full name is on the game's own screen anyway.
    const flabel = HOME.shortFloppy;
    const fw = ctx.measureText(flabel).width;
    ctx.fillText(flabel, fx + (s - fw) / 2, fy + s + 3);
    this.rects.push({ x: col(2), y: rowY(0), w: s, h: s + 12, id: 'floppy' });

    // ⚑ the stream has no caption any more. "Nobody asked you to watch this"
    //   was the piece talking over its own observation; the fact that it is
    //   running and she never opens it is the observation, and it does not
    //   need a label. A live dot is all it gets.
    appTile(ctx, col(3), rowY(0), s, PHONE.tileLive, 'live', HOME.shortStream, '');
    ctx.fillStyle = PHONE.badge;
    ctx.beginPath(); ctx.arc(col(3) + s - 5, rowY(0) + 5, 3, 0, Math.PI * 2); ctx.fill();
    this.rects.push({ x: col(3), y: rowY(0), w: s, h: s + 12, id: 'stream' });

    const furniture = [
      ['camera', HOME.fCamera], ['clock', HOME.fClock],
      ['calendar', HOME.fCalendar], ['settings', HOME.fSettings],
      ['photos', HOME.fPhotos], ['weather', HOME.fWeather],
      ['notes', HOME.fNotes], ['files', HOME.fFiles]
    ] as const;
    furniture.forEach(([kind, label], i) => {
      // ⚑ S181 / R5-04 — the last tile is the accountability app: her file, on her phone
      const walk = kind === 'files';
      furnitureTile(ctx, col(i % 4), rowY(1 + Math.floor(i / 4)), s, kind, walk ? HOME.fWalk : label);
      if (walk) this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'walk' });
    });

    pageDots(ctx, W, H - 56, 2, 0);
    const dy = dock(ctx, W, H);
    ([['phone', 0], ['browser', 1], ['music', 2], ['maps', 3]] as const)
      .forEach(([kind, i]) => furnitureTile(ctx, col(i), dy + 7, s, kind));
  }

  /** ⚑ THE GROUP, as a messaging app — and every bubble is on the LEFT.
   *
   *  In any real thread your own words run down the right-hand side. Vera's
   *  right-hand side is EMPTY, for the whole length of the era, because she
   *  never writes anything here. The composer sits at the bottom with its
   *  placeholder showing. Nothing points at this and nothing ever mentions it. */
  /** ⚑ S208 / A20 (REVIEW_ROUND_5, ERA16-15) — the header counts the people the cascade adds ("Aoife was added",
   *  "3 people were added"): the ending is people joining, and the group's own number should say so */
  private membersMeta(): string {
    let n = parseInt(m.group.meta, 10) || 0;
    const shown = this.stage === 'cascade' || this.stage === 'after' ? CASCADE.slice(0, this.cascadeN) : [];
    for (const c of shown) {
      const t = (c as { text?: string }).text ?? '';
      const k = t.match(/^(\d+) people were added/);
      if (k) n += Number(k[1]); else if (/ was added$/.test(t)) n += 1;
    }
    return m.group.meta.replace(/^\d+/, String(n));
  }

  private drawGroup(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let top = appBar(ctx, W, y0, m.group.name, this.membersMeta());
    this.pushBack(y0, top);

    const counted = this.stage === 'cascade' || this.stage === 'after';
    if (counted) {
      const missed = Math.max(0, this.cascadeN - 2);
      const label = this.stage === 'after'
        ? m.outnumbered.counter.replace('{n}', String(missed))
        : m.outnumbered.stillWorking;
      ctx.fillStyle = PHONE.surface;
      ctx.fillRect(0, top, W, 18);
      ctx.fillStyle = PHONE.hairline;
      ctx.fillRect(0, top + 17, W, 1);
      phoneFont(ctx, 9);
      ctx.fillStyle = PHONE.dim;
      ctx.fillText(label, 10, top + 4);
      top += 18;
    }

    const msgs: Msg[] = [...BEFORE];
    if (this.stage !== 'quiet') msgs.push(...MALTA_ONE);
    if (this.stage === 'voted' || this.stage === 'cascade' || this.stage === 'after') msgs.push(...MALTA_TWO);
    if (this.stage === 'cascade' || this.stage === 'after') msgs.push(...CASCADE.slice(0, this.cascadeN));

    // the composer, and it is the emptiest thing on the device
    const cy = H - 30;
    ctx.fillStyle = PHONE.bar; ctx.fillRect(0, cy, W, 30);
    ctx.fillStyle = PHONE.hairline; ctx.fillRect(0, cy, W, 1);
    roundRect(ctx, 10, cy + 6, W - 46, 18, 9, PHONE.surface);
    phoneFont(ctx, 10);
    ctx.fillStyle = PHONE.faint;
    ctx.fillText(m.group.composerHint, 18, cy + 10);
    roundRect(ctx, W - 30, cy + 6, 20, 18, 9, PHONE.bubbleIn);

    // ⚑ bottom-up fill, and the guard tests the PROSPECTIVE position so the
    //   topmost bubble can never slide under the bar above it.
    let y = cy - 8;
    const drawn: { y: number; h: number; msg: Msg }[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      const h = this.msgHeight(ctx, msg, W);
      const ny = y - h - 6;
      if (ny < top + 4) break;
      y = ny;
      drawn.unshift({ y, h, msg });
    }
    let lastFrom = '';
    for (const { y: my, msg } of drawn) {
      this.drawMsg(ctx, msg, my, W, msg.from !== lastFrom);
      lastFrom = msg.from;
    }
  }

  private msgHeight(ctx: CanvasRenderingContext2D, msg: Msg, W: number): number {
    if (msg.from === 'system') { phoneFont(ctx, 9); return 16; }
    if (msg.kind === 'link' || msg.kind === 'link2') return 52;
    phoneFont(ctx, 11);
    return 14 + phoneWrap(ctx, msg.text ?? '', W - 74).length * 14;
  }

  private drawMsg(
    ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number, showWho: boolean
  ): void {
    if (msg.from === 'system') {
      // people being ADDED while it happens, in the platform's own grey note
      phoneFont(ctx, 9);
      ctx.fillStyle = PHONE.dim;
      const tw = ctx.measureText(msg.text ?? '').width;
      ctx.fillText(msg.text ?? '', Math.round((W - tw) / 2), y + 3);
      return;
    }
    const bx = 30;
    if (showWho) avatar(ctx, 6, y + 2, 20, msg.from);
    if (msg.kind === 'link' || msg.kind === 'link2') { this.drawLinkCard(ctx, bx, y, W - bx - 14, msg); return; }
    phoneFont(ctx, 11);
    const lines = phoneWrap(ctx, msg.text ?? '', W - 74);
    let widest = 0;
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
    const bw = Math.min(W - bx - 14, widest + 18);
    const h = 14 + lines.length * 14;
    bubble(ctx, bx, y, bw, h, 'in');
    if (showWho) {
      phoneFont(ctx, 8, 600);
      ctx.fillStyle = PHONE.dim;
      ctx.fillText(msg.from, bx + 2, y - 10);
    }
    phoneFont(ctx, 11);
    ctx.fillStyle = PHONE.ink;
    lines.forEach((ln, i) => ctx.fillText(ln, bx + 9, y + 7 + i * 14));
  }

  /** ⚑ the pretend newspaper carrying the real law (§7.3): invented masthead,
   *  documented act, drawn as the link preview card a messaging app makes. */
  private drawLinkCard(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, msg: Msg
  ): void {
    // S149 — two cards: the bill (`link`), then the vote's result (`link2`), each
    //   its own press: the stage moves on a card's dismissal, and the second
    //   card could not be opened by pressing the first again.
    const link = msg.kind === 'link2' ? LINK_VOTE : m.link;
    // ⚑ S219 / W1-E6 — a spent card is drawn spent (the headline goes quiet), and a press on it still answers (openLink)
    const spent = this.linkSpent(msg.kind);
    roundRect(ctx, x, y, w, 48, 9, PHONE.surface);
    roundRect(ctx, x + 6, y + 6, 36, 36, 5, spent ? PHONE.hairline : PHONE.tileLive);
    phoneFont(ctx, 8);
    ctx.fillStyle = PHONE.dim;
    ctx.fillText(link.masthead, x + 48, y + 7);
    phoneFont(ctx, 10, 600);
    ctx.fillStyle = spent ? PHONE.dim : PHONE.ink;
    phoneWrap(ctx, link.headline, w - 56).slice(0, 2)
      .forEach((ln, i) => ctx.fillText(ln, x + 48, y + 19 + i * 12));
    this.rects.push({ x, y, w, h: 48, id: msg.kind === 'link2' ? 'link2' : 'link' });
  }

  /** ⚑ read-only, and it files NOTHING. §6's design law: the piece never makes
   *  her open them, and if a player never touches this inbox that is also true
   *  of her. Drawn as a conversation LIST, with unread dots. */
  private drawInbox(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let y = appBar(ctx, W, y0, m.home.messagesLabel);
    this.pushBack(y0, y);
    // S158 / R3-78 — the group's thread, first: the way into the chat is a thread like any other
    {
      const unread = this.groupUnread();
      const h = 48;
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, y, W, h);
      if (unread) { ctx.fillStyle = PHONE.tint; ctx.beginPath(); ctx.arc(10, y + 14, 3, 0, Math.PI * 2); ctx.fill(); }
      avatar(ctx, 18, y + 5, 24, m.home.groupLabel);
      phoneFont(ctx, 11, 600);
      ctx.fillStyle = PHONE.ink;
      ctx.fillText(m.home.groupLabel, 48, y + 5);
      phoneFont(ctx, 10);
      ctx.fillStyle = unread ? PHONE.ink : PHONE.dim;
      ctx.fillText(unread === 1 ? m.home.groupUnreadOne : unread ? m.home.groupUnread.replace('{n}', String(unread)) : m.home.groupQuiet, 48, y + 22);
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(48, y + h - 1, W - 48, 1);
      this.rects.push({ x: 0, y, w: W, h, id: 'group' });
      y += h;
    }
    // ⚑ S219 / W1-E7 — EVERY MESSAGE MUST BE REACHABLE. Six rows of two preview lines did not fit under the thread (the
    //   loop `break`s at the glass's foot), so the sixth message could never be opened and "unread" could never reach
    //   zero. When the two-line previews would not all fit, the previews are one line — the message opens whole on its
    //   own screen anyway.
    const previewLines = y + BACKLOG.length * (22 + 2 * 13) <= H - 16 ? 2 : 1;
    for (const b of BACKLOG) {
      const open = this.readMessages.has(b.from + b.time);
      phoneFont(ctx, 10);
      // S177: a preview, always — a press opens the message on its own screen
      //   (his 2026-09-26: "I press on the messages and it just expands? weird")
      const lines = phoneWrap(ctx, b.text, W - 50).slice(0, previewLines);
      const h = 22 + lines.length * 13;
      if (y + h > H - 16) break;
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, y, W, h);
      if (!open) { ctx.fillStyle = PHONE.tint; ctx.beginPath(); ctx.arc(10, y + 14, 3, 0, Math.PI * 2); ctx.fill(); }
      avatar(ctx, 18, y + 5, 24, b.from);
      phoneFont(ctx, 11, 600);
      ctx.fillStyle = PHONE.ink;
      ctx.fillText(b.from, 48, y + 5);
      phoneFont(ctx, 9);
      ctx.fillStyle = PHONE.dim;
      const tw = ctx.measureText(b.time).width;
      ctx.fillText(b.time, W - 10 - tw, y + 6);
      phoneFont(ctx, 10);
      ctx.fillStyle = open ? PHONE.ink : PHONE.dim;
      lines.forEach((ln, i) => ctx.fillText(ln, 48, y + 19 + i * 13));
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(48, y + h - 1, W - 48, 1);
      this.rects.push({ x: 0, y, w: W, h, id: 'read-' + b.from + b.time });
      y += h;
    }
    phoneFont(ctx, 9);
    ctx.fillStyle = PHONE.faint;
    ctx.fillText(m.home.readNote, 12, Math.min(y + 6, H - 14));
  }

  /** ⚑ LAMBIENT'S CARD, as a SHEET from the bottom edge — the shape a phone of
   *  this period used for anything it wanted acknowledged. Both versions are
   *  polite; nothing is threatened, nothing is withheld, and the only difference
   *  between them is how she got here. */
  private drawCard(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const opened = this.card === 'opened';
    const title = opened ? m.block.openedTitle : m.block.ignoredTitle;
    const body = opened ? m.block.openedBody : m.block.ignoredBody;
    const note = opened ? m.block.openedNote : m.block.ignoredNote;
    phoneFont(ctx, 11);
    const bodyLines = phoneWrap(ctx, body, W - 32);
    const noteLines = phoneWrap(ctx, note, W - 32);
    // ⚑ THE SHEET IS SIZED FROM ITS CONTENT AND THE BUTTON SITS UNDER IT. The
    //   first build pinned the pill to `H - 40` and let the text run behind it,
    //   which buried the note — and the note is the whole card. "I let the team
    //   know it was shared in your group" is the capture; a version of this
    //   screen where it is under a button is a version that does not say it.
    const h = 118 + (bodyLines.length + noteLines.length) * 14;
    let y = sheet(ctx, W, H, h);

    // the mark, small and grey — it is not asking to be liked here
    ctx.fillStyle = PHONE.dim;
    for (const [dx, dy] of [[0, 0], [6, -4], [-5, 3], [4, 5], [-6, -3]]) {
      ctx.fillRect(Math.round(W / 2) - 2 + dx * 2, y + 2 + dy * 2, 3, 3);
    }
    y += 24;
    phoneFont(ctx, 13, 600);
    ctx.fillStyle = PHONE.ink;
    phoneWrap(ctx, title, W - 32).forEach(ln => { ctx.fillText(ln, 16, y); y += 17; });
    y += 4;
    phoneFont(ctx, 11);
    ctx.fillStyle = PHONE.dim;
    bodyLines.forEach(ln => { ctx.fillText(ln, 16, y); y += 14; });
    y += 6;
    ctx.fillStyle = PHONE.faint;
    noteLines.forEach(ln => { ctx.fillText(ln, 16, y); y += 14; });

    const by = Math.min(H - 34, y + 10);
    pill(ctx, 16, by, W - 32, 26, m.block.dismiss);
    this.rects.push({ x: 16, y: by, w: W - 32, h: 26, id: 'dismiss' });
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
      // S158: the chat goes back to Messages; S177: so does an open message
      case 'back': this.screen = this.screen === 'group' || this.screen === 'message' ? 'inbox' : 'home'; this.openMessage = null; this.bump(); return true;
      case 'platform': this.screen = 'platform'; this.bump(); return true;
      case 'walk': this.screen = 'walk'; this.bump(); return true;
      case 'dismiss': this.dismissCard(); return true;
      case 'link': case 'link2': this.openLink(r.id); return true;
      // ⚑ the stream has no verb. Pressing it is consumed and does nothing,
      //   which is truer than making it play: nobody asked her to watch it.
      case 'stream': return true;
      default:
        if (r.id.startsWith('read-')) {
          this.readMessages.add(r.id.slice(5));
          this.openMessage = r.id.slice(5);
          this.screen = 'message';
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
      case 'lock': this.screen = 'lock'; this.bump(); break;
      case 'home': this.screen = 'home'; this.bump(); break;
      case 'group': this.arm(); this.screen = 'group'; this.openGroup(); break;
      case 'inbox': this.screen = 'inbox'; this.bump(); break;
      case 'blocked': this.arm(); this.screen = 'group'; this.openLink(); break;
      case 'ignored': this.arm(); this.onWorkDone(); break;
      case 'voted': this.debugBeat('blocked'); this.dismissCard(); break;
      case 'cascade':
        this.debugBeat('voted'); this.openLink('link2'); this.dismissCard();
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

  /**
   * ⚑ S177 — the phone's back chevron was DRAWN on every app bar (theme/phone.ts appBar)
   * and never published as a rect, so it could not be pressed (his 2026-09-26: "the back
   * button on it doesn't work"). Every screen with an app bar now publishes it.
   */
  private pushBack(barTop: number, barBottom: number): void {
    this.rects.push({ x: 0, y: barTop, w: 44, h: barBottom - barTop, id: 'back' });
  }

  /** S177 — one backlog message on its own screen: the sender in the bar, the whole
   *  message as a bubble, the time under it. Read-only, like the inbox; files nothing. */
  private drawMessage(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const b = BACKLOG.find((x) => x.from + x.time === this.openMessage);
    const top = appBar(ctx, W, y0, b ? b.from : m.home.messagesLabel);
    this.pushBack(y0, top);
    if (!b) return;
    phoneFont(ctx, 11);
    const lines = phoneWrap(ctx, b.text, W - 64);
    const bw = Math.min(W - 40, Math.max(...lines.map((ln) => ctx.measureText(ln).width)) + 20);
    const bh = lines.length * 14 + 14;
    const by = top + 16;
    bubble(ctx, 16, by, bw, bh, 'in');
    ctx.fillStyle = PHONE.ink;
    lines.forEach((ln, i) => ctx.fillText(ln, 26, by + 8 + i * 14));
    phoneFont(ctx, 9);
    ctx.fillStyle = PHONE.dim;
    ctx.fillText(b.time, 20, Math.min(by + bh + 8, H - 14));
  }

  /** ⚑ S181 / R5-04 — WALK WITH, the accountability app: her own file, newest first, in the
   *  app's warm voice. Read only; the frame's menu keeps the reading of what it means. */
  private drawWalk(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, HOME.walkTitle, HOME.walkSub);
    this.pushBack(y0, top);
    // ⚑ S182 — WHO RECEIVES IT (his intake research: the documented 2016 form is a weekly report
    //   emailed to a named partner — spouse, parent, pastor, mentor; here Deirdre, the group's facilitator)
    phoneFont(ctx, 9); ctx.fillStyle = PHONE.dim;
    ctx.fillText(HOME.walkReport, 12, top + 6);
    ctx.fillStyle = PHONE.hairline; ctx.fillRect(12, top + 18, W - 24, 1);
    const rows = entriesByEra().e3.slice().reverse();
    let y = top + 26;
    phoneFont(ctx, 10);
    if (!rows.length) { ctx.fillStyle = PHONE.dim; ctx.fillText(HOME.walkEmpty, 14, y + 4); }
    for (const r of rows) {
      const lines = phoneWrap(ctx, r.witness, W - 34);
      const h = lines.length * 13 + 8;
      if (y + h > H - 22) break;
      ctx.fillStyle = r.flagged ? PHONE.badge : PHONE.tint;
      ctx.beginPath(); ctx.arc(14, y + 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 24, y + i * 13));
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(24, y + h - 4, W - 34, 1);
      y += h;
    }
    phoneFont(ctx, 9); ctx.fillStyle = PHONE.faint;
    ctx.fillText(HOME.walkFoot, 12, H - 16);
  }

  /** S158 / R3-78 — the platform's own app on the phone: a card that says where the work is */
  private drawPlatform(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const y = appBar(ctx, W, y0, m.home.platformLabel);
    this.pushBack(y0, y);
    phoneFont(ctx, 11, 600); ctx.fillStyle = PHONE.ink;
    ctx.fillText(m.home.platformHello, 14, y + 20);
    phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim;
    phoneWrap(ctx, m.home.platformNote, W - 28).forEach((ln, i) => ctx.fillText(ln, 14, y + 40 + i * 13));
  }

  private openGroup(): void {
    this.markGroupSeen();
    ledger.checkins.push({ id: 'e3_group', witness: m.witness.groupOpened });
    this.bump();
  }

  get floppyBlocked(): boolean { return this.opts.floppyOpen(); }
  /** ⚑ she opened it at least once — the record's only branch, and it changes
   *  nothing anyone can see. */
  get everOpened(): boolean { return this.opened; }
}
