import V3 from '../../../data/dialog/s4_v3.json';
/**
 * ⚑ THE STREAM — transjesus.str (S293, 2026-11-02). Design of record: `docs/reinterp/ENDING_TRANSJESUS_2026-11-02.md`
 * (his: "To replace the Commons, why isn't this the TransJesus? … the Ballroom just didn't work"; "sure we can try.
 * Make this good and storytelling"). His earlier definition, which this file exists to keep: *the affirming queer
 * DANCE-STREAM: the one thing the algorithm can't rank or bury, and the system CANNOT CAPTION … Respite, never a
 * trap. Community saves her, not the AI; the chat is human + collective.*
 *
 * The file keeps its old name (`E4Ball`, ball.ts) because the shell, the room and the review panel know it by that
 * name; everything the name stood for is gone: the hall's words, the categories and their cards, the MC, the judges,
 * the Houses, the lamps (all of them), her lamp, the room's call. What it is now, one sequence, no new controls:
 *
 *  1. JUNIE'S LINK lands on the glass inside the agent's session (V11): "it's on. come in." One press.
 *  2. THE PLATFORM TRIES TO FILE IT. The link opens in the device's player frame — the picture already moving — and
 *     the frame fails four times, one row at a time: Rank —, Reach not rated, Auto-captions unavailable, Category none
 *     found. Each failure is a system sound and the music ducks under it.
 *  3. THE STREAM FILLS THE SPACE. The picture grows from its frame to the whole glass; at full cover the world behind
 *     the glass becomes the stream's place (in a headset the cut is presented through the particle veil, S282), and
 *     the glass clears: she is inside the stream's light. TransJesus dances on the floor — no voice, no words, ever —
 *     and the people dance with them (the existing figures, as dancers, not contestants).
 *  4. THE CHAT IS THE COMMUNITY. Short human lines on the stream's own screen; then it sees her — "maya joined", the
 *     count 41 → 42 — and the welcomes run: "hi maya". The name the system misfiled is said back by people.
 *  5. HER ONE ACT: dance, or stay. A press; she says nothing; the room answers with its arms.
 *  6. THE SYSTEM COMES BACK FOR HER — "Reconnecting… Restoring your session" — on the glass, its own surface; it
 *     cannot rank or caption what it is looking at; the count holds; "connection refused · room full". Nobody in the
 *     chat answers it. They answer it by being there.
 *  7. It ends itself in its own ideology (SESSION TERMINATED · reason: social contagion), and the update fails outside
 *     her (E4Shell: the glitch, the device stopping, the laptop) while the stream keeps going — the music under the
 *     failure, the stream still live on her monitor when the room comes back. Then the Close.
 *
 * ⚑ LAWS THAT STAND FROM THE OLD FILE: respite is absolute (never a trap, never revealed as fake; the system targets
 * around it, never through it — every failure here is on the glass, the machine's own surface, never on a dancer or
 * a chat line); L, the agent's voice and Lamby are absent from the stream; THIS FILE IMPORTS NO LEDGER (the shell
 * files her leaving, never where she went); nothing is voiced and nothing may be synthesized.
 *
 * ⚑ THE SUBTITLES ARE FRAME CHROME: the chat is drawn large on the stream's screen in the world (it reads in a
 * headset), and its newest lines are mirrored as a plain DOM caption strip for the browser look-modes, in the idiom
 * the tape captions established.
 */
import { ERA4, PLACE, WEB, BALL, CLIP, roundRect, pill, avatar, streamScene, streamShot } from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { setBallLight, setCommonsWorld } from '../../room/cluster';
import { turnTo } from '../../room/commonsWorld';
import { setCommonsFigures, setCommonsDance, answerCommonsFigures, greetCommonsFigures } from '../../room/commonsFigures';
import { setCommonsHost, freeCommonsHost, type HostSurface } from '../../room/commonsHost';
import { playOnce, playLoop, stopClip, roomBed } from '../../audio/tapeAudio';
import { drawTryOn, TRYON } from './mirror';
import script from '../../../data/dialog/s4_ball.json';

interface Line { who: string; text: string; gift?: boolean }
const INV = script.invite;
const FRAME = script.frame as unknown as { panel: string; rows: { k: string; v: string }[]; rowSeconds: number; holdSeconds: number; growSeconds: number; clearSeconds: number };
const ST = script.stream as unknown as {
  mark: string; live: string; watching: string; count: number; lineSeconds: number; joined: string;
  before: Line[]; welcome: Line[]; ask: Line; chips: string[]; answer: Record<string, Line[]>; after: Line[];
};
const SYS = script.system as unknown as {
  afterAnswer: number; hold: number; mark: string; reconnecting: string; restoring: string; cannot: string[];
  present: string; refused: string; terminated: string; reason: string; terminatedNote: string; terminateSeconds: number;
};
/** ⚑ S354 — Shepherd Live™, the system's AI host (s4_ball.json `host`): no voice, text only */
interface HostChip { label: string; reply: string }
const HOST = script.host as unknown as {
  mark: string; title: string; speaker: string;
  studio: { live: string; viewers: string; viewersMany: string; always: string; verified: string; safety: string; partner: string };
  friends: { who: string; lines: string[]; seconds: number };
  metrics: { restored: string; peace: string; you: string; p: number };
  open: string[]; exchanges: { chips: HostChip[]; then: string[] }[];
  recap: { title: string; from: string; to: string; p0: number; p1: number; barSeconds: number; lines: string[] };
  readBase: number; readPerChar: number; readMin: number; readMax: number;
};
/** ⚑ S355 — the raid and the naming (s4_ball.json `raid`, `naming`) */
interface Said { who: string; text: string }
const RAID = script.raid as unknown as { notice: string; n: number; panel: string; climbSeconds: number; lineSeconds: number; lines: Said[]; settleSeconds: number };
interface NameRow { host: string; tag: string; who: string; surface: HostSurface; answer?: string; move: string }
const NAMING = script.naming as unknown as { rowSeconds: number; tagAt: number; answerAt: number; rows: NameRow[]; after: number };
/** ⚑ S356 — the backstage (s4_ball.json `backstage`) */
const BACK = script.backstage as unknown as {
  ask: Said; show: string; back: string; title: string; rec: string; rows: { k: string; v: string }[]; wordsTitle: string;
  holdSeconds: number; rowDarkSeconds: number; backAfter: number; autoBack: number;
};
/** how long a host line stays in the caption band: long enough to read, never a held look */
const readSeconds = (t: string): number => Math.max(HOST.readMin, Math.min(HOST.readMax, HOST.readBase + HOST.readPerChar * t.length));
/** one step of the host's script: a line, a question with her two chips, the recap's start, or the try-on */
type HostStep = { say: string } | { ask: number } | { recap: true } | { tryon: true };

/** the invitation card, on the worn visor's 512 × 384 canvas */
const INVITE = { x: 108, y: 104, w: 296, h: 150 } as const;
const JOIN = { x: INVITE.x + 14, y: INVITE.y + INVITE.h - 34, w: 104, h: 22 } as const;
/** the player frame the link opens in, before it grows */
/** her two chips, low on the clear glass, in the room's pink */
const CHIPS_Y = 262;
const CHIP_W = 92;
/** ⚑ the room ducks by this while a system sound plays (≈ 9 dB), as before */
const DUCK_DB = -9;
/** the host's caption band and its chips, on the glass (the try-on's band, same place, same size) */
const BAND_H = 34;
const HOST_CHIP_H = 24;
/** how many chat lines the screen and the subtitles carry */
const CHAT_SHOWN = 9;

type Phase = 'idle' | 'host' | 'tryon' | 'invited' | 'raid' | 'naming' | 'turnAsk' | 'backstage' | 'stream' | 'after' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

export class E4Ball {
  /** bumped on every change to what the VISOR draws; E4Shell folds it into its own version (uploads on dirty only) */
  version = 0;
  /** the glass clears: the shell moves to its `ball` stage (still on her face) and the world shows through */
  onDeviceOff?: () => void;
  /** the beat is over — the apparatus fails next. Hands the era to its finale. */
  onOver?: () => void;
  /** she opened Junie's link. The shell files it; this file never touches a ledger. */
  onJoin?: () => void;
  /** the controls this surface publishes: the host's chips, the link's chip, then her two chips */
  hits: Hit[] = [];

  private phase: Phase = 'idle';
  /** the stream's own clock, from the moment the glass starts to clear */
  private streamT = 0;
  /** the frame's rows that have failed so far */
  private rowsShown = 0;
  private worldIn = false;
  /** the stream's place is on (from the glass clearing until the device stops) — it outlives the system's session */
  private worldOn = false;
  /** the chat so far, and the count */
  private chat: (Line & { sys?: boolean })[] = [];
  private count = ST.count;
  /** ⚑ S350 — a viewer's gift has landed (noa's line, 'gift' in the data): the fund bar's small tick */
  private gave = false;
  /** the timeline of the chat: when the next line is due, and which queue it comes from */
  private queue: (Line & { sys?: boolean; mark?: 'joined' | 'ask' })[] = [];
  private nextLineAt = 0;
  private asking = false;
  private answered: string | null = null;
  private answeredAt = -1;
  /** the intrusion's clock (<0: not running), and its end */
  private intrusionT = -1;
  private intrusionDone = false;
  private reconnect: HTMLAudioElement | null = null;
  private refusedOnce = false;
  private afterT = 0;
  private caption: HTMLDivElement | null = null;
  // ── ⚑ S354 — the host's studio (Part A) ──
  /** the host's script still to run, and where it is */
  private hostSteps: HostStep[] = [];
  private hostT = 0;
  /** the line in the caption band, and when the next step is due */
  private hostLine = '';
  private hostNextAt = 0;
  /** her chips are up (the index of the exchange), or -1 */
  private hostAsk = -1;
  /** what she pressed, in the host's conversation (probes; the shell files nothing from here either) */
  hostPressed: string[] = [];
  /** the product's audience on the screen: its lines so far, and when the next is due */
  private friendsChat: Said[] = [];
  // ── ⚑ S355 — the raid and the naming (Part B) ──
  private raidT = 0;
  private raidLines = 0;
  /** the naming's clock, and the tags stamped so far (newest last) */
  private nameT = 0;
  private nameRow = -1;
  private tags: { who: string; text: string; sys?: boolean }[] = [];
  /** the metrics panel has answered its own question */
  private noSource = false;
  // ── ⚑ S356 — the backstage (Part C) ──
  private backT = -1;
  /** the moment the dashboard went fully dark (−1: not yet), and whether she has turned back */
  private darkAt = -1;
  private turningBack = false;
  /** the chips she actually pressed this week — the shell lends them (the browser's memory, never the ledger) */
  wordsSource?: () => string[];
  /** the host's studio has begun (the shell files it; this file files nothing) */
  onHost?: () => void;
  private friendsAt = 0;
  private friendsN = 0;
  /** the recap's clock on the screen (<0: not yet) */
  private recapT = -1;
  /** the try-on's clock (seconds since the mirror began) */
  private tryT = 0;
  /** what of the host's surfaces the people have taken back (Part B fills it) */
  private freed = new Set<HostSurface>();
  /** the studio's screen repaints only when something on it changes */
  private studioV = 0;
  /** probes only: what she pressed (never filed — respite) */
  get choice(): string | null { return this.answered; }

  get live(): boolean { return this.phase !== 'idle' && this.phase !== 'done'; }
  get invited(): boolean { return this.phase === 'invited'; }
  /** ⚑ S354 — the host's studio is up (its conversation, its recap) */
  get hosting(): boolean { return this.phase === 'host'; }
  /** the host's chips are on the glass, waiting */
  get hostAsking(): boolean { return this.hostAsk >= 0; }
  /** the try-on has run to its end (E4Shell marks the contract's `tryon`) */
  get tryOnDone(): boolean { return (this.phase === 'tryon' && this.tryT >= TRYON.done) || this.phase === 'invited' || this.phase === 'raid' || this.phase === 'naming'; }
  /** the studio stands (the host, its halo, its screen) until the people have taken it */
  private get studio(): boolean { return this.phase === 'host' || this.phase === 'tryon' || this.phase === 'invited' || this.phase === 'raid' || this.phase === 'naming' || this.phase === 'turnAsk'; }
  /** ⚑ S356 — the operator view is up: only while she faces it (era3Devices enables its plane on this) */
  get backstageOn(): boolean { return this.phase === 'backstage'; }
  /** the operator view repaints only when a row goes dark */
  get backstageVersion(): number { return this.backstageOn ? 1 + this.backRowsDark() : 0; }
  /** ⚑ S355 — the people are naming the script (probes read it; the tags are on the glass) */
  get naming(): boolean { return this.phase === 'naming'; }
  /** the tags stamped so far (probes, the legibility check) */
  get tagsShown(): number { return this.tags.filter((t) => !t.sys).length; }
  get phaseId(): string { return this.phase; }
  /** her chips are on the glass, waiting (a probe reads it; the walker reads `hits`) */
  get callUp(): boolean { return this.asking; }
  /** how much of the agent's environment is still on the glass: all of it until the stream fills the glass */
  get environmentK(): number {
    // ⚑ S354 — in the studio the glass is clear (the world is the host's); the try-on fills it again
    if (this.phase === 'host' || this.phase === 'naming' || this.phase === 'turnAsk' || this.phase === 'backstage') return 0;
    if (this.phase === 'idle' || this.phase === 'tryon' || this.phase === 'invited') return 1;
    // ⚑ S355 — the raid: the mirror lets go of the glass in its first second, and the studio is there again
    if (this.phase === 'raid') return Math.max(0, 1 - this.raidT / 1.0);
    return 0;
  }
  /** the stream's screen in the world is on from the moment she is inside */
  get streaming(): boolean { return this.worldOn; }
  /** the stream is VIDEO: its screen repaints twelve times a second while it is on */
  get viewerCount(): number { return this.count; }
  get streamVersion(): number {
    if (!this.streaming) return 0;
    if (this.studio) return 1_000_000 + this.studioV;
    return 1 + Math.floor(this.streamT * 12);
  }
  /** true from the moment the glass clears — `E4Shell` reads it */
  get deviceOff(): boolean { return this.phase === 'stream' || this.phase === 'after'; }
  /** nothing here ends early on a press: the system ends it, and only in its own words */
  get returnable(): boolean { return false; }

  /**
   * ⚑ S354 — THE HOST'S STUDIO (UiB job 11 Part A). The device goes on and the Commons' space is there, staged by
   * the system's AI host: the pale floor, the host on the stage at its distance, the halo, the screen saying LIVE ·
   * Shepherd Live™ · 1 viewer, the product's own audience posting 🙏, its numbers. It speaks only in the caption band
   * on the glass — no voice, ever (his 10 Nov). Then ≤3 exchanges, her two chips each; then the recap of her week on
   * the screen, and "Let me show you who you could be." → the try-on (mirror.ts), its lines now the host's. Junie's
   * link breaks into the try-on, as before. The world is the stream's place from here on; the people take it later.
   */
  startHost(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'host';
    this.worldIn = false;
    this.hostT = 0;
    this.hostLine = '';
    this.hostAsk = -1;
    this.hostPressed = [];
    this.friendsChat = []; this.friendsAt = 1.2; this.friendsN = 0;
    this.recapT = -1; this.tryT = 0;
    this.freed.clear();
    this.hits = [];
    this.count = 1;
    this.hostSteps = [
      ...HOST.open.map((say) => ({ say })),
      ...HOST.exchanges.flatMap((_x, i) => [{ ask: i }] as HostStep[]),
      { recap: true },
      ...HOST.recap.lines.map((say) => ({ say })),
      { tryon: true }
    ];
    this.hostNextAt = 1.4;   // a breath after the cut, before the first line
    this.worldOn = true;
    setCommonsWorld(true);   // app.ts's room hook cuts her to the one spot (in a headset, through the particle veil)
    setCommonsHost(true);
    setCommonsFigures(false);
    setCommonsDance(false);
    this.onHost?.();
    this.version++; this.studioV++;
  }

  /** the host's clock: its lines, its questions, its audience, the recap, then the mirror */
  private updateHost(dt: number): void {
    const b4 = this.hostT;
    this.hostT += dt;
    // the product's audience: the same few lines at an even pace, while the count says 1 viewer
    if (this.hostT >= this.friendsAt) {
      if (this.phase === 'host' || this.phase === 'tryon') this.friendsChat.push({ who: '', text: HOST.friends.lines[this.friendsN % HOST.friends.lines.length] });
      if (this.friendsChat.length > 20) this.friendsChat.shift();
      this.friendsN++;
      this.friendsAt = this.hostT + HOST.friends.seconds;
      this.studioV++;
    }
    if (this.recapT >= 0) {
      const r4 = this.recapT;
      this.recapT += dt;
      if (Math.floor(r4 * 6) !== Math.floor(this.recapT * 6)) this.studioV++;
    }
    if (this.hostAsk >= 0 || this.hostT < this.hostNextAt) return;
    const step = this.hostSteps.shift();
    if (!step) return;
    if ('say' in step) {
      this.hostLine = step.say;
      this.hostNextAt = this.hostT + readSeconds(step.say);
      this.version++;
    } else if ('ask' in step) {
      this.hostAsk = step.ask;
      this.publishHostChips();
    } else if ('recap' in step) {
      this.recapT = 0;
      this.studioV++;
      this.hostNextAt = this.hostT + 0.4;
    } else {
      // "Let me show you who you could be." — the mirror fills the glass, head-locked, as before
      this.phase = 'tryon';
      this.tryT = 0;
      this.hostLine = '';
      this.version++;
    }
    void b4;
  }

  private publishHostChips(): void {
    const ex = HOST.exchanges[this.hostAsk];
    if (!ex) return;
    // two chips, centred above the caption band, sized to their words (her words, short)
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    const widths = ex.chips.map((c) => { if (ctx) setFont(ctx, 11); return Math.max(84, Math.ceil(ctx ? ctx.measureText(c.label).width : c.label.length * 7) + 26); });
    const gap = 12, total = widths.reduce((a, b) => a + b, 0) + gap;
    let x = Math.round(256 - total / 2);
    const y = 384 - 46 - 12 - HOST_CHIP_H;
    this.hits = ex.chips.map((c, k) => { const r = { x, y, w: widths[k], h: HOST_CHIP_H, id: `host-chip-${k}` }; x += widths[k] + gap; void c; return r; });
    this.version++;
  }

  /** her answer: the host agrees, and moves her one step — the reply, then the exchange's own lines */
  private answerHost(k: number): void {
    const ex = HOST.exchanges[this.hostAsk];
    if (!ex || !ex.chips[k]) return;
    this.hostPressed.push(ex.chips[k].label);
    this.hostAsk = -1;
    this.hits = [];
    playOnce('ui_press.mp3');
    this.hostSteps.unshift({ say: ex.chips[k].reply }, ...ex.then.map((say) => ({ say })));
    this.hostNextAt = this.hostT + 0.5;
    this.version++;
  }

  /** ⚑ Junie's link lands on the glass. The music is already audible through the wall while she decides. */
  invite(): void {
    // ⚑ S354 — it breaks into the try-on (the host's mirror); `idle` stays for the old review routes
    if (this.phase !== 'idle' && this.phase !== 'tryon') return;

    this.phase = 'invited';
    this.hits = [{ ...JOIN, id: 'commons-join' }];
    this.version++;
    playOnce('card_junie.mp3');   // the room's register, not the system's
    roomBed.set(script.room.bed, 4.0);
  }

  /**
   * ⚑ S355 — her press, "Let them in": THE RAID. The mirror lets go of the glass; the host's screen says
   * "transjesus.str is raiding · 41 viewers"; the host's own frame tries to file it and fails, row by row (the four
   * rows the frame always failed with, now under the host's mark); the count climbs 1 → 42; the handles arrive in
   * the host's chat and the Friends' 🙏 is buried. Nobody narrates it. Then the naming.
   */
  begin(): void {
    if (this.phase !== 'idle' && this.phase !== 'invited') return;
    this.hits = [];
    this.phase = 'raid';
    this.raidT = 0; this.raidLines = 0;
    this.rowsShown = 0;
    playOnce('ui_press.mp3');
    roomBed.set(script.room.bed, 2.0);
    this.version++; this.studioV++;
  }

  private updateRaid(dt: number): void {
    const r4 = this.raidT;
    this.raidT += dt;
    if (Math.floor(r4 * 8) !== Math.floor(this.raidT * 8)) { this.version++; this.studioV++; }
    // the count climbs: 1 → 1 + 41
    const k = Math.min(1, Math.max(0, (this.raidT - 0.8) / RAID.climbSeconds));
    this.count = 1 + Math.round(RAID.n * k * k * (3 - 2 * k));
    // the handles arrive in the host's chat
    while (this.raidLines < RAID.lines.length && this.raidT >= 1.0 + this.raidLines * RAID.lineSeconds) {
      this.friendsChat.push(RAID.lines[this.raidLines++]);
      if (this.friendsChat.length > 20) this.friendsChat.shift();
    }
    // the host's frame fails to file it, one row at a time
    const due = Math.min(FRAME.rows.length, Math.floor(Math.max(0, this.raidT - 1.0) / FRAME.rowSeconds));
    if (due > this.rowsShown) { this.rowsShown = due; this.sys('filter_deny.mp3', 0.6); this.version++; }
    const end = Math.max(1.0 + FRAME.rows.length * FRAME.rowSeconds + FRAME.holdSeconds * 0.5, 0.8 + RAID.climbSeconds) + RAID.settleSeconds;
    if (this.raidT >= end) {
      this.phase = 'naming';
      this.nameT = 0; this.nameRow = -1; this.tags = []; this.noSource = false;
      this.version++; this.studioV++;
    }
  }

  /**
   * ⚑ S355 — THE NAMING. The host runs its script again in the caption band; a beat later one of the people stamps a
   * tag on it, and the tag takes one of the host's surfaces into the stream's warm light (the badge, the halo, the
   * Friends' column, the key light, the safety banner, the numbers, the picture). Naming is the takeover.
   */
  private updateNaming(dt: number): void {
    const n4 = this.nameT;
    this.nameT += dt;
    if (this.freed.has('picture') && Math.floor(n4 * 8) !== Math.floor(this.nameT * 8)) this.studioV++;
    const row = Math.floor(this.nameT / NAMING.rowSeconds);
    const inRow = this.nameT - row * NAMING.rowSeconds;
    const was = Math.floor(n4 / NAMING.rowSeconds), wasIn = n4 - was * NAMING.rowSeconds;
    if (row < NAMING.rows.length) {
      const R = NAMING.rows[row];
      if (row !== this.nameRow) { this.nameRow = row; this.hostLine = R.host; this.version++; }
      if ((row !== was || wasIn < NAMING.tagAt) && inRow >= NAMING.tagAt) {
        // the stamp: the tag on the glass, the same line in the chat, and the surface taken back
        this.tags.push({ who: R.who, text: R.tag });
        this.friendsChat.push({ who: R.who, text: R.tag });
        if (!R.answer) { this.freed.add(R.surface); freeCommonsHost(R.surface); }
        this.version++; this.studioV++;
      }
      if (R.answer && (row !== was || wasIn < NAMING.answerAt) && inRow >= NAMING.answerAt) {
        // the panel answers itself; nobody else does
        this.tags.push({ who: '', text: R.answer, sys: true });
        this.noSource = true;
        this.freed.add(R.surface); freeCommonsHost(R.surface);
        this.version++; this.studioV++;
      }
      return;
    }
    if (this.hostLine) { this.hostLine = ''; this.version++; }
    if (this.nameT >= NAMING.rows.length * NAMING.rowSeconds + NAMING.after) this.askBackstage();
  }

  /** ⚑ S356 — junie: "maya. look what's behind the stage", and one chip, Show me (his Q8: a press, never a turn) */
  private askBackstage(): void {
    this.phase = 'turnAsk';
    this.tags = [{ who: BACK.ask.who, text: BACK.ask.text }];
    this.friendsChat.push({ ...BACK.ask });
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    if (ctx) setFont(ctx, 11);
    const w = Math.max(96, Math.ceil(ctx ? ctx.measureText(BACK.show).width : 60) + 30);
    this.hits = [{ x: Math.round(256 - w / 2), y: 384 - 46 - 8 - HOST_CHIP_H, w, h: HOST_CHIP_H, id: 'backstage-show' }];
    playOnce('card_junie.mp3');
    this.version++; this.studioV++;
  }

  /** her press: the piece turns her (a blink); at its bottom the stage behind her becomes the people's */
  private showBackstage(): void {
    if (this.phase !== 'turnAsk') return;
    this.hits = [];
    this.tags = [];
    playOnce('ui_press.mp3');
    this.phase = 'backstage';
    this.backT = 0; this.darkAt = -1; this.turningBack = false;
    turnTo('backstage', () => this.freeStage());
    this.version++;
  }

  private backRowsDark(): number {
    if (this.backT < BACK.holdSeconds) return 0;
    return Math.min(BACK.rows.length + 2, 1 + Math.floor((this.backT - BACK.holdSeconds) / BACK.rowDarkSeconds));
  }

  private updateBackstage(dt: number): void {
    const b4 = this.backRowsDark();
    this.backT += dt;
    // the people's stream runs on behind her (its clock, its screen)
    this.streamT += dt;
    const now = this.backRowsDark();
    if (now !== b4) this.version++;
    if (now >= BACK.rows.length + 2 && this.darkAt < 0) this.darkAt = this.backT;
    if (this.darkAt >= 0 && !this.hits.length && !this.turningBack && this.backT >= this.darkAt + BACK.backAfter) {
      const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
      if (ctx) setFont(ctx, 11);
      const w = Math.max(84, Math.ceil(ctx ? ctx.measureText(BACK.back).width : 40) + 30);
      this.hits = [{ x: Math.round(256 - w / 2), y: 384 - 46 - 8 - HOST_CHIP_H, w, h: HOST_CHIP_H, id: 'backstage-back' }];
      this.version++;
    }
    // the turn returns by itself once the dashboard has been dark a while
    if (this.darkAt >= 0 && this.backT >= this.darkAt + BACK.autoBack) this.goBack();
  }

  /** Back (pressed, or by itself): the blink again; at its bottom the night begins */
  private goBack(): void {
    if (this.phase !== 'backstage' || this.turningBack) return;
    this.turningBack = true;
    this.hits = [];
    this.version++;
    turnTo('stage', () => this.startNight());
  }

  /** ⚑ the stage becomes theirs — at the bottom of the blink, while her back is turned (sequence over presence) */
  private freeStage(): void {
    if (this.worldIn) return;
    this.worldIn = true;
    this.worldOn = true;
    setCommonsHost(false);
    setCommonsWorld(true);
    setCommonsFigures(true);
    setCommonsDance(true);
    roomBed.set(script.room.landing, 1.5);
    setBallLight({ level: 1, station: 2.5, flare: 0 });
    this.streamT = FRAME.clearSeconds;
    this.count = ST.count + 1;
    this.version++;
  }

  /** ⚑ the night: today's stream, unchanged and respite — "maya joined", the welcomes, her one act */
  private startNight(): void {
    this.freeStage();
    this.tags = [];
    this.phase = 'stream';
    this.onDeviceOff?.();
    this.queue = [...ST.before.map((l) => ({ ...l })), { who: '', text: ST.joined, sys: true, mark: 'joined' as const },
      ...ST.welcome.map((l) => ({ ...l })), { ...ST.ask, mark: 'ask' as const }];
    this.nextLineAt = this.streamT + 0.6;
    this.version++;
  }


  /** a system sound: it plays, and the music ducks under it for as long */
  private sys(name: string, seconds: number): HTMLAudioElement | null {
    roomBed.duck(DUCK_DB, seconds);
    return playOnce(name);
  }

  update(dt: number): void {
    if (this.phase === 'host') { this.updateHost(dt); return; }
    if (this.phase === 'tryon') {
      const t4 = this.tryT;
      this.tryT += dt;
      if (Math.floor(t4 * 8) !== Math.floor(this.tryT * 8)) this.version++;
      this.updateHost(0);   // the studio's audience keeps posting behind the mirror
      if (this.tryT >= TRYON.link) this.invite();
      return;
    }
    if (this.phase === 'raid') { this.updateRaid(dt); return; }
    if (this.phase === 'naming') { this.updateNaming(dt); return; }
    if (this.phase === 'turnAsk') return;
    if (this.phase === 'backstage') { this.updateBackstage(dt); return; }
    if (this.phase === 'idle' || this.phase === 'invited' || (this.phase === 'done' && !this.worldOn)) return;
    // ── inside the stream ──
    const s4 = this.streamT;
    this.streamT += dt;
    if (this.streamT < FRAME.clearSeconds + 0.2 && Math.floor(s4 * 12) !== Math.floor(this.streamT * 12)) this.version++;
    // the stage light walks the floor with the dancer, slowly; a landing lifts it
    const flare = this.answeredAt >= 0 && this.streamT - this.answeredAt < 2 ? 1 : 0;
    setBallLight({ level: 1, station: 2.5 + 1.2 * Math.sin(this.streamT * 0.25), flare });
    // ⚑ the stream keeps going under the failure: its clock, its chat and its screen run on after the session ends
    // the chat, a line at a time (it waits on her chips; it never waits on a clock to let her in)
    if (!this.asking && this.streamT >= this.nextLineAt && this.queue.length) {
      const l = this.queue.shift()!;
      this.say(l);
      if (l.mark === 'joined') { this.count = ST.count + 1; greetCommonsFigures(true); }
      if (l.gift) this.gave = true;
      if (l.mark === 'ask') { this.asking = true; this.publishChips(); }
      this.nextLineAt = this.streamT + ST.lineSeconds * (l.mark === 'joined' ? 1.4 : 1);
    }
    if (this.phase === 'stream' && this.answered && this.intrusionT < 0 && !this.intrusionDone
        && this.streamT >= this.answeredAt + SYS.afterAnswer) {
      this.intrusionT = 0;
      this.reconnect = playLoop('reconnect_2026.mp3');
      this.version++;
    }
    if (this.intrusionT >= 0) {
      const i4 = this.intrusionT;
      this.intrusionT += dt;
      if (Math.floor(i4 * 8) !== Math.floor(this.intrusionT * 8)) this.version++;
      if (this.reconnect) roomBed.duck(DUCK_DB, 0.3);
      if (!this.refusedOnce && this.intrusionT >= SYS.hold - 3.2) {
        // the count holds; the connection is refused because the room is full — nobody in the chat says so
        this.refusedOnce = true;
        stopClip(this.reconnect); this.reconnect = null;
        this.sys('ui_refuse.mp3', 1.2);
      }
      if (this.intrusionT >= SYS.hold) {
        this.intrusionT = -1;
        this.intrusionDone = true;
        this.phase = 'after';
        this.afterT = 0;
        this.sys('terminate_2026.mp3', 1.0);
        this.version++;
      }
    }
    if (this.phase === 'after') {
      const a4 = this.afterT;
      this.afterT += dt;
      if (Math.floor(a4 * 8) !== Math.floor(this.afterT * 8)) this.version++;
      if (this.afterT >= SYS.terminateSeconds) this.close();
    }
  }

  private publishChips(): void {
    this.hits = ST.chips.map((c, k) => ({ x: Math.round(256 - CHIP_W - 6 + k * (CHIP_W + 12)), y: CHIPS_Y, w: CHIP_W, h: 24, id: `stream-${c}` }));
    this.version++;
  }

  /** a chat line arrives: on the screen in the world, and as a subtitle in the frame */
  private say(l: Line & { sys?: boolean }): void {
    this.chat.push(l);
    if (this.chat.length > 40) this.chat.shift();
    this.showCaption();
  }

  /** her one act: dance or stay. The room answers; nothing is filed (respite). */
  private choose(c: string): void {
    if (!this.asking || this.answered) return;
    this.asking = false;
    this.answered = c;
    this.answeredAt = this.streamT;
    this.hits = [];
    answerCommonsFigures();
    greetCommonsFigures(false);
    // the answers, then the night carrying on
    this.queue = [...(ST.answer[c] ?? []), ...ST.after, ...ST.after.slice(0, 4)];
    this.nextLineAt = this.streamT + 0.6;
    this.version++;
  }

  /** ⚑ THE END OF THE BEAT: the system has ended her session; the stream has not ended. The figures and the music
   *  carry on under the glitch (E4Shell); the world goes when the device stops (`leaveWorld`). */
  close(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.hits = [];
    this.asking = false;
    stopClip(this.reconnect); this.reconnect = null;
    this.version++;
    this.onOver?.();
  }

  /** kept for the shell's old call; there are no lamps any more */
  clearLamps(): void { /* the lamps are gone (ENDING_TRANSJESUS) */ }
  /** the device has stopped: the stream's place goes and the room she was in comes back */
  leaveWorld(): void {
    this.worldOn = false;
    setCommonsHost(false);
    setCommonsWorld(false); setCommonsFigures(false); setCommonsDance(false); greetCommonsFigures(false);
    setBallLight(null);
    this.removeCaption();
  }

  /** the press. With coordinates: the link's chip, or one of hers. Without (a press anywhere in the world): while her
   *  chips wait, a press is a dance. Consumed always. */
  handleClick(x?: number, y?: number): boolean {
    if (this.phase === 'host' || this.phase === 'tryon') {
      // the host's chips, or nothing (consumed either way: the glass is on her face)
      if (this.hostAsk < 0 || x === undefined || y === undefined) return true;
      const h = this.hits.find((r) => x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6);
      if (h) this.answerHost(Number(h.id.replace('host-chip-', '')));
      return true;
    }
    if (this.phase === 'turnAsk' || this.phase === 'backstage') {
      if (x === undefined || y === undefined) return true;
      const h = this.hits.find((r) => x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6);
      if (h?.id === 'backstage-show') this.showBackstage();
      else if (h?.id === 'backstage-back') { playOnce('ui_press.mp3'); this.goBack(); }
      return true;
    }
    if (this.phase === 'invited') {
      if (x === undefined || y === undefined) return true;
      const h = this.hits[0];
      if (h && x >= h.x - 4 && x <= h.x + h.w + 4 && y >= h.y - 4 && y <= h.y + h.h + 4) {
        this.onJoin?.();
        this.begin();
      }
      return true;
    }
    if (this.asking) {
      if (x === undefined || y === undefined) { this.choose(ST.chips[0]); return true; }
      const h = this.hits.find((r) => x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6);
      if (h) this.choose(h.id.replace('stream-', ''));
      return true;
    }
    return true;
  }

  // ── the glass ───────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, _x: number, _y: number, _w: number): void {
    if (this.phase === 'host') { this.drawHostGlass(ctx, W, H); return; }
    // ⚑ S354 — the try-on is the host's mirror now: it fills the glass from "who you could be" until the stream does
    const k = this.environmentK;
    if (k > 0 && (this.phase === 'tryon' || this.phase === 'invited' || this.phase === 'raid')) {
      const was = ctx.globalAlpha;
      ctx.globalAlpha = was * k;
      drawTryOn(ctx, W, H, Math.min(this.tryT, TRYON.link), HOST.speaker);
      ctx.globalAlpha = was;
    }
    if (this.phase === 'tryon') return;
    if (this.phase === 'invited') { this.drawInvite(ctx); return; }
    if (this.phase === 'raid') { this.drawRaidPanel(ctx, W, H); return; }
    if (this.phase === 'naming') { this.drawHostGlass(ctx, W, H); this.drawTags(ctx, W, H); return; }
    if (this.phase === 'turnAsk' || this.phase === 'backstage') { this.drawTags(ctx, W, H); this.drawGlassChips(ctx); return; }
    if (this.phase === 'stream' && this.streamT < FRAME.clearSeconds) {
      // the picture lets go of the glass and the place is there
      const was = ctx.globalAlpha;
      ctx.globalAlpha = was * (1 - this.streamT / FRAME.clearSeconds);
      streamScene(ctx, 0, 0, W, H, this.streamT + 30, streamShot(this.streamT + 30), 0.3);
      ctx.globalAlpha = was;
    }
    if (this.asking) this.drawChips(ctx);
    if (this.intrusionT >= 0) this.drawIntrusion(ctx, W, H, this.intrusionT);
    if (this.phase === 'after') this.drawTermination(ctx, W, H, this.afterT);
  }

  /** ⚑ S356 — the backstage's chips (Show me, Back), in the room's pink, above where the caption band sits */
  private drawGlassChips(ctx: CanvasRenderingContext2D): void {
    for (const h of this.hits) {
      pill(ctx, h.x, h.y, h.w, h.h, PLACE.textileHi);
      setFont(ctx, 11); ctx.fillStyle = PLACE.ink;
      const label = h.id === 'backstage-show' ? BACK.show : BACK.back, lw = Math.ceil(ctx.measureText(label).width);
      ctx.fillText(label, h.x + Math.round((h.w - lw) / 2), h.y + 7);
    }
  }

  /**
   * ⚑ S356 — THE OPERATOR VIEW, the host's real face (its own plane behind her, 352 × 198 at ×2). Sharp and cold —
   * the witness side is the high-definition side — its title, a recording light, the lead's rows, and the words she
   * typed this week, quoted back as data. The people's light reaches it last: it goes dark row by row, the title last.
   */
  drawBackstage(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    if (!this.backstageOn) return;
    const dark = this.backRowsDark();
    const total = BACK.rows.length + 2;
    // the title (dark last)
    if (dark < total) {
      px(ctx, 0, 0, W, 20, ERA4.panel);
      setFont(ctx, 9); ctx.fillStyle = ERA4.textHi; ctx.fillText(BACK.title, 8, 6);
      const rw = Math.ceil(ctx.measureText(BACK.rec).width);
      ctx.fillStyle = ERA4.dim; ctx.fillText(BACK.rec, W - 8 - rw, 6);
      px(ctx, W - 16 - rw, 9, 5, 5, WEB.danger);
    } else px(ctx, 0, 19, W, 1, PLACE.textileHi);
    // the rows: each goes dark in turn, leaving a thread of the people's warm light where it was
    BACK.rows.forEach((r, i) => {
      const y = 28 + i * 20;
      if (i < dark) { px(ctx, 10, y + 6, W - 20, 1, PLACE.textileHi); return; }
      setFont(ctx, 8); ctx.fillStyle = ERA4.meta; ctx.fillText(r.k.toUpperCase(), 10, y + 2);
      setFont(ctx, 11); ctx.fillStyle = ERA4.textHi; ctx.fillText(r.v, 112, y);
      px(ctx, 10, y + 15, W - 20, 1, ERA4.rule);
    });
    // the words she typed, quoted back as data
    const wy = 28 + BACK.rows.length * 20 + 6;
    if (BACK.rows.length < dark) { px(ctx, 10, wy + 10, W - 20, 1, PLACE.textileHi); return; }
    setFont(ctx, 8); ctx.fillStyle = ERA4.meta; ctx.fillText(BACK.wordsTitle.toUpperCase(), 10, wy);
    const words = (this.wordsSource?.() ?? []).slice(-8);
    const line = words.length ? words.map((w) => `“${w}”`).join('  ·  ') : '—';
    setFont(ctx, 10); ctx.fillStyle = ERA4.text;
    wrapText(ctx, line, W - 20).slice(0, 3).forEach((row, k) => ctx.fillText(row, 10, wy + 13 + k * 13));
  }

  /** ⚑ Junie's message: a light card on the dark glass, her mark in the room's pink, the link, and the system's own
   *  admission that the mute did not hold. One pill. No decline exists, and nothing narrates the choice. */
  private drawInvite(ctx: CanvasRenderingContext2D): void {
    roundRect(ctx, INVITE.x, INVITE.y + 2, INVITE.w, INVITE.h, 10, ERA4.panelEdge);
    roundRect(ctx, INVITE.x, INVITE.y, INVITE.w, INVITE.h, 10, WEB.card);
    avatar(ctx, INVITE.x + 14, INVITE.y + 14, 26, PLACE.textileHi, INV.from.slice(0, 1));
    setFont(ctx, 11); ctx.fillStyle = WEB.ink; ctx.fillText(INV.from, INVITE.x + 50, INVITE.y + 14);
    setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(INV.meta, INVITE.x + 50, INVITE.y + 28);
    setFont(ctx, 14); ctx.fillStyle = WEB.ink; ctx.fillText(INV.line, INVITE.x + 14, INVITE.y + 54);
    setFont(ctx, 10);
    const lw = Math.ceil(ctx.measureText(INV.link).width) + 22;
    roundRect(ctx, INVITE.x + 14, INVITE.y + 78, lw, 18, 9, PLACE.wallHi);
    ctx.fillStyle = PLACE.ink; ctx.fillText(INV.link, INVITE.x + 25, INVITE.y + 82);
    px(ctx, INVITE.x + 25, INVITE.y + 92, lw - 22, 1, PLACE.ink);
    pill(ctx, JOIN.x, JOIN.y, JOIN.w, JOIN.h, PLACE.textileHi);
    setFont(ctx, 10); ctx.fillStyle = PLACE.ink;
    const cw = Math.ceil(ctx.measureText(INV.chip).width);
    ctx.fillText(INV.chip, JOIN.x + Math.round((JOIN.w - cw) / 2), JOIN.y + 6);
  }

  /** ⚑ S355 — the host's own frame, trying to file the raid and failing, row by row: compact, low on the glass, so
   *  the screen — the count climbing, the chat filling — stays in view above it */
  private drawRaidPanel(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const pw = 320, ph = 74, px0 = Math.round((W - pw) / 2), y0 = H - 46 - ph - 6;
    roundRect(ctx, px0, y0 + 2, pw, ph, 8, ERA4.panelEdge);
    roundRect(ctx, px0, y0, pw, ph, 8, ERA4.panel);
    setFont(ctx, 9); ctx.fillStyle = ERA4.glow; ctx.fillText(RAID.panel, px0 + 10, y0 + 7);
    FRAME.rows.forEach((r, i) => {
      if (i >= this.rowsShown) return;
      const cx = px0 + 10 + (i % 2) * 156, ry = y0 + 24 + Math.floor(i / 2) * 25;
      setFont(ctx, 9); ctx.fillStyle = ERA4.meta; ctx.fillText(r.k, cx, ry);
      const kw = Math.ceil(ctx.measureText(r.k + '  ').width);
      setFont(ctx, 12); ctx.fillStyle = ERA4.textHi; ctx.fillText(r.v, cx + kw, ry - 2);
    });
  }

  /**
   * ⚑ S355 — THE TAGS, stamped above the host's caption band: the handle in its colour, the words in the caption's
   * ink, on the band's dark — the same size as the host's own line, because these few words are the lesson. The
   * newest sits nearest the band; two older ones above it, dimmer. The panel's own answer ("source: none") is
   * stamped in the host's pale, with no handle: it is the product answering itself.
   */
  private drawTags(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const bandY = H - 46;
    const shown = this.tags.slice(-3);
    shown.forEach((t, i) => {
      const fromNewest = shown.length - 1 - i;
      const y = bandY - 22 - 32 - fromNewest * 32;
      const was = ctx.globalAlpha;
      ctx.globalAlpha = was * (fromNewest === 0 ? 1 : 0.62);
      setFont(ctx, 16);
      const tw = Math.ceil(ctx.measureText(t.text).width);
      setFont(ctx, 12);
      const hw = t.who ? Math.ceil(ctx.measureText(t.who).width) + 10 : 0;
      const w = tw + hw + 24, x = Math.round((W - w) / 2);
      roundRect(ctx, x, y, w, 26, 6, CLIP.band);
      px(ctx, x, y, 3, 26, t.sys ? ERA4.glow : t.who === 'junie' ? BALL.whoFriend : BALL.whoMC);
      if (t.who) { ctx.fillStyle = t.who === 'junie' ? BALL.whoFriend : BALL.whoMC; ctx.fillText(t.who, x + 12, y + 8); }
      setFont(ctx, 16);
      ctx.fillStyle = t.sys ? ERA4.glow : CLIP.ink;
      ctx.fillText(t.text, x + 12 + hw, y + 5);
      ctx.globalAlpha = was;
    });
  }

  /** her two chips, low on the clear glass in the room's pink — the line above them asked for nothing */
  private drawChips(ctx: CanvasRenderingContext2D): void {
    for (const h of this.hits) {
      pill(ctx, h.x, h.y, h.w, h.h, h.id === 'stream-dance' ? PLACE.textileHi : PLACE.wallHi);
      setFont(ctx, 11); ctx.fillStyle = PLACE.ink;
      const label = h.id.replace('stream-', '');
      const lw = Math.ceil(ctx.measureText(label).width);
      ctx.fillText(label, h.x + Math.round((h.w - lw) / 2), h.y + 7);
    }
  }

  /** the agent back on the glass: reconnecting, a bar that climbs and is pushed back, what it cannot do, the count */
  private drawIntrusion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    const fade = Math.min(1, t / 0.6, (SYS.hold - t) / 0.8);
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * Math.max(0, fade);
    const cw = 284, ch = 118, cx = Math.round((W - cw) / 2), cy = Math.round(H * 0.24);
    roundRect(ctx, cx, cy + 2, cw, ch, 10, ERA4.panelEdge);
    roundRect(ctx, cx, cy, cw, ch, 10, ERA4.panel);
    avatar(ctx, cx + 12, cy + 12, 22, WEB.primary, 'S');
    setFont(ctx, 10); ctx.fillStyle = ERA4.textHi; ctx.fillText(SYS.mark, cx + 42, cy + 12);
    setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(SYS.reconnecting, cx + 42, cy + 25);
    setFont(ctx, 9); ctx.fillStyle = ERA4.meta; ctx.fillText(SYS.restoring, cx + 12, cy + 44);
    const rise = 2.6, back = Math.max(0, (t - (SYS.hold - 3.2)) / 2.4);
    const bar = t < rise ? (t / rise) * 0.86 : back > 0 ? Math.max(0, 0.9 * (1 - back * back)) : Math.min(0.94, 0.86 + (t - rise) * 0.012);
    pill(ctx, cx + 12, cy + 58, cw - 24, 5, ERA4.rule);
    pill(ctx, cx + 12, cy + 58, Math.round((cw - 24) * bar), 5, back > 0 ? ERA4.lDim : ERA4.l);
    // what it cannot do with what it is looking at
    setFont(ctx, 8); ctx.fillStyle = ERA4.dim;
    SYS.cannot.forEach((c, i) => { if (t > 1.2 + i * 1.4) ctx.fillText(c, cx + 12, cy + 70 + i * 11); });
    // the room's count, holding and going up, in the room's colour
    const n = (this.count + Math.floor(Math.max(0, t - 1) * 0.6));
    const present = SYS.present.replace('{n}', String(n));
    setFont(ctx, 9); ctx.fillStyle = PLACE.textileHi;
    ctx.fillText(present, cx + cw - 12 - Math.ceil(ctx.measureText(present).width), cy + 98);
    if (back > 0) { ctx.fillStyle = ERA4.dim; ctx.fillText(SYS.refused, cx + 12, cy + 98); }
    ctx.globalAlpha = was;
  }

  /** the shutdown, named in the system's own ideology — the beat before the glitch */
  private drawTermination(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    const k = Math.min(1, t / 0.5);
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * k;
    const cw = 300, ch = 92, cx = Math.round((W - cw) / 2), cy = Math.round(H * 0.30);
    roundRect(ctx, cx, cy + 2, cw, ch, 10, ERA4.panelEdge);
    roundRect(ctx, cx, cy, cw, ch, 10, ERA4.field);
    px(ctx, cx, cy, cw, 3, ERA4.l);
    setFont(ctx, 14); ctx.fillStyle = ERA4.textHi; ctx.fillText(SYS.terminated, cx + 16, cy + 16);
    setFont(ctx, 10); ctx.fillStyle = ERA4.l; ctx.fillText(SYS.reason, cx + 16, cy + 40);
    setFont(ctx, 8); ctx.fillStyle = ERA4.dim;
    for (const row of wrapText(ctx, SYS.terminatedNote, cw - 32)) ctx.fillText(row, cx + 16, cy + 62);
    ctx.globalAlpha = was;
  }

  /**
   * ⚑ S354 — THE GLASS IN THE HOST'S STUDIO: clear (the world is the studio), with the host's caption band where the
   * try-on's is — its mark on a tab above it, its line in the band — and her two chips above that when it asks.
   * The host has no voice: this band is the only place it speaks (and the screen's picture, for the eye).
   */
  private drawHostGlass(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const bandY = H - 46;
    if (this.hostLine) {
      px(ctx, 0, bandY, W, BAND_H, CLIP.band);
      setFont(ctx, 9);
      const tag = HOST.speaker, tw = Math.ceil(ctx.measureText(tag).width) + 12;
      px(ctx, 8, bandY - 13, tw, 13, CLIP.band);
      ctx.fillStyle = ERA4.glow; ctx.fillText(tag, 14, bandY - 11);
      setFont(ctx, 16);
      const rows = wrapText(ctx, this.hostLine, W - 24);
      const one = rows.length === 1;
      if (!one) setFont(ctx, 12);
      ctx.fillStyle = CLIP.ink;
      rows.slice(0, 2).forEach((r, i) => {
        const lw = Math.ceil(ctx.measureText(r).width);
        ctx.fillText(r, Math.max(8, Math.round((W - lw) / 2)), bandY + (one ? 9 : 4 + i * 14));
      });
    }
    if (this.hostAsk >= 0) {
      const ex = HOST.exchanges[this.hostAsk];
      this.hits.forEach((h, k) => {
        pill(ctx, h.x, h.y, h.w, h.h, PLACE.wallHi);
        setFont(ctx, 11); ctx.fillStyle = PLACE.ink;
        const label = ex.chips[k].label, lw = Math.ceil(ctx.measureText(label).width);
        ctx.fillText(label, h.x + Math.round((h.w - lw) / 2), h.y + 7);
      });
    }
  }

  /**
   * ⚑ S354 — THE STUDIO'S SCREEN (the stream's plane, in the host's layout; 352 × 198 at ×2). The product's own
   * glossy pale page: LIVE · Shepherd Live™ · Jesus · AI host · 1 viewer; its badges (24/7, verified ✓); its
   * picture — the host on a pale set, the halo, "for your safety" as the lower third; the Friends' column; its
   * numbers along the foot. During the recap the picture is her week. Each of the six surfaces the people take back
   * in Part B reads `freed` (none is, in Part A).
   */
  private drawStudio(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const F = this.freed;
    px(ctx, 0, 0, W, H, WEB.bg);
    // the title bar
    px(ctx, 0, 0, W, 18, WEB.card);
    if (Math.floor(this.hostT * 1.5) % 2 === 0) px(ctx, 7, 6, 6, 6, WEB.danger);
    setFont(ctx, 9); ctx.fillStyle = WEB.ink; ctx.fillText(HOST.studio.live, 17, 4);
    ctx.fillText(HOST.mark, 45, 4);
    const mw = Math.ceil(ctx.measureText(HOST.mark).width);
    ctx.fillStyle = WEB.muted; ctx.fillText('·  ' + HOST.title, 52 + mw, 4);
    const v = (this.count === 1 ? HOST.studio.viewers : HOST.studio.viewersMany).replace('{n}', String(this.count));
    ctx.fillStyle = this.count > 1 ? PLACE.textileHi : WEB.ink;
    ctx.fillText(v, W - 7 - Math.ceil(ctx.measureText(v).width), 4);
    px(ctx, 0, 18, W, 1, WEB.cardEdge);
    // the badges
    setFont(ctx, 8);
    let bx = 7;
    const badge = (label: string, on: boolean, fill: string): void => {
      const w = Math.ceil(ctx.measureText(label).width) + 12;
      pill(ctx, bx, 22, w, 12, on ? fill : ERA4.ruleHi);
      ctx.fillStyle = on ? WEB.ink : ERA4.dim; ctx.fillText(label, bx + 6, 24);
      bx += w + 5;
    };
    badge(HOST.studio.always, !F.has('always'), ERA4.glow);
    badge(HOST.studio.verified, true, ERA4.l);
    ctx.fillStyle = WEB.muted;
    const pt = HOST.studio.partner;
    ctx.fillText(pt, W - 7 - Math.ceil(ctx.measureText(pt).width), 24);
    // the picture (left) and the Friends' column (right)
    const top = 38, foot = 22, cw = 136, pw = W - cw - 10, ph = H - top - foot - 4;
    // the recap is the host's highlight while it talks and through its mirror; after that the picture is the host again
    if (this.recapT >= 0 && (this.phase === 'host' || this.phase === 'tryon' || this.phase === 'invited')) this.drawRecap(ctx, 4, top, pw, ph);
    else this.drawHostPicture(ctx, 4, top, pw, ph, F);
    const x0 = W - cw - 4;
    px(ctx, x0, top, cw, ph, F.has('friends') ? ERA4.panel : WEB.card);
    // ⚑ his note (10 Nov): the account's name once, as the column's header — not on every post; the posts are the
    //   same few lines from the one account, which is the point
    setFont(ctx, 8);
    ctx.fillStyle = F.has('friends') ? ERA4.dim : ERA4.meta; ctx.fillText(HOST.friends.who, x0 + 6, top + 5);
    px(ctx, x0 + 6, top + 16, cw - 12, 1, F.has('friends') ? ERA4.rule : WEB.cardEdge);
    setFont(ctx, 9);
    const lines = this.friendsChat.slice(-Math.max(1, Math.floor((ph - 26) / 13)));
    let y = top + ph - 4 - lines.length * 13;
    const dark = F.has('friends');
    for (const l of lines) {
      let x = x0 + 6;
      if (l.who) {
        // ⚑ S355 — the people, arrived: their handles in their colours (warm ink on the product's pale column)
        ctx.fillStyle = dark ? (l.who === 'junie' ? BALL.whoFriend : BALL.whoMC) : PLACE.ink;
        ctx.fillText(l.who, x, y); x += Math.ceil(ctx.measureText(l.who + ' ').width);
        ctx.fillStyle = dark ? ERA4.textHi : WEB.ink;
      } else ctx.fillStyle = dark ? ERA4.dim : WEB.ink;   // the Friends' lines: buried, and dim once the column is theirs
      ctx.fillText(l.text, x, y);
      y += 13;
    }
    // the numbers, along the foot
    const fy = H - foot;
    px(ctx, 0, fy, W, foot, F.has('metrics') ? ERA4.panel : WEB.card);
    px(ctx, 0, fy, W, 1, WEB.cardEdge);
    if (!F.has('metrics')) {
      const m = HOST.metrics;
      const row = `${m.restored}   ·   ${m.peace}   ·   ${m.you.replace('{p}', String(m.p))}`;
      setFont(ctx, 9); ctx.fillStyle = WEB.ink;
      ctx.fillText(row, Math.round((W - ctx.measureText(row).width) / 2), fy + 6);
    } else if (this.noSource) {
      // ⚑ S355 — the panel answers its own question, and empties: nothing else is said about its numbers
      const row = NAMING.rows.find((r) => r.answer)?.answer ?? '';
      setFont(ctx, 9); ctx.fillStyle = ERA4.glow;
      ctx.fillText(row, Math.round((W - ctx.measureText(row).width) / 2), fy + 6);
    }
    // ⚑ S355 — the raid's notice, across the top of the picture, until the picture is theirs
    if ((this.phase === 'raid' || this.phase === 'naming') && !F.has('picture')) {
      const t = RAID.notice.replace('{n}', String(RAID.n));
      setFont(ctx, 9);
      const tw = Math.ceil(ctx.measureText(t).width) + 16;
      px(ctx, 4, top, Math.min(pw, tw), 15, PLACE.textileHi);
      ctx.fillStyle = PLACE.ink; ctx.fillText(t, 12, top + 3);
    }
  }

  /** the host on its pale set: a faceless robed figure, the halo (warm once the people take it), the lower third */
  private drawHostPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, F: Set<HostSurface>): void {
    if (F.has('picture')) {
      // ⚑ S355 — junie's "she's right here": the host's picture gives way to the people's broadcast
      streamScene(ctx, x, y, w, h, this.nameT + 30, streamShot(this.nameT + 30), 0.3);
      return;
    }
    px(ctx, x, y, w, h, PLACE.sky);
    px(ctx, x, y, w, Math.round(h * 0.45), PLACE.skyLo);
    px(ctx, x, y + h - 26, w, 26, ERA4.photoSkyHi);   // the set's floor
    const cx = x + Math.round(w / 2), base = y + h - 18;
    const breathe = Math.round(Math.sin(this.hostT * 0.8) * 1);
    // the halo: a ring behind the head
    const hc = F.has('halo') ? PLACE.textileHi : ERA4.glow;
    const hy = base - 98 + breathe;
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      px(ctx, cx + Math.round(Math.cos(t) * 20) - 1, hy + Math.round(Math.sin(t) * 20) - 1, 3, 3, hc);
    }
    // the robe, widening to the floor; the arms a little open; the head, faceless
    px(ctx, cx - 18, base - 42, 36, 42, WEB.card);
    px(ctx, cx - 14, base - 72, 28, 32, WEB.card);
    px(ctx, cx - 14, base - 58, 28, 4, ERA4.glow);
    px(ctx, cx - 30, base - 66, 14, 8, WEB.card); px(ctx, cx + 16, base - 66, 14, 8, WEB.card);
    px(ctx, cx - 36, base - 62, 8, 12, WEB.card); px(ctx, cx + 28, base - 62, 8, 12, WEB.card);
    px(ctx, cx - 9, hy - 10, 18, 22, ERA4.photoSkyHi);
    // the lower third, the product's promise
    if (!F.has('safety')) {
      setFont(ctx, 8);
      const t = HOST.studio.safety, tw = Math.ceil(ctx.measureText(t).width) + 14;
      px(ctx, x + 6, y + h - 20, tw, 13, ERA4.l);
      ctx.fillStyle = WEB.ink; ctx.fillText(t, x + 13, y + h - 18);
    }
  }

  /** the recap: her week, as the product's highlight — Day 1 → Day 7, the bar climbing 12% → 61% */
  private drawRecap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const R = HOST.recap;
    px(ctx, x, y, w, h, WEB.card);
    setFont(ctx, 10); ctx.fillStyle = WEB.ink;
    ctx.fillText(R.title, x + 12, y + 12);
    const k = Math.min(1, this.recapT / R.barSeconds), e = k * k * (3 - 2 * k);
    const p = Math.round(R.p0 + (R.p1 - R.p0) * e);
    const by = y + Math.round(h * 0.48), bw = w - 24;
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    ctx.fillText(R.from, x + 12, by - 14);
    ctx.fillText(R.to, x + 12 + bw - Math.ceil(ctx.measureText(R.to).width), by - 14);
    pill(ctx, x + 12, by, bw, 8, ERA4.ruleHi);
    pill(ctx, x + 12, by, Math.max(8, Math.round(bw * p / 100)), 8, ERA4.l);
    setFont(ctx, 14); ctx.fillStyle = WEB.ink;
    const pct = HOST.metrics.you.replace('{p}', String(p));
    ctx.fillText(pct, x + 12, by + 18);
  }

  /**
   * ⚑ THE STREAM'S OWN SCREEN, in the world behind the floor (352 × 198 at ×2). Left, the broadcast — the camera's
   * view of the floor she is standing on; right, wide and legible, the chat: the community, in its own words. The
   * title bar: LIVE, the mark, and the count, which goes to 42 when she is seen. No captions, no category, no rank —
   * there is nothing here the platform could file.
   */
  drawStream(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    if (!this.streaming) return;
    if (this.studio) { this.drawStudio(ctx, W, H); return; }
    const t = this.streamT + 30;
    const TB = 52, cw = 168, pw = W - cw - 6, ph = H - TB - 4;
    streamScene(ctx, 2, TB + 2, pw, ph, t, streamShot(t), this.answeredAt >= 0 && this.streamT - this.answeredAt < 3 ? 1 : 0);
    px(ctx, 0, 0, W, TB, ERA4.panel);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, 8, 7, 6, 6, WEB.danger);
    setFont(ctx, 9); ctx.fillStyle = ERA4.textHi; ctx.fillText(ST.live, 18, 5);
    ctx.fillStyle = ERA4.text; ctx.fillText(ST.mark, 46, 5);
    const watching = ST.watching.replace('{n}', String(this.count));
    ctx.fillStyle = this.count > ST.count ? PLACE.textileHi : ERA4.textHi;
    ctx.fillText(watching, W - 8 - Math.ceil(ctx.measureText(watching).width), 5);
    // Mutual aid belongs to the broadcast. The apparatus neither measures nor files it.
    px(ctx, 0, 20, W, 32, ERA4.panel);
    setFont(ctx, 8); ctx.fillStyle = ERA4.textHi;
    ctx.fillText(V3.fundraiser.title, 7, 23);
    ctx.fillText(V3.fundraiser.fund, 7, 34);
    // ⚑ S350 — noa's gift: a small tick by the fund bar and the bar a hair longer; no total, no thanks
    const tickW = this.gave ? Math.ceil(ctx.measureText(V3.fundraiser.tick).width) + 6 : 0;
    const barW = W - 14 - tickW;
    px(ctx, 7, 46, barW, 4, ERA4.rule);
    px(ctx, 7, 46, Math.round(barW * (this.gave ? V3.fundraiser.tickFraction : V3.fundraiser.fraction)), 4, PLACE.textileHi);
    if (this.gave) { ctx.fillStyle = PLACE.textileHi; ctx.fillText(V3.fundraiser.tick, W - 7 - tickW + 6, 43); }
    // the chat column
    const x0 = W - cw - 2;
    px(ctx, x0, TB, cw + 2, H - TB, ERA4.panel);
    const lines = this.chat.slice(-CHAT_SHOWN);
    const rows: { who: string; text: string; sys?: boolean }[] = [];
    setFont(ctx, 9);
    for (const l of lines) {
      const w = wrapText(ctx, l.text, cw - 14 - (l.sys ? 0 : Math.ceil(ctx.measureText(l.who + ' ').width)));
      rows.push({ who: l.who, text: w[0], sys: l.sys });
      for (const more of w.slice(1)) rows.push({ who: '', text: more, sys: l.sys });
    }
    const shownRows = rows.slice(-Math.floor((H - TB - 8) / 13));
    let y = H - 6 - shownRows.length * 13;
    shownRows.forEach((r, i) => {
      const newest = i >= shownRows.length - 2;
      let x = x0 + 7;
      if (r.sys) { ctx.fillStyle = PLACE.textileHi; ctx.fillText(r.text, x, y); y += 13; return; }
      if (r.who) { ctx.fillStyle = r.who === 'junie' ? PLACE.textileHi : PLACE.sunHi; ctx.fillText(r.who, x, y); x += Math.ceil(ctx.measureText(r.who + ' ').width); }
      else x += 10;
      ctx.fillStyle = newest ? ERA4.textHi : ERA4.text;
      ctx.fillText(r.text, x, y);
      y += 13;
    });
  }

  // ── the subtitle (frame chrome) ───────────────────────────────────────────
  private showCaption(): void {
    if (!this.caption) this.mountCaption();
    if (!this.caption) return;
    const el = this.caption;
    el.replaceChildren();
    const last = this.chat.slice(-3);
    last.forEach((s, i) => {
      const b = document.createElement('div');
      Object.assign(b.style, {
        alignSelf: 'flex-start', maxWidth: '86%', background: BALL.captionField, color: BALL.captionInk,
        borderRadius: '12px 12px 12px 3px', padding: '4px 11px 5px', opacity: i === last.length - 1 ? '1' : '0.6',
        borderLeft: `3px solid ${s.who === 'junie' || s.sys ? BALL.whoFriend : BALL.whoMC}`
      } as CSSStyleDeclaration);
      if (s.who) {
        const n = document.createElement('span');
        n.textContent = s.who + '  ';
        Object.assign(n.style, { font: '700 11px monospace', color: s.who === 'junie' ? BALL.whoFriend : BALL.whoMC } as CSSStyleDeclaration);
        b.appendChild(n);
      }
      const tx = document.createElement('span');
      tx.textContent = s.text;
      b.appendChild(tx);
      el.appendChild(b);
    });
    el.style.opacity = '1';
  }
  private mountCaption(): void {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'reinterp-ball-caption';
    el.setAttribute('aria-live', 'polite');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
      zIndex: '9', display: 'flex', flexDirection: 'column', gap: '5px', width: 'min(560px, 86vw)',
      font: '13px monospace', lineHeight: '1.45', opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s'
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    this.caption = el;
  }
  private removeCaption(): void { this.caption?.remove(); this.caption = null; }

  // ── review (?debug=1) ────────────────────────────────────────────────────
  /** land on a point in the beat directly (review only; in play everything runs forward from the session) */
  debugJumpTo(where: 'host' | 'recap' | 'tryon' | 'invited' | 'raid' | 'naming' | 'backstage' | 'stream' | 'ask' | 'intrusion' | 'after'): void {
    this.removeCaption();
    this.phase = 'idle';
    this.worldIn = false;
    if (where === 'host' || where === 'recap' || where === 'tryon') {
      this.startHost();
      if (where === 'host') return;
      // run the conversation through, pressing her first chip each time
      for (let i = 0; i < 400 && this.phaseId === 'host' && this.recapT < 0; i++) {
        this.hostNextAt = 0; this.update(0.01);
        if (this.hostAsk >= 0) this.answerHost(0);
      }
      if (where === 'recap') return;
      while (this.phaseId === 'host') { this.hostNextAt = 0; this.update(0.01); }
      return;
    }
    this.hits = [];
    this.asking = false; this.answered = null; this.answeredAt = -1;
    this.intrusionT = -1; this.intrusionDone = false; this.refusedOnce = false;
    this.chat = [];
    // ⚑ S355 — every later point begins in the host's studio and runs forward through it
    this.startHost();
    for (let i = 0; i < 400 && this.phaseId === 'host'; i++) {
      this.hostNextAt = 0; this.update(0.01);
      if (this.hostAsk >= 0) this.answerHost(0);
    }
    this.tryT = TRYON.link; this.update(0.01);
    if (where === 'invited') return;
    this.begin();
    if (where === 'raid') return;
    this.raidT = 60; this.update(0.01);
    if (where === 'naming') return;
    for (let i = 0; i < 2000 && this.phaseId === 'naming'; i++) this.update(0.05);
    this.showBackstage();
    if (where === 'backstage') return;
    this.backT = 120; this.darkAt = 0; this.update(0.01);
    if (where === 'stream') return;
    // the chat up to her chips
    this.streamT = FRAME.clearSeconds + 0.5;
    while (this.queue.length && !this.asking) { this.nextLineAt = 0; this.update(0.01); }
    if (where === 'ask') return;
    this.choose(ST.chips[0]);
    this.streamT += SYS.afterAnswer;
    this.update(0.01);
    if (where === 'intrusion') return;
    this.intrusionT = SYS.hold - 0.01;
    this.update(0.02);
  }
}
