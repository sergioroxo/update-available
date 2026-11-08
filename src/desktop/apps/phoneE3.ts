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
/** ⚑ S332 — Malta in Bea's thread (s3_maiden.json `news`), her one reply, and the removals */
const NEWS = m.news as Msg[];
const REPLY = m.reply as { text: string; time: string; hint: string };
const REMOVED_LINE = m.removedLine as string;
const VERA = 'Vera';
const CASCADE = m.cascade as Msg[];
const SLOTS = (mirrorCopy as unknown as { slots?: string[] }).slots ?? [];
type Live = Msg & { key: string };
const LINK_VOTE = m.linkVote as { masthead: string; headline: string };   // S227 / M1: the never-drawn standfirst and tapHint are gone
const BACKLOG = m.backlog as { from: string; time: string; text: string; register?: string; stampCard?: string; thread?: { time: string; text: string }[] }[];
const UNLOCK_HINT = (m.home as unknown as Record<string, string>).unlockHint;
const HOME = m.home as unknown as Record<string, string>;

/** ⚑ how far the era has got. `quiet` is the phone S64 built — a lock screen
 *  with one game on it and no notifications at all, which is what makes ONE
 *  arriving an event. Every step after that is player-initiated except the
 *  cascade, which is other people. */
type Stage = 'quiet' | 'news' | 'takeover' | 'after';
type Screen = 'lock' | 'home' | 'group' | 'inbox' | 'platform' | 'message' | 'walk' | 'personal' | 'notes' | 'photos' | 'photo' | 'evening' | 'article';
/** Lambient's card, and it is the same card whichever way she got here */

/** the cascade's own clock. Messages land ~0.45 s apart — fast enough to read
 *  as more-than-one-person, slow enough that a player can watch names arrive.
 *  ⚑ This is the ONE clocked beat in this module and it bumps only the phone's
 *  version, so it never re-uploads the workstation panel beside it. */
// ⚑ S288 (headset B: "This needs to be a little bit slower because I couldn't read what it was") — 0.45 → 0.9 s a message:
//   still a flood, now one you can read
const CASCADE_STEP = 0.75;
/** ⚑ S332 — Bea's news lands a message at a time; the removals run slower than the forwards (the outnumbering) */
const NEWS_STEP = 1.7;
const REMOVE_STEP = 1.5;
/** her reply is offered, never required: after this long unpressed, the platform begins anyway (it does not wait) */
const REPLY_WAIT = 20;
const TAKEOVER_HOLD = 2.2;
/** ⚑ S219 / W1-B13 — at most one message sound per this many seconds, the repeats at a fraction of the first */
const CASCADE_SOUND_GAP = 1.5;
/** ⚑ S327 / T06 (his 8 Nov: "a Maiden-to-be message popped in while I pressed the testimony editor") — a held message
 *  is delivered only while the platform is AT REST (no job, page or card open, no other voice speaking), and the next
 *  waits this long after the last, so each one is read before the next arrives. */
const READ_HOLD = 4;
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
  private bannerAge = READ_HOLD;
  /** ⚑ S327 — set every frame by the platform: nothing is open there and no other voice is speaking */
  atRest = false;
  /** ⚑ S327 — Mam's message has landed; her unfinished reply (Notes) is shown once it has been read */
  private notesPending = false;
  private notesReturn: Screen = 'home';
  private articleVote = false;
  /** ⚑ S332 — MALTA, conducted: Bea's news begins landing in the group thread (graceQueueLite brings the window forward) */
  startNews(): void {
    if (this.stage !== 'quiet' || this.disconnected) return;
    veraDay.phoneAnswered = true; veraDay.voted = true;
    this.stage = 'news'; this.newsT = NEWS_STEP - 0.6; this.newsN = 0; this.banner = null;
    this.bump();
  }
  private newsN = 0;
  private newsT = 0;
  private replied = false;
  private replyWaitT = -1;
  private holdT = -1;
  private removeT = 0;
  private cascadeOn = false;
  private removed = new Set<string>();
  /** the news has all landed and her one reply is on offer */
  get replyOffered(): boolean { return this.stage === 'news' && this.newsN >= NEWS.length && !this.replied && this.replyWaitT < REPLY_WAIT; }
  get inTakeover(): boolean { return this.stage === 'takeover' || this.stage === 'after'; }
  private liveMsgs(): Live[] {
    const out: Live[] = NEWS.slice(0, this.newsN).map((n, i) => ({ ...n, key: 'n' + i }));
    if (this.replied) out.push({ from: VERA, time: REPLY.time, text: REPLY.text, key: 'v' });
    CASCADE.slice(0, this.cascadeN).forEach((c, i) => out.push({ ...c, key: 'c' + i }));
    return out;
  }
  private removalOrder(): string[] {
    return [...NEWS.map((_, i) => 'n' + i), ...(this.replied ? ['v'] : []),
      ...CASCADE.flatMap((c, i) => c.from === 'system' ? [] : ['c' + i])];
  }
  private nextRemoval(): string | undefined { return this.removalOrder().find(k => !this.removed.has(k)); }
  /** what the platform shows while it reviews the group by itself (graceQueueLite's removals page) */
  takeoverRows(): { who: string; text: string; link: boolean; state: 'removed' | 'removing' | 'pending' | 'missed' }[] {
    const next = this.stage === 'takeover' ? this.nextRemoval() : undefined;
    return this.liveMsgs().filter(x => x.from !== 'system').map(x => ({
      who: x.from, text: x.text ?? '', link: x.kind === 'link' || x.kind === 'link2',
      state: this.removed.has(x.key) ? 'removed' : x.key === next ? 'removing' : this.stage === 'after' ? 'missed' : 'pending'
    }));
  }
  get unreviewed(): number { return this.liveMsgs().filter(x => x.from !== 'system' && !this.removed.has(x.key)).length; }
  private notesT = -1;
  private notesDone = false;
  get conductingNotes(): boolean { return this.notesT >= 0; }
  conductNotes(): void {
    if (this.notesDone) return;
    this.notesDone = true; this.notesT = 0; this.notesReturn = this.screen === 'notes' ? 'home' : this.screen; this.screen = 'notes'; this.bump();
  }
  /** ⚑ S327 — the cascade, conducted: the group thread is put on the glass while it fills (the piece takes her there) */
  showGroup(): void {
    if (this.disconnected) return;
    this.screen = 'group'; this.openMessage = null; this.banner = null; this.markGroupSeen(); veraDay.phoneAnswered = true; this.bump();
  }
  private eveningFrom = '';
  private slotN = 0;
  private storyClock = '18:04';
  private banner: { from: string; time: string; text: string } | null = null;
  bannersHidden = false;
  arrive(id: string): void {
    const e = mirrorCopy.events.find(e => e.id === id);
    if (!e || [...this.evening, ...this.eventQueue].some(a => a.id === id) || this.disconnected) return;
    this.eventQueue.push(e); this.deliverEvent();
  }
  /** ⚑ S327 — a message is waiting, or the last one is still being read: the platform's other voices wait for it */
  get voiceBusy(): boolean { return this.bannerAge < READ_HOLD || (this.atRest && this.eventQueue.length > 0) || this.notesPending || this.conductingNotes; }
  get queued(): number { return this.eventQueue.length; }
  delivered(id: string): boolean { return this.evening.some(e => e.id === id); }
  private deliverEvent(): void {
    if (!this.eventQueue.length || this.bannerAge < READ_HOLD || this.bannersHidden || !this.atRest || this.disconnected || this.notesPending || this.conductingNotes) return;
    const raw = this.eventQueue.shift()!;
    // ⚑ S332 — jobs finish in her order, so each message takes the evening's next slot (the clock never runs back)
    const e = { ...raw, time: raw.id === 'after' ? raw.time : SLOTS[this.slotN++] ?? raw.time };
    this.evening.push(e); this.storyClock = e.time; this.banner = e; this.bannerAge = 0;
    // ⚑ S327 / T04 (his 8 Nov: "two different messages from Orla, which doesn't make a lot of sense") — ONE banner for
    //   Orla's evening: the stamp line lands in the same thread, quietly, under the quiz message
    if (e.id === 'arrival') { const st = mirrorCopy.events.find(x => x.id === 'stamp'); if (st && !this.delivered('stamp')) this.evening.push({ ...st, time: e.time }); }
    if (e.id === 'decision') this.notesPending = true;
    playOnce('phone_ping_2016.mp3'); this.bump();
  }

  private newsBanner(messages: Msg[]): void {
    const e = messages[messages.length - 1];
    if (this.screen === 'group') { this.banner = null; this.bump(); return; }   // S327: it is landing on the open thread
    if (e) this.banner = { from: e.from, time: e.time, text: e.text ?? (e.kind === 'link2' ? LINK_VOTE.headline : e.kind === 'link' ? m.link.headline : '') };
    this.bump();
  }
  get eveningClock(): string { return this.storyClock; }
  disconnected = false;
  disconnect(): void { this.disconnected = true; this.evening = []; this.eventQueue = []; this.readMessages.clear(); veraDay.personalMessageSeen = false; this.banner = null; this.openMessage = null; this.notesT = -1; this.screen = 'lock'; this.bump(); }
  get hitRects(): Rect[] { return this.rects; }
  get unreadCount(): number { return BACKLOG.filter(b => !this.readMessages.has(b.from + b.time)).length + this.groupUnread() + this.evening.filter(e => e.from !== m.group.name && !this.readMessages.has('evening:' + e.id)).length; }
  private bump(): void { this.version++; }
  get quietReading(): boolean { return this.screen === 'group' || this.screen === 'walk' || this.screen === 'platform' || this.screen === 'article' || this.screen === 'evening' || this.screen === 'photos' || this.screen === 'photo' || this.screen === 'notes' || this.personalOpen || this.screen === 'message' || this.screen === 'inbox'; }
  presentInbox(): void { this.screen = 'inbox'; this.openMessage = null; this.bump(); }


  /** ⚑ S219 — every message of the group's thread that has landed, past the history she already had */
  private groupLanded(): number { return this.newsN + this.cascadeN; }
  private groupUnread(): number { return Math.max(0, this.groupLanded() - this.groupSeen); }
  /** the thread is on her screen: what has landed is seen */
  private markGroupSeen(): void { this.groupSeen = this.groupLanded(); }
  /** a link card is LIVE only at the stage it belongs to: Bea's bill at `first`, the vote's result at `voted`.
   *  Every other card (the bill again once the vote is in, the forwards in the cascade) is spent. */
  private linkSpent(_kind: string | undefined): boolean { return false; }

  // ── the era drives these ─────────────────────────────────────────────────
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
    // Mam's message read, then — at rest — her unsent reply to it, once
    if (this.notesPending && this.atRest && this.bannerAge >= READ_HOLD && !this.bannersHidden) { this.notesPending = false; this.conductNotes(); }
    if (this.notesT >= 0) {
      const old = Math.floor(this.notesT * 2); this.notesT += dt;
      if (this.notesT >= 3) { this.notesT = -1; this.screen = this.notesReturn; this.bannerAge = 0; this.bump(); }
      else if (old !== Math.floor(this.notesT * 2)) this.bump();
    }
    // ⚑ S332 — MALTA, the era's own beat (conducted: the platform holds every other voice while it runs).
    //   news: Bea's messages land one at a time; then her one reply is offered (never required).
    //   takeover: GracePlatform removes the Malta posts by itself, then her reply; the forwards begin once the posts
    //   are gone and land faster than it can remove them. after: the cascade is in; what it missed stays.
    if (!visible) return;
    if (this.stage === 'news') {
      if (this.newsN < NEWS.length) {
        this.newsT += dt;
        if (this.newsT >= NEWS_STEP) {
          this.newsT = 0; this.newsN++; this.newsBanner(NEWS.slice(0, this.newsN));
          if (this.screen === 'group') this.markGroupSeen();
          this.cascadeSound(); this.bump();
        }
        return;
      }
      if (this.replied) { this.holdT += dt; if (this.holdT >= TAKEOVER_HOLD) { this.stage = 'takeover'; this.removeT = 0; this.bump(); } return; }
      const before = this.replyOffered;
      this.replyWaitT = this.replyWaitT < 0 ? 0 : this.replyWaitT + dt;
      if (before && !this.replyOffered) { this.stage = 'takeover'; this.removeT = 0; this.bump(); }
      return;
    }
    if (this.stage !== 'takeover') return;
    this.removeT += dt;
    if (this.removeT >= REMOVE_STEP) {
      const next = this.nextRemoval();
      if (next && this.liveMsgs().some(x => x.key === next)) { this.removed.add(next); this.removeT = 0; this.bump(); }
      else this.removeT = REMOVE_STEP;
    }
    if (!this.cascadeOn && NEWS.every((_, i) => this.removed.has('n' + i))) { this.cascadeOn = true; this.cascadeT = 0; }
    if (!this.cascadeOn) return;
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
  get pastFirst(): boolean { return this.stage !== 'quiet'; }

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
    // ⚑ S330 (his 8 Nov, twice: "what is this notification box on top of this? … it should be pop in messages on the
    //   phone") — the banner no longer pushes the screen down as a box above the phone. It is drawn OVER the screen,
    //   under the status bar, the way a phone does it; on the lock screen the messages stack as cards instead.
    const bannerH = 0;
    const bodyH = H - bannerH;
    ctx.save(); ctx.beginPath(); ctx.rect(0, bannerH, W, bodyH); ctx.clip(); ctx.translate(0, bannerH);
    if (this.screen === 'article') {
      ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, bodyH);
      const link = this.articleVote ? LINK_VOTE : m.link;
      const y0 = statusBar(ctx, W, this.clockText), top = appBar(ctx, W, y0, link.masthead);
      this.pushBack(y0, top);
      phoneFont(ctx, 13, 600); ctx.fillStyle = PHONE.ink;
      phoneWrap(ctx, link.headline, W - 20).forEach((line, i) => ctx.fillText(line, 10, top + 14 + i * 18));
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
    // ⚑ S327 / T31 (his 8 Nov: "it has two back buttons, one on the top, one down… this is a mistake") — ONE back: the
    //   chevron on each screen's own app bar. The second, drawn at the foot, is gone, and so is "Reply on your phone"
    //   (T05: "it doesn't really work, and it should be removed") — she reads here; she does not write.
    if (this.conductingNotes) this.rects = this.rects.filter(r => r.id !== 'back');
    this.rects = this.rects.flatMap(r => {
      const x = Math.max(0, r.x), y = Math.max(0, r.y), right = Math.min(W, r.x + r.w), bottom = Math.min(H, r.y + r.h);
      return right > x && bottom > y ? [{ ...r, x, y, w: right - x, h: bottom - y }] : [];
    });
  }

  /** S281 — what the phone is waiting on, screen by screen: the notification, then Messages, then the group, then the
   *  live link. Nothing once the group's news is all seen and the link is spent. */

  /** A second viewport shares state, but must not replace the physical screen's hit geometry. */
  drawMirrored(ctx: CanvasRenderingContext2D, W: number, H: number): Rect[] {
    const physical = this.rects;
    this.draw(ctx, W, H);
    const mirrored = this.rects;
    this.rects = physical;
    return mirrored;
  }
  private openEvening(from: string): void {
    this.eveningFrom = from; this.screen = from === m.group.name ? 'group' : 'evening';
    if (this.banner?.from === from) this.banner = null;   // S327: opened, the notification has done its job
    for (const e of this.evening.filter(e => e.from === from)) this.readMessages.add('evening:' + e.id);
    if (from === m.personalMessage.from) { this.readMessages.add('personal'); veraDay.personalMessageSeen = true; }
    if (this.screen === 'group') this.markGroupSeen();
    this.bump();
  }
  /** ⚑ S327 — ONE thread per person: what she already had from them (the backlog) above what arrived tonight, the
   *  newest at the foot like any messaging app, the oldest dropping off the top when the glass is full */
  private drawEvening(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, this.eveningFrom);
    this.pushBack(y0, top);
    const items: { text: string; time: string; photo?: boolean }[] = [];
    for (const b of BACKLOG.filter(b => b.from === this.eveningFrom)) for (const t of b.thread ?? [{ time: b.time, text: b.text }]) items.push(t);
    for (const e of this.evening.filter(e => e.from === this.eveningFrom)) items.push({ text: e.text, time: e.time, photo: !!e.photo });
    phoneFont(ctx, 11);
    const sized = items.map(it => ({ it, lines: phoneWrap(ctx, it.text, W - 42), h: 0 }));
    for (const s of sized) s.h = s.lines.length * 14 + 14 + (s.it.photo ? 104 : 0) + 14;
    let y = H - 8;
    const shown: typeof sized = [];
    for (let i = sized.length - 1; i >= 0; i--) { if (y - sized[i].h < top + 6) break; y -= sized[i].h; shown.unshift(sized[i]); }
    for (const s of shown) {
      const bh = s.lines.length * 14 + 10;
      bubble(ctx, 10, y, W - 22, bh, 'in');
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.ink;
      s.lines.forEach((ln, i) => ctx.fillText(ln, 19, y + 5 + i * 14));
      let yy = y + bh + 2;
      if (s.it.photo) { this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], 12, yy, 100, 100); yy += 104; }
      phoneFont(ctx, 8); ctx.fillStyle = PHONE.dim; ctx.fillText(s.it.time, 14, yy);
      y += s.h;
    }
  }
  private get bannerPhoto(): boolean { return this.evening.some(e => e === this.banner && e.photo === true); }
  private drawBanner(ctx: CanvasRenderingContext2D, W: number): void {
    if (!this.banner || this.bannersHidden) return;
    if (this.screen === 'lock') return;   // S330: the lock screen shows its messages as stacked cards (drawLock)
    phoneFont(ctx, 11);
    const x = 6, y = 22, w = W - 12;
    const lines = phoneWrap(ctx, this.banner.text, w - 20).slice(0, 3);
    const h = 30 + lines.length * 14 + (this.bannerPhoto ? 78 : 0);
    roundRect(ctx, x, y + 1, w, h, 10, PHONE.dim);   // a hairline shadow under the card
    roundRect(ctx, x, y, w, h, 10, PHONE.surface);
    ctx.fillStyle = PHONE.ink; phoneFont(ctx, 11, 600); ctx.fillText(this.banner.from, x + 10, y + 8);
    phoneFont(ctx, 9); ctx.fillStyle = PHONE.dim; ctx.fillText(this.storyClock, x + w - 34, y + 8);
    phoneFont(ctx, 11); ctx.fillStyle = PHONE.ink; lines.forEach((line, i) => ctx.fillText(line, x + 10, y + 26 + i * 14));
    if (this.bannerPhoto) {
      this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], x + 10, y + 30 + lines.length * 14, 72, 72);
    }
    this.rects.unshift({ x, y, w, h, id: 'evening-banner' });
  }

  /** S330 — the lock screen's messages, newest first, as cards on the wallpaper (one card per person). */
  private drawLockCards(ctx: CanvasRenderingContext2D, W: number, H: number, top: number): number {
    // one card per person, newest person first; the card shows that person's FIRST line (Orla's quiz, not her
    // afterthought) and how many more wait, the way a lock screen groups a thread
    const byFrom = new Map<string, { from: string; time: string; text: string; more: number; last: number }>();
    this.evening.forEach((ev, i) => {
      const e = ev as { from: string; time: string; text?: string };
      const c = byFrom.get(e.from);
      if (c) { c.more++; c.time = e.time; c.last = i; }
      else byFrom.set(e.from, { from: e.from, time: e.time, text: e.text ?? '', more: 0, last: i });
    });
    const cards = [...byFrom.values()].sort((a, b) => b.last - a.last).slice(0, 3);
    let y = top;
    for (const c of cards) {
      phoneFont(ctx, 11); const lines = phoneWrap(ctx, c.text, W - 40).slice(0, 2);
      const h = 28 + lines.length * 14;
      if (y + h > H - 48) break;
      roundRect(ctx, 10, y, W - 20, h, 8, PHONE.surface);
      ctx.fillStyle = PHONE.ink; phoneFont(ctx, 11, 600); ctx.fillText(c.from, 20, y + 7);
      phoneFont(ctx, 9); ctx.fillStyle = PHONE.dim; ctx.fillText(c.time, W - 46, y + 8);
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.ink; lines.forEach((line, i) => ctx.fillText(line, 20, y + 24 + i * 14));
      if (c.more) { phoneFont(ctx, 9); ctx.fillStyle = PHONE.dim; ctx.fillText(`+${c.more}`, W - 34, y + h - 14); }
      this.rects.push({ x: 10, y, w: W - 20, h, id: `lock-card:${c.from}` });
      y += h + 6;
    }
    return y;
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
      this.rects.push({ x: ux, y: uy, w: uw, h: 26, id: 'unlock' });
    };
    this.drawLockCards(ctx, W, H, 120);
    unlockPill();
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
      const perPage = H < 260 ? 2 : 4, pages = sprites.length;
      this.photoPage = Math.min(this.photoPage, pages - 1);
      sprites.slice(this.photoPage, this.photoPage + perPage).forEach((sprite, n) => {
        const i = this.photoPage + n;
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
    const compact = H < 230;
    const s = compact ? 24 : 32;
    const gap = Math.round((W - s * 4) / 5);
    const col = (i: number): number => gap + i * (s + gap);
    const rowY = (r: number): number => (H >= 300 ? 84 : compact ? 24 : 32) + r * (s + (compact ? 16 : 22));

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

    if (compact) return;
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
    const shown = CASCADE.slice(0, this.cascadeN);
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

    if (this.inTakeover) {
      const label = this.stage === 'after'
        ? m.outnumbered.counter.replace('{n}', String(this.unreviewed))
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

    const msgs: Live[] = [
      ...BEFORE.map((b, i) => ({ ...b, key: 'b' + i })),
      ...this.evening.filter(e => e.from === m.group.name).map(e => ({ from: e.from, time: e.time, text: e.text, key: 'e' + e.id })),
      ...this.liveMsgs()
    ];

    // the composer's place: empty all era, except for the one reply she is offered (S332)
    const cy = H - 30;
    if (this.replyOffered) {
      phoneFont(ctx, 11);
      const tw = Math.ceil(ctx.measureText(REPLY.text).width);
      const cw = Math.min(W - 20, tw + 28), cx = W - 10 - cw;
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(0, cy - 6, W, 1);
      phoneFont(ctx, 8); ctx.fillStyle = PHONE.dim; ctx.fillText(REPLY.hint, 10, cy + 5);
      roundRect(ctx, cx, cy, cw, 24, 12, PHONE.bubbleOut);
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.surface; ctx.fillText(REPLY.text, cx + 14, cy + 6);
      this.rects.push({ x: cx, y: cy, w: cw, h: 24, id: 'reply-bea' });
    }

    // ⚑ bottom-up fill, and the guard tests the PROSPECTIVE position so the
    //   topmost bubble can never slide under the bar above it.
    let y = cy - 8;
    const drawn: { y: number; h: number; msg: Live }[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      const h = this.removed.has(msg.key) ? 18 : this.msgHeight(ctx, msg, W);
      const ny = y - h - 6;
      if (ny < top + 4) break;
      y = ny;
      drawn.unshift({ y, h, msg });
    }
    let lastFrom = '';
    for (const { y: my, msg } of drawn) {
      if (this.removed.has(msg.key)) {
        // ⚑ the platform reached into her phone: the bubble stays, emptied, in the system's grey
        phoneFont(ctx, 9);
        const tw = Math.min(W - 44, ctx.measureText(REMOVED_LINE).width + 16);
        const rx = msg.from === VERA ? W - 10 - tw : 30;
        roundRect(ctx, rx, my, tw, 18, 9, PHONE.hairline);
        ctx.fillStyle = PHONE.dim; ctx.fillText(REMOVED_LINE, rx + 8, my + 4);
        lastFrom = msg.from; continue;
      }
      if (msg.from === VERA) { this.drawMine(ctx, msg, my, W); lastFrom = msg.from; continue; }
      this.drawMsg(ctx, msg, my, W, msg.from !== lastFrom);
      lastFrom = msg.from;
    }
  }

  /** ⚑ S332 — her one message in the era, on the right where her words would always have been */
  private drawMine(ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number): void {
    phoneFont(ctx, 11);
    const lines = phoneWrap(ctx, msg.text ?? '', W - 74);
    let widest = 0;
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
    const bw = Math.min(W - 44, widest + 18), h = 14 + lines.length * 14, bx = W - 10 - bw;
    bubble(ctx, bx, y, bw, h, 'out');
    ctx.fillStyle = PHONE.surface;
    lines.forEach((ln, i) => ctx.fillText(ln, bx + 9, y + 7 + i * 14));
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
    // ⚑ S327 / T05 (his 8 Nov: "the mentor's message isn't on the phone") — tonight's people NEWEST FIRST, each once:
    //   the mentor's message used to sit fourth in arrival order, off the first page. A person she has older messages
    //   from is the same row (the thread holds both); the group's own check-in counts as the group's news.
    const senders: string[] = [];
    for (const e of [...this.evening].reverse()) if (e.from !== m.group.name && !senders.includes(e.from)) senders.push(e.from);
    const groupNew = this.groupUnread() + this.evening.filter(e => e.from === m.group.name && !this.readMessages.has('evening:' + e.id)).length;
    const rows = [
      ...senders.map(from => { const mine = this.evening.filter(e => e.from === from); const last = mine[mine.length - 1]; return { from, text: last.text, time: last.time, id: 'evening:' + from, read: mine.every(e => this.readMessages.has('evening:' + e.id)) }; }),
      ...m.groupPreviews.map(g => ({ from: g.name, text: (g.muted ? m.groupPreviewUI.muted + ' · ' : '') + m.groupPreviewUI.unread.replace('{n}', String(g.unread)), time: '', id: '', read: true })),
      { from: m.home.groupLabel, text: groupNew ? m.home.groupUnread.replace('{n}', String(groupNew)) : m.home.groupQuiet, time: '', id: 'group', read: !groupNew },
      ...BACKLOG.filter(b => !senders.includes(b.from)).map(b => ({ ...b, id: 'read-' + b.from + b.time, read: this.readMessages.has(b.from + b.time) }))
    ];
    // The era's news stays reachable on every page; private threads can be paged independently.
    const group = rows.splice(rows.findIndex(r => r.id === 'group'), 1)[0];
    const perPage = Math.max(1, Math.floor((H - y - 36) / 48) - 1);
    const pages = Math.max(1, rows.length);
    this.inboxPage = Math.min(this.inboxPage, pages - 1);
    for (const b of [group, ...rows.slice(this.inboxPage, this.inboxPage + perPage)]) {
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
    if (r.id.startsWith('lock-card:')) { this.openEvening(r.id.slice(10)); this.bump(); return true; }
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
      // ⚑ S332 — her one reply, one press. It is real and it is sent; the platform removes it a moment later.
      case 'reply-bea':
        if (!this.replyOffered) return true;
        this.replied = true; this.holdT = 0; playOnce('phone_msg_2016.mp3'); this.bump(); return true;
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
      case 'group': this.screen = 'group'; this.openGroup(); break;
      case 'inbox': this.screen = 'inbox'; this.bump(); break;
      case 'news': this.startNews(); this.newsN = NEWS.length; this.screen = 'group'; this.bump(); break;
      case 'reply': this.debugBeat('news'); this.pressControl('reply-bea'); break;
      case 'cascade':
        this.debugBeat('reply'); this.stage = 'takeover';
        NEWS.forEach((_, i) => this.removed.add('n' + i)); this.removed.add('v'); this.cascadeOn = true;
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
