import mirrorCopy from '../../../data/strings/e3_mirror.json';
/** One private, memory-only phone shared by the stand, held view and desktop mirror.
 * Work beats deliver authored banners. Reading never files, sends or replies;
 * the kit drives the news sequence even when the visitor never opens the phone.
 * Everything here is felt. The platform cannot inspect message contents.
 */

import {
  PHONE, phoneFont, phoneWrap, roundRect, statusBar, appBar, bubble, avatar,
  appTile, wallpaper, furnitureTile, dock, pageDots, dateWidget
} from '../theme/phone';
import { makeE3PhotoSprites } from './e3PhoneSprites';
import { drawFloppyIcon } from './floppysheep';
import { veraDay } from '../../state/veraDay';
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
const LINK_VOTE = m.linkVote as { masthead: string; headline: string };   // S227 / M1: the never-drawn standfirst and tapHint are gone
const BACKLOG = m.backlog as { from: string; time: string; text: string; register?: string; stampCard?: string; thread?: { time: string; text: string }[] }[];
const UNLOCK_HINT = (m.home as unknown as Record<string, string>).unlockHint;
const HOME = m.home as unknown as Record<string, string>;

/** ⚑ how far the era has got. `quiet` is the phone S64 built — a lock screen
 *  with one game on it and no notifications at all, which is what makes ONE
 *  arriving an event. Every step after that is player-initiated except the
 *  cascade, which is other people. */
type Stage = 'quiet' | 'first' | 'voted' | 'cascade' | 'after';
type Screen = 'lock' | 'home' | 'group' | 'inbox' | 'platform' | 'message' | 'walk' | 'personal' | 'notes' | 'photos' | 'photo' | 'evening' | 'article';
/** Lambient's card, and it is the same card whichever way she got here */

/** the cascade's own clock. Messages land ~0.45 s apart — fast enough to read
 *  as more-than-one-person, slow enough that a player can watch names arrive.
 *  ⚑ This is the ONE clocked beat in this module and it bumps only the phone's
 *  version, so it never re-uploads the workstation panel beside it. */
// ⚑ S288 (headset B: "This needs to be a little bit slower because I couldn't read what it was") — 0.45 → 0.9 s a message:
//   still a flood, now one you can read
const CASCADE_STEP = 0.9;
/** ⚑ S219 / W1-B13 — at most one message sound per this many seconds, the repeats at a fraction of the first */
const CASCADE_SOUND_GAP = 1.5;
const CASCADE_REPEAT_VOLUME = 0.4;

export class PhoneE3 {
  version = 0;
  private screen: Screen = 'lock';
  private stage: Stage = 'quiet';
  /** how many cascade messages have landed */
  private cascadeN = 0;
  private cascadeT = 0;
  /** she opened the link at least once — the record's only branch */
  private opened = false;
  /** the block has been shown for the current stage */
  private readMessages = new Set<string>();
  /** ⚑ S219 / W1-E4·E7 — how many of the group's messages she has SEEN. The badge and the thread's "N new messages" were
   *  computed from the stage alone, so they never fell: opening the thread left "4 new messages", and the cascade's
   *  sixteen stayed counted on the home grid for good. Unread is what has landed and has not yet been on her screen. */
  private groupSeen = 0;
  /** ⚑ S219 / W1-E6 — the card on the glass is a SPENT link being answered, not the stage's own beat: it closes and
   *  moves nothing (no ledger, no lift, no stage) */
  /** ⚑ S227 / M2·M7 (his 2026-10-10: "two sheets, the second shortened") — how many sheets this run has put on the
   *  glass, and whether the one up now is a later one: only the first shows its body; every later one is the title and
   *  the note alone. The ledger lines are untouched. */
  /** S177 — the backlog message open on its own screen (`from + time`), or null */
  private openMessage: string | null = null;
  private rects: Rect[] = [];
  private inboxPage = 0;
  private personalArmed = false;
  get personalSeen(): boolean { return this.readMessages.has('personal'); }
  get personalOpen(): boolean { return this.screen === 'personal'; }
  armPersonal(): void { if (!this.personalArmed) { this.personalArmed = true; this.bump(); } }
  openPersonalThread(): void {
    this.readMessages.add('personal'); veraDay.personalMessageSeen = true;
    this.screen = 'personal'; this.bump();
  }
  closePersonalThread(): void { if (this.personalOpen) { this.screen = 'inbox'; this.bump(); } }
  /** Same phone-owned content on either surface; never installs phone hit rects on the desktop. */
  drawThreadView(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y = appBar(ctx, W, statusBar(ctx, W, this.clockText), m.personalMessage.from);
    phoneFont(ctx, 12); ctx.fillStyle = PHONE.ink;
    let by = y + 18;
    for (const text of m.personalMessage.thread) {
      const lines = phoneWrap(ctx, text, W - 40);
      bubble(ctx, 10, by, W - 20, lines.length * 17 + 20, 'in');
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 20, by + 10 + i * 17));
      by += lines.length * 17 + 30;
    }
  }

  /** S158 / R3-66: the phone's clock is the workstation's — one clock for the room */
  constructor(private readonly opts: { onLift(): void; floppyOpen(): boolean; clock?: () => string }) {}
  private get clockText(): string { return this.storyClock; }

  private evening: typeof mirrorCopy.events = [];
  private eventQueue: typeof mirrorCopy.events = [];
  private bannerAge = 3;
  private articleVote = false;
  advanceNews(): void {
    if (this.stage === 'quiet') this.arm();
    if (this.stage === 'after' || this.stage === 'cascade') return;
    veraDay.phoneAnswered = true; veraDay.voted = true;
    this.stage = 'cascade'; this.cascadeT = -4;
    this.banner = { from: MALTA_ONE[0].from, time: this.clockText, text: LINK_VOTE.headline };
    this.bump();
  }
  private notesT = -1;
  private notesDone = false;
  get conductingNotes(): boolean { return this.notesT >= 0; }
  conductNotes(): void {
    if (this.notesDone) return;
    this.notesDone = true; this.notesT = 0; this.screen = 'notes'; this.bump();
  }
  private eveningFrom = '';
  private storyClock = '18:04';
  private banner: { from: string; time: string; text: string } | null = null;
  bannersHidden = false;
  arrive(id: string): void {
    const e = mirrorCopy.events.find(e => e.id === id);
    if (!e || [...this.evening, ...this.eventQueue].some(a => a.id === id) || this.disconnected) return;
    this.eventQueue.push(e); this.deliverEvent();
    if (id === 'arrival') this.arrive('stamp');
  }
  private deliverEvent(): void {
    if (!this.eventQueue.length || this.bannerAge < 3 || this.bannersHidden) return;
    const e = this.eventQueue.shift()!;
    this.evening.push(e); this.storyClock = e.time; this.banner = e; this.bannerAge = 0;
    playOnce('phone_ping_2016.mp3'); this.bump();
  }

  private newsBanner(messages: Msg[]): void {
    const e = messages[messages.length - 1];
    if (e) this.banner = { from: e.from, time: e.time, text: e.text ?? (e.kind === 'link2' ? LINK_VOTE.headline : e.kind === 'link' ? m.link.headline : '') };
    this.bump();
  }
  get eveningClock(): string { return this.storyClock; }
  disconnected = false;
  disconnect(): void { this.disconnected = true; this.evening = []; this.eventQueue = []; this.readMessages.clear(); this.banner = null; this.openMessage = null; this.notesT = -1; this.screen = 'lock'; this.bump(); }
  get hitRects(): Rect[] { return this.rects; }
  get unreadCount(): number { return BACKLOG.filter(b => !this.readMessages.has(b.from + b.time)).length + this.groupUnread() + this.evening.filter(e => e.from !== m.group.name && !this.readMessages.has('evening:' + e.id)).length; }
  private bump(): void { this.version++; }
  get quietReading(): boolean { return this.screen === 'article' || this.screen === 'evening' || this.screen === 'photos' || this.screen === 'photo' || this.screen === 'notes' || this.personalOpen || this.screen === 'message' || this.screen === 'inbox'; }
  presentInbox(): void { this.screen = 'inbox'; this.openMessage = null; this.bump(); }


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
    this.stage = 'first'; this.banner = { from: MALTA_ONE[0].from, time: this.clockText, text: m.link.headline };
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
  onWorkDone(): void { /* Private phone reading is never reported to work. */ }

  /** S149 — a card is on the glass (the era's exit waits for it to be dismissed) */
  get cardOpen(): boolean { return false; }

  /** the era asks: is it finished? Used to arm the update that ends Era 3. */
  get broken(): boolean { return this.stage === 'after'; }

  tick(dt: number, visible = true): void {
    if (!this.bannersHidden) { this.bannerAge += dt; this.deliverEvent(); }
    if (this.notesT >= 0) {
      const old = Math.floor(this.notesT * 2); this.notesT += dt;
      if (this.notesT >= 3) { this.notesT = -1; this.screen = 'home'; this.bump(); }
      else if (old !== Math.floor(this.notesT * 2)) this.bump();
    }
    if (!visible || this.eventQueue.length || this.bannerAge < 3 || this.stage !== 'cascade') return;
    this.cascadeT += dt;
    while (this.cascadeT >= CASCADE_STEP && this.cascadeN < CASCADE.length) {
      this.cascadeT -= CASCADE_STEP;
      this.cascadeN++; this.newsBanner(CASCADE.slice(0, this.cascadeN));
      this.cascadeSound();
      if (this.screen === 'group') this.markGroupSeen();   // it landed under her eyes
      this.bump();
    }
    if (this.cascadeN >= CASCADE.length) {
      this.stage = 'after';
      veraDay.cascadeSeen = true;
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
  /** ⚑ S227 — the phone has moved past Bea's first card (the board may offer an update again; see graceQueueLite) */
  get pastFirst(): boolean { return this.stage === 'voted' || this.stage === 'cascade' || this.stage === 'after'; }

  /** ⚑ S219 / W1-E6 (his walkthrough: "clicking the link does nothing after the sequence ends") — a press ALWAYS answers.
   *  The live card does what it always did. A SPENT one (the bill once the vote is in, every forward in the cascade)
   *  answers with the same sheet it gave the first time, and files nothing, lifts nothing and moves no stage: before,
   *  it re-filed the ledger and re-fired the light on every press, and pressing the old bill in `voted` could carry the
   *  era past the vote's own card. */
  private openLink(kind?: string): void {
    this.opened = true; this.articleVote = kind === 'link2'; this.screen = 'article'; this.bump();
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
    if (this.disconnected) { ctx.fillStyle = PHONE.ink; ctx.fillRect(0, 0, W, H); return; }
    ctx.fillStyle = PHONE.bg;
    ctx.fillRect(0, 0, W, H);
    const bannerH = this.banner && !this.bannersHidden && !this.conductingNotes
      ? this.bannerHeight(W) : 0;
    const bodyH = H - bannerH;
    ctx.save(); ctx.beginPath(); ctx.rect(0, bannerH, W, bodyH); ctx.clip(); ctx.translate(0, bannerH);
    if (this.screen === 'article') {
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, bodyH);
      phoneFont(ctx, 12, 600); ctx.fillStyle = PHONE.ink;
      const link = this.articleVote ? LINK_VOTE : m.link;
      ctx.fillText(link.masthead, 10, 25);
      phoneWrap(ctx, link.headline, W - 20).forEach((line, i) => ctx.fillText(line, 10, 60 + i * 18));
    }
    else if (this.screen === 'evening') { this.drawEvening(ctx, W, bodyH); }
    else if (this.screen === 'personal') { this.drawThreadView(ctx, W, bodyH); this.pushBack(20, 62); }
    else if (this.screen === 'lock') { this.drawLock(ctx, W, bodyH); }
    else if (this.screen === 'photos' || this.screen === 'photo') { this.drawPhotos(ctx, W, bodyH); }
    else if (this.screen === 'notes') { this.drawNotes(ctx, W, bodyH); }
    else if (this.screen === 'group') { this.drawGroup(ctx, W, bodyH); }
    else if (this.screen === 'platform') { this.drawPlatform(ctx, W, bodyH); }
    else if (this.screen === 'inbox') { this.drawInbox(ctx, W, bodyH); }
    else if (this.screen === 'message') { this.drawMessage(ctx, W, bodyH); }
    else if (this.screen === 'walk') { this.drawWalk(ctx, W, bodyH); }
    else { this.drawHome(ctx, W, bodyH); }
    ctx.restore();
    this.rects = this.rects.map(r => ({ ...r, y: r.y + bannerH }));
    // ⚑ S281 — THE GLOW LOGIC on her phone (his 1 Nov: "FloppySheep and the message app should slightly glow
    //   differently so we can understand where we need to go"): the warm ring on the one thing the phone is waiting
    //   on, the pale shimmer on the game that is only ever hers to open. Drawn with the screen (no animation).
    // ⚑ the sheet is drawn OVER whatever is behind it, the way a phone does it
    if (!this.conductingNotes) this.drawBanner(ctx, W);
    if (this.screen !== 'home' && this.screen !== 'lock' && !this.conductingNotes) {
      this.rects = this.rects.filter(r => r.id !== 'back');
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, H - 50, 48, 24);
      phoneFont(ctx, 12); ctx.fillStyle = PHONE.tint; ctx.fillText('‹', 16, H - 45);
      this.rects.unshift({ x: 0, y: H - 50, w: 48, h: 24, id: 'back' });
    }
    if (this.screen === 'personal' || this.screen === 'message' || this.screen === 'group' || this.screen === 'evening') {
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, H - 26, W, 26);
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(mirrorCopy.reply, 12, H - 18);
    }
  }

  /** S281 — what the phone is waiting on, screen by screen: the notification, then Messages, then the group, then the
   *  live link. Nothing once the group's news is all seen and the link is spent. */

  private openEvening(from: string): void {
    this.eveningFrom = from; this.screen = from === m.group.name ? 'group' : 'evening';
    for (const e of this.evening.filter(e => e.from === from)) this.readMessages.add('evening:' + e.id);
    if (from === m.personalMessage.from) { this.readMessages.add('personal'); veraDay.personalMessageSeen = true; }
    if (this.screen === 'group') this.markGroupSeen();
    this.bump();
  }
  private drawEvening(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const y0 = statusBar(ctx, W, this.clockText);
    let y = appBar(ctx, W, y0, this.eveningFrom) + 12;
    for (const e of this.evening.filter(e => e.from === this.eveningFrom && (this.bannersHidden || e !== this.banner))) {
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.ink;
      for (const line of phoneWrap(ctx, e.text, W - 24)) { ctx.fillText(line, 12, y); y += 15; }
      if (e.photo) { this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], 12, y, 120, 120); y += 130; }
      y += 18;
    }
    this.pushBack(y0, y0 + 40);
    ctx.fillStyle = PHONE.dim; phoneFont(ctx, 10); ctx.fillText(mirrorCopy.reply, 12, H - 18);
  }
  private get bannerPhoto(): boolean { return this.evening.some(e => e === this.banner && e.photo === true); }
  private bannerHeight(W: number): number {
    const c = document.createElement('canvas').getContext('2d')!; phoneFont(c, 11);
    return 52 + phoneWrap(c, this.banner?.text ?? '', W - 20).length * 14 + (this.bannerPhoto ? 76 : 0);
  }
  private drawBanner(ctx: CanvasRenderingContext2D, W: number): void {
    if (!this.banner || this.bannersHidden) return;
    phoneFont(ctx, 11);
    const lines = phoneWrap(ctx, this.banner.text, W - 20), h = 31 + lines.length * 14;
    ctx.fillStyle = PHONE.bubbleIn; ctx.fillRect(2, 21, W - 4, h);
    ctx.fillStyle = PHONE.ink; phoneFont(ctx, 11, 600); ctx.fillText(this.banner.from, 10, 28);
    phoneFont(ctx, 9); ctx.fillText(this.storyClock, W - 36, 28);
    phoneFont(ctx, 11); lines.forEach((line, i) => ctx.fillText(line, 10, 46 + i * 14));
    if (this.bannerPhoto) {
      this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], 10, 21 + h, 72, 72);
    }

    this.rects.unshift({ x: 2, y: 21, w: W - 4, h, id: 'evening-banner' });
  }

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
      if (this.evening.some(e => e.id === 'arrival') && this.banner?.from !== 'Orla') {
        const text = mirrorCopy.events[0].text;
        phoneFont(ctx, 11); const lines = phoneWrap(ctx, text, W - 40);
        roundRect(ctx, 10, 125, W - 20, 30 + lines.length * 14, 8, PHONE.surface);
        ctx.fillStyle = PHONE.ink; ctx.fillText(m.personalMessage.from, 20, 132);
        lines.forEach((line, i) => ctx.fillText(line, 20, 152 + i * 14));
      }
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
  private photoSprites: HTMLCanvasElement[] | null = null;
  private photoIndex = 0;
  private photoPage = 0;
  private drawPhotos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText);
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, HOME.fPhotos); this.pushBack(y0, top);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (this.screen === 'photo') {
      const size = Math.max(20, Math.min(144, H - top - 70)), x = Math.round((W - size) / 2), y = top + 20;
      ctx.drawImage(this.photoSprites[this.photoIndex], x, y, size, size);
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim;
      ctx.fillText(m.cameraRoll.dates[this.photoIndex], Math.max(52, x), y + size + 12);
    } else {
      const sprites = this.photoSprites.slice(0, this.evening.some(e => e.id === 'after') ? 5 : 4);
      const perPage = H < 260 ? 2 : 4, pages = Math.ceil(sprites.length / perPage);
      this.photoPage = Math.min(this.photoPage, pages - 1);
      sprites.slice(this.photoPage * perPage, (this.photoPage + 1) * perPage).forEach((sprite, n) => {
        const i = this.photoPage * perPage + n;
        const size = Math.max(20, Math.min(H < 300 ? 56 : 72, H - top - 76));
        const x = 12 + (n % 2) * 84, y = top + 12 + Math.floor(n / 2) * (size + 18);
        ctx.drawImage(sprite, x, y, size, size);
        phoneFont(ctx, 9); ctx.fillStyle = PHONE.dim; ctx.fillText(m.cameraRoll.dates[i], x, y + size + 5);
        this.rects.push({ x, y, w: size, h: size + 14, id: 'photo-' + i });
      });
      phoneFont(ctx, 12); ctx.fillStyle = PHONE.tint;
      if (this.photoPage > 0) { ctx.fillText(m.home.previousPage, 62, H - 22); this.rects.push({ x: 50, y: H - 32, w: 50, h: 30, id: 'photos-prev' }); }
      if (this.photoPage < pages - 1) { ctx.fillText(m.home.nextPage, W - 24, H - 22); this.rects.push({ x: W - 50, y: H - 32, w: 50, h: 30, id: 'photos-next' }); }
    }
    ctx.restore();
  }

  private drawNotes(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let y = appBar(ctx, W, y0, HOME.fNotes);
    this.pushBack(y0, y);
    for (const entry of (this.conductingNotes ? m.notes.entries.slice(0, 1) : m.notes.entries)) {
      y += 12;
      if ('title' in entry) {
        phoneFont(ctx, 12, 600); ctx.fillStyle = PHONE.ink;
        ctx.fillText(entry.title ?? '', 12, y); y += 21;
      }
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.ink;
      for (const line of phoneWrap(ctx, entry.text, W - 24)) { ctx.fillText(line, 12, y); y += 16; }
      if (this.conductingNotes && Math.floor(this.notesT * 2) % 2 === 0) {
        const last = phoneWrap(ctx, entry.text, W - 24).slice(-1)[0];
        ctx.fillStyle = PHONE.ink; ctx.fillRect(12 + Math.ceil(ctx.measureText(last).width), y - 16, 1, 13);
      }
      y += 12; ctx.fillStyle = PHONE.hairline; ctx.fillRect(12, y, W - 24, 1);
    }
  }

  private drawHome(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    wallpaper(ctx, W, H);
    statusBar(ctx, W, this.clockText);

    // ⚑ the at-a-glance card, and it is quietly the worst line on the device:
    //   "No events today", on the day the era ends.
    if (H >= 300) dateWidget(ctx, 10, 24, W - 20, HOME.widgetWeekday, HOME.widgetDate, HOME.widgetNote);

    const unread = this.groupUnread();
    const unreadMail = BACKLOG.filter(b => !this.readMessages.has(b.from + b.time)).length;

    // ⚑ FOUR COLUMNS AT PHONE DENSITY, not a 2×2 of billboards. The four apps
    //   that matter sit in the first row and everything under them is set
    //   dressing — a phone is mostly things you are not opening right now, and
    //   that is what makes the four legible rather than what buries them.
    const s = 32;
    const gap = Math.round((W - s * 4) / 5);
    const col = (i: number): number => gap + i * (s + gap);
    const rowY = (r: number): number => (H >= 300 ? 84 : 32) + r * (s + 22);

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
      if (kind === 'photos') this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'photos' });
      if (kind === 'notes') this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'notes' });
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

    const msgs: Msg[] = [...BEFORE, ...this.evening.filter(e => e.from === m.group.name).map(e => ({ from: e.from, time: e.time, text: e.text }))];
    if (this.stage !== 'quiet') msgs.push(...MALTA_ONE);
    if (this.stage === 'voted' || this.stage === 'cascade' || this.stage === 'after') msgs.push(...MALTA_TWO);
    if (this.stage === 'cascade' || this.stage === 'after') msgs.push(...CASCADE.slice(0, this.cascadeN));

    // the composer, and it is the emptiest thing on the device
    const cy = H - 30;

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
    const rows = [
      ...[...new Set(this.evening.filter(e => e.from !== m.group.name).map(e => e.from))].map(from => ({ from, text: this.evening.filter(e => e.from === from).slice(-1)[0].text, time: '', id: 'evening:' + from, read: false })),
      ...m.groupPreviews.map(g => ({ from: g.name, text: (g.muted ? m.groupPreviewUI.muted + ' · ' : '') + m.groupPreviewUI.unread.replace('{n}', String(g.unread)), time: '', id: '', read: true })),
      { from: m.home.groupLabel, text: this.groupUnread() ? m.home.groupUnread.replace('{n}', String(this.groupUnread())) : m.home.groupQuiet, time: '', id: 'group', read: !this.groupUnread() },
      ...BACKLOG.map(b => ({ ...b, id: 'read-' + b.from + b.time, read: this.readMessages.has(b.from + b.time) }))
    ];
    // The era's news stays reachable on every page; private threads can be paged independently.
    const group = rows.splice(rows.findIndex(r => r.id === 'group'), 1)[0];
    const perPage = Math.max(1, Math.floor((H - y - 36) / 48) - 1);
    const pages = Math.max(1, Math.ceil(rows.length / perPage));
    this.inboxPage = Math.min(this.inboxPage, pages - 1);
    for (const b of [group, ...rows.slice(this.inboxPage * perPage, this.inboxPage * perPage + perPage)]) {
      const h = 48;
      if (!b.read) { ctx.fillStyle = PHONE.tint; ctx.fillRect(5, y + 13, 4, 4); }
      phoneFont(ctx, 11, 600); ctx.fillStyle = PHONE.ink; ctx.fillText(b.from, 14, y + 5);
      phoneFont(ctx, 8); ctx.fillStyle = PHONE.dim;
      ctx.fillText(b.time, W - 10 - ctx.measureText(b.time).width, y + 20);
      phoneFont(ctx, 10);
      ctx.fillText(phoneWrap(ctx, b.text, W - 28)[0], 14, y + 31);
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(14, y + h - 1, W - 14, 1);
      if (b.id) this.rects.push({ x: 0, y, w: W, h, id: b.id }); y += h;
    }
    phoneFont(ctx, 12); ctx.fillStyle = PHONE.dim;
    if (this.inboxPage > 0) { ctx.fillText(m.home.previousPage, 12, H - 26); this.rects.push({ x: 0, y: H - 36, w: 50, h: 36, id: 'inbox-prev' }); }
    if (this.inboxPage < pages - 1) { ctx.fillText(m.home.nextPage, W - 25, H - 26); this.rects.push({ x: W - 50, y: H - 36, w: 50, h: 36, id: 'inbox-next' }); }
  }

  /** ⚑ LAMBIENT'S CARD, as a SHEET from the bottom edge — the shape a phone of
   *  this period used for anything it wanted acknowledged. Both versions are
   *  polite; nothing is threatened, nothing is withheld, and the only difference
   *  between them is how she got here. */
  // ── press ────────────────────────────────────────────────────────────────
  press(x: number, y: number): boolean {
    const r = this.rects.find(rr =>
      x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    if (!r) return false;
    return this.pressControl(r.id);
  }

  pressControl(id: string): boolean {
    const r = { id };
    switch (r.id) {
      case 'evening-banner':
        if (this.banner?.text === m.link.headline || this.banner?.text === LINK_VOTE.headline) { this.openLink(this.banner.text === LINK_VOTE.headline ? 'link2' : 'link'); return true; }
        if (this.banner && this.evening.some(e => e.from === this.banner!.from && e.text === this.banner!.text)) { this.openEvening(this.banner.from); }
        else { this.screen = 'group'; this.openGroup(); }
        this.bump(); return true;
      case 'inbox-prev': this.inboxPage--; this.bump(); return true;
      case 'inbox-next': this.inboxPage++; this.bump(); return true;
      case 'personal-notification': this.openPersonalThread(); return true;
      case 'unlock': this.screen = 'home'; this.bump(); return true;
      case 'notification': this.screen = 'group'; this.openGroup(); return true;
      case 'group': this.screen = 'group'; this.openGroup(); return true;
      case 'inbox':
        this.screen = 'inbox';
        // The optional inbox never files a reading event.
        this.bump(); return true;
      // S158: the chat goes back to Messages; S177: so does an open message
      case 'back': if (this.screen === 'photo') { this.screen = 'photos'; this.bump(); return true; } this.screen = this.screen === 'group' || this.screen === 'message' || this.screen === 'evening' || this.screen === 'article' || this.personalOpen ? 'inbox' : 'home'; this.openMessage = null; this.bump(); return true;
      case 'platform': this.screen = 'platform'; this.bump(); return true;
      case 'photos-prev': this.photoPage--; this.bump(); return true;
      case 'photos-next': this.photoPage++; this.bump(); return true;
      case 'photos': this.photoPage = 0; this.screen = 'photos'; this.bump(); return true;
      case 'notes': this.screen = 'notes'; this.bump(); return true;
      case 'walk': this.screen = 'walk'; this.bump(); return true;
      case 'link': case 'link2': this.openLink(r.id); return true;
      // ⚑ the stream has no verb. Pressing it is consumed and does nothing,
      //   which is truer than making it play: nobody asked her to watch it.
      case 'stream': return true;
      default:
        if (r.id.startsWith('evening:')) { this.openEvening(r.id.slice(8)); return true; }
        if (r.id.startsWith('photo-')) { this.photoIndex = Number(r.id.slice(6)); this.screen = 'photo'; this.bump(); return true; }
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
      case 'voted': this.arm(); this.stage = 'voted'; this.newsBanner(MALTA_TWO); this.bump(); break;
      case 'cascade':
        this.advanceNews();
        this.screen = 'group'; this.bump();
        break;
      case 'after':
        this.debugBeat('cascade');
        this.cascadeN = CASCADE.length; this.stage = 'after';
        veraDay.cascadeSeen = true;
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
    const entries = b.thread ?? [{ time: b.time, text: b.text }];
    let by = top + 8;
    for (const entry of entries) {
      phoneFont(ctx, 10);
      const lines = phoneWrap(ctx, entry.text, W - 42);
      const bh = lines.length * 13 + 14;
      bubble(ctx, 10, by, W - 22, bh, 'in');
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 19, by + 7 + i * 13));
      by += bh + 3;
      phoneFont(ctx, 8); ctx.fillStyle = PHONE.dim;
      ctx.fillText(entry.time, 14, by); by += 15;
    }
    if (b.stampCard) {
      phoneFont(ctx, 12, 600); ctx.fillStyle = PHONE.ink;
      const lines = phoneWrap(ctx, b.stampCard, W - 40);
      ctx.fillStyle = PHONE.surface; ctx.fillRect(12, by + 4, W - 24, 74);
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 20, by + 14 + i * 17));
    }
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
    veraDay.phoneAnswered = true;
    this.bump();
  }

  get floppyBlocked(): boolean { return this.opts.floppyOpen(); }
  /** ⚑ she opened it at least once — the record's only branch, and it changes
   *  nothing anyone can see. */
  get everOpened(): boolean { return this.opened; }
}
