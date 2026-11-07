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
import { ERA4, PLACE, WEB, BALL, photograph, roundRect, pill, avatar, webButton, visorEdge, streamScene, streamShot } from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { setBallLight, setCommonsWorld } from '../../room/cluster';
import { setCommonsFigures, setCommonsDance, answerCommonsFigures, greetCommonsFigures } from '../../room/commonsFigures';
import { playOnce, playLoop, stopClip, roomBed } from '../../audio/tapeAudio';
import { isSpeedrun, extraOn } from '../../state/cut';
import script from '../../../data/dialog/s4_ball.json';

interface Line { who: string; text: string }
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
const SESSION = script.session as unknown as {
  mark: string; title: string; line: string; preparing: string; begin: string; seconds: number;
  plan: { n: string; title: string; meta: string }[]; planTitle: string; environment: string;
  grounding: { title: string; in: string; out: string; note: string };
  recorded: { title: string; mark: string; intro: string; introSeconds: number; lines: string[] };
  groundSeconds: number; lineSeconds: number;
};

/** the invitation card, on the worn visor's 512 × 384 canvas */
const INVITE = { x: 108, y: 104, w: 296, h: 150 } as const;
const JOIN = { x: INVITE.x + 14, y: INVITE.y + INVITE.h - 34, w: 104, h: 22 } as const;
/** the player frame the link opens in, before it grows */
const PLAYER = { x: 40, y: 54, w: 300, h: 190 } as const;
/** her two chips, low on the clear glass, in the room's pink */
const CHIPS_Y = 262;
const CHIP_W = 92;
/** ⚑ the room ducks by this while a system sound plays (≈ 9 dB), as before */
const DUCK_DB = -9;
const BEGIN_W = 84;
/** how many chat lines the screen and the subtitles carry */
const CHAT_SHOWN = 9;

type Phase = 'idle' | 'invited' | 'frame' | 'grow' | 'stream' | 'after' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

/** the grounding runs in the review cut only; the visitors' version goes from Begin to the recording */
export function groundSeconds(): number { return isSpeedrun() && !extraOn('session') ? 0 : SESSION.groundSeconds; }
/** seconds from her Begin to Junie's link: (grounding), the introduction, two sentences, and 1.6 s into the third */
export function linkAfterBegin(): number { return groundSeconds() + SESSION.recorded.introSeconds + SESSION.lineSeconds * 2 + 1.6; }

export class E4Ball {
  /** bumped on every change to what the VISOR draws; E4Shell folds it into its own version (uploads on dirty only) */
  version = 0;
  /** the glass clears: the shell moves to its `ball` stage (still on her face) and the world shows through */
  onDeviceOff?: () => void;
  /** the beat is over — the apparatus fails next. Hands the era to its finale. */
  onOver?: () => void;
  /** she opened Junie's link. The shell files it; this file never touches a ledger. */
  onJoin?: () => void;
  /** the controls this surface publishes: the link's chip, then her two chips */
  hits: Hit[] = [];
  /** the session's Begin chip (drawn by `drawSession`, pressed through E4Shell) */
  sessionHits: Hit[] = [];

  private phase: Phase = 'idle';
  private t = 0;
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
  /** probes only: what she pressed (never filed — respite) */
  get choice(): string | null { return this.answered; }

  get live(): boolean { return this.phase !== 'idle' && this.phase !== 'done'; }
  get invited(): boolean { return this.phase === 'invited'; }
  get phaseId(): string { return this.phase; }
  /** her chips are on the glass, waiting (a probe reads it; the walker reads `hits`) */
  get callUp(): boolean { return this.asking; }
  /** how much of the agent's environment is still on the glass: all of it until the stream fills the glass */
  get environmentK(): number {
    if (this.phase === 'idle' || this.phase === 'invited' || this.phase === 'frame') return 1;
    if (this.phase === 'grow') return this.growK < 1 ? 1 : 0;
    return 0;
  }
  private get growK(): number { const k = Math.min(1, this.t / FRAME.growSeconds); return k * k * (3 - 2 * k); }
  /** the stream's screen in the world is on from the moment she is inside */
  get streaming(): boolean { return this.worldOn; }
  /** the stream is VIDEO: its screen repaints twelve times a second while it is on */
  get viewerCount(): number { return this.count; }
  get streamVersion(): number { return this.streaming ? 1 + Math.floor(this.streamT * 12) : 0; }
  /** true from the moment the glass clears — `E4Shell` reads it */
  get deviceOff(): boolean { return this.phase === 'stream' || this.phase === 'after'; }
  /** nothing here ends early on a press: the system ends it, and only in its own words */
  get returnable(): boolean { return false; }

  /** ⚑ Junie's link lands on the glass. The music is already audible through the wall while she decides. */
  invite(): void {
    if (this.phase !== 'idle') return;

    this.phase = 'invited';
    this.hits = [{ ...JOIN, id: 'commons-join' }];
    this.version++;
    playOnce('card_junie.mp3');   // the room's register, not the system's
    roomBed.set(script.room.bed, 4.0);
  }

  /** her press on the link: the platform frame opens and starts failing at its job */
  begin(): void {
    if (this.phase !== 'idle' && this.phase !== 'invited') return;
    this.hits = [];
    this.phase = 'frame';
    this.t = 0;
    this.rowsShown = 0;
    playOnce('ui_press.mp3');
    roomBed.set(script.room.bed, 2.0);
    this.version++;
  }

  /** a system sound: it plays, and the music ducks under it for as long */
  private sys(name: string, seconds: number): HTMLAudioElement | null {
    roomBed.duck(DUCK_DB, seconds);
    return playOnce(name);
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'invited' || (this.phase === 'done' && !this.worldOn)) return;
    const b4 = this.t;
    this.t += dt;
    if (this.phase === 'frame') {
      // the picture inside the frame moves, so the glass repaints a few times a second
      if (Math.floor(b4 * 8) !== Math.floor(this.t * 8)) this.version++;
      const due = Math.min(FRAME.rows.length, Math.floor(this.t / FRAME.rowSeconds));
      if (due > this.rowsShown) { this.rowsShown = due; this.sys('filter_deny.mp3', 0.6); this.version++; }
      if (this.t >= FRAME.rows.length * FRAME.rowSeconds + FRAME.holdSeconds) { this.phase = 'grow'; this.t = 0; }
      return;
    }
    if (this.phase === 'grow') {
      if (Math.floor(b4 * 12) !== Math.floor(this.t * 12)) this.version++;
      if (!this.worldIn && this.t >= FRAME.growSeconds) {
        // ⚑ at full cover the world behind the glass becomes the stream's place (app.ts's room hook cuts her to the
        //   spot in the same frame; in a headset that cut is presented through the particle veil)
        this.worldIn = true;
        this.worldOn = true;
        setCommonsWorld(true);
        setCommonsFigures(true);
        setCommonsDance(true);
        roomBed.set(script.room.landing, 1.5);
        setBallLight({ level: 1, station: 2.5, flare: 0 });
        this.phase = 'stream';
        this.streamT = 0;
        this.onDeviceOff?.();
        this.queue = [...ST.before.map((l) => ({ ...l })), { who: '', text: ST.joined, sys: true, mark: 'joined' as const },
          ...ST.welcome.map((l) => ({ ...l })), { ...ST.ask, mark: 'ask' as const }];
        this.nextLineAt = FRAME.clearSeconds + 0.6;
        this.version++;
      }
      return;
    }
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
    setCommonsWorld(false); setCommonsFigures(false); setCommonsDance(false); greetCommonsFigures(false);
    setBallLight(null);
    this.removeCaption();
  }

  /** the press. With coordinates: the link's chip, or one of hers. Without (a press anywhere in the world): while her
   *  chips wait, a press is a dance. Consumed always. */
  handleClick(x?: number, y?: number): boolean {
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
    if (this.phase === 'invited') { this.drawInvite(ctx); return; }
    if (this.phase === 'frame') { this.drawFrame(ctx, W, H, PLAYER.x, PLAYER.y, PLAYER.w, PLAYER.h, true); return; }
    if (this.phase === 'grow') {
      const k = this.growK;
      const x = Math.round(PLAYER.x * (1 - k)), y = Math.round(PLAYER.y * (1 - k));
      const w = Math.round(PLAYER.w + (W - PLAYER.w) * k), h = Math.round(PLAYER.h + (H - PLAYER.h) * k);
      this.drawFrame(ctx, W, H, x, y, w, h, false);
      return;
    }
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

  /** the player frame: the picture (already moving), its title bar, and the platform's panel failing row by row */
  private drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, w: number, h: number, panel: boolean): void {
    const t = this.t + 20;
    // the device's own frame round the player
    roundRect(ctx, x - 4, y - 22, w + 8, h + 26, 8, ERA4.panel);
    streamScene(ctx, x, y, w, h, t, streamShot(t), 0.2);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, x + 2, y - 15, 6, 6, WEB.danger);
    setFont(ctx, 9); ctx.fillStyle = ERA4.textHi; ctx.fillText(ST.live + '   ' + ST.mark, x + 12, y - 17);
    const n = ST.watching.replace('{n}', String(ST.count));
    ctx.fillText(n, x + w - Math.ceil(ctx.measureText(n).width), y - 17);
    if (!panel) return;
    // the panel: the platform's account of the stream, which it cannot give
    const px0 = x + w + 16, pw = W - px0 - 24;
    roundRect(ctx, px0, y - 22, pw, h + 26, 8, ERA4.panel);
    setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(FRAME.panel, px0 + 10, y - 14);
    FRAME.rows.forEach((r, i) => {
      if (i >= this.rowsShown) return;
      const ry = y + 6 + i * 40;
      setFont(ctx, 8); ctx.fillStyle = ERA4.meta; ctx.fillText(r.k, px0 + 10, ry);
      setFont(ctx, 12); ctx.fillStyle = ERA4.textHi; ctx.fillText(r.v, px0 + 10, ry + 12);
      px(ctx, px0 + 10, ry + 30, pw - 20, 1, ERA4.rule);
    });
    void H;
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
   * ⚑ THE CORRECTION SESSION (V11) — what the glass shows from the moment the device goes on until Junie's link: the
   * agent's own environment, the photograph it made framed on the wall (the composite: its picture of her), its mark,
   * one line, the plan, and one Begin. From her press: (review cut) one breath of grounding, then the recording,
   * introduced as what it is; the link lands on the third sentence's dash.
   */
  drawSession(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, begun = -1, offerBegin = false): void {
    const S = SESSION;
    px(ctx, 0, 0, W, H, ERA4.field);
    px(ctx, 0, Math.round(H * 0.58), W, H, ERA4.panel);
    px(ctx, 0, Math.round(H * 0.58), W, 1, ERA4.ruleHi);
    const pw = 150, ph = 93, fx = Math.round(W * 0.16), fy = Math.round(H * 0.22);
    px(ctx, fx - 6, fy - 6, pw + 12, ph + 12, ERA4.panelHi);
    photograph(ctx, fx, fy, pw, ph, true, 3);
    avatar(ctx, Math.round(W * 0.56), fy, 24, WEB.primary, 'S');
    setFont(ctx, 9); ctx.fillStyle = ERA4.meta;
    ctx.fillText(S.mark + '  ·  ' + S.title, Math.round(W * 0.56) + 32, fy + 2);
    const GROUND = groundSeconds();
    const item = begun < 0 ? 0 : begun < GROUND ? 1 : 2;
    const tx = Math.round(W * 0.56);
    this.sessionHits = [];
    if (item === 0) {
      setFont(ctx, 12); ctx.fillStyle = ERA4.textHi;
      let y = fy + 36;
      for (const row of wrapText(ctx, S.line, Math.round(W * 0.38))) { ctx.fillText(row, tx, y); y += 17; }
      setFont(ctx, 9); ctx.fillStyle = ERA4.dim; ctx.fillText(S.preparing, tx, y + 8);
      const bw = Math.round(W * 0.34);
      pill(ctx, tx, y + 22, bw, 5, ERA4.rule);
      pill(ctx, tx, y + 22, Math.round(bw * Math.min(0.82, t / (S.seconds * 1.3))), 5, ERA4.lDim);
      if (offerBegin) {
        const r = webButton(ctx, tx, y + 36, S.begin, 'primary', BEGIN_W);
        this.sessionHits = [{ ...r, id: 'session-begin' }];
      }
    } else if (item === 1) {
      const gt = begun;
      const phase = (gt % 8) / 8;
      const k = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const r = Math.round(14 + k * 14);
      const rx = tx + 60, ry = fy + 78;
      setFont(ctx, 9); ctx.fillStyle = ERA4.meta; ctx.fillText(S.grounding.title, tx, fy + 34);
      for (let i = 3; i >= 1; i--) {
        const was = ctx.globalAlpha;
        ctx.globalAlpha = was * (0.18 + 0.22 * (4 - i) / 3);
        roundRect(ctx, rx - r * i / 3, ry - r * i / 3, r * 2 * i / 3, r * 2 * i / 3, r * i / 3, ERA4.l);
        ctx.globalAlpha = was;
      }
      setFont(ctx, 12); ctx.fillStyle = ERA4.textHi;
      ctx.fillText(phase < 0.5 ? S.grounding.in : S.grounding.out, rx + 44, ry - 6);
      setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(S.grounding.note, tx, ry + 38);
    } else {
      const rt = begun - GROUND;
      setFont(ctx, 9); ctx.fillStyle = ERA4.meta; ctx.fillText(S.recorded.title, tx, fy + 34);
      const intro = rt < S.recorded.introSeconds;
      const rtl = Math.max(0, rt - S.recorded.introSeconds);
      const line = S.recorded.lines[Math.min(S.recorded.lines.length - 1, Math.floor(rtl / S.lineSeconds))];
      setFont(ctx, intro ? 10 : 12); ctx.fillStyle = intro ? ERA4.meta : ERA4.textHi;
      let y = fy + 52;
      for (const row of wrapText(ctx, intro ? S.recorded.intro : '“' + line + '”', Math.round(W * 0.38))) { ctx.fillText(row, tx, y); y += 17; }
      const bw = Math.round(W * 0.34);
      pill(ctx, tx, y + 10, bw, 4, ERA4.rule);
      pill(ctx, tx, y + 10, Math.round(bw * Math.min(1, rt / 11)), 4, ERA4.l);
      setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(S.recorded.mark, tx, y + 20);
    }
    // the plan, arriving item by item on the environment's floor
    const floor = Math.round(H * 0.58);
    const px0 = Math.round(W * 0.16), pw0 = Math.round(W * 0.68);
    setFont(ctx, 9); ctx.fillStyle = ERA4.meta; ctx.fillText(S.planTitle, px0, floor + 12);
    const envW = Math.ceil(ctx.measureText(S.environment).width) + 16;
    pill(ctx, px0 + pw0 - envW, floor + 10, envW, 13, ERA4.panelHi);
    ctx.fillStyle = ERA4.dim; ctx.fillText(S.environment, px0 + pw0 - envW + 8, floor + 12);
    const shown = Math.min(S.plan.length, Math.floor(t / 2.2));
    const running = GROUND > 0 ? item - 1 : item === 2 ? 1 : -1;
    S.plan.forEach((it, k) => {
      if (k >= shown) return;
      const ry = floor + 30 + k * 30;
      const on = k === running;
      const done = k < running;
      roundRect(ctx, px0, ry, pw0, 26, 5, on ? ERA4.rule : ERA4.panelHi);
      avatar(ctx, px0 + 8, ry + 5, 16, on ? ERA4.l : done ? WEB.accent : ERA4.lDim, done ? '✓' : it.n);
      setFont(ctx, 10); ctx.fillStyle = ERA4.textHi; ctx.fillText(it.title, px0 + 32, ry + 4);
      setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(it.meta, px0 + 32, ry + 15);
    });
    visorEdge(ctx, W, H);
  }
  /** the session's plan is all up after this long — then Begin is offered (E4Shell) */
  static readonly PLAN_SECONDS = 3 * 2.2;

  /**
   * ⚑ THE STREAM'S OWN SCREEN, in the world behind the floor (352 × 198 at ×2). Left, the broadcast — the camera's
   * view of the floor she is standing on; right, wide and legible, the chat: the community, in its own words. The
   * title bar: LIVE, the mark, and the count, which goes to 42 when she is seen. No captions, no category, no rank —
   * there is nothing here the platform could file.
   */
  drawStream(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    if (!this.streaming) return;
    const t = this.streamT + 30;
    const TB = 20, cw = 168, pw = W - cw - 6, ph = H - TB - 4;
    streamScene(ctx, 2, TB + 2, pw, ph, t, streamShot(t), this.answeredAt >= 0 && this.streamT - this.answeredAt < 3 ? 1 : 0);
    px(ctx, 0, 0, W, TB, ERA4.panel);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, 8, 7, 6, 6, WEB.danger);
    setFont(ctx, 9); ctx.fillStyle = ERA4.textHi; ctx.fillText(ST.live, 18, 5);
    ctx.fillStyle = ERA4.text; ctx.fillText(ST.mark, 46, 5);
    const watching = ST.watching.replace('{n}', String(this.count));
    ctx.fillStyle = this.count > ST.count ? PLACE.textileHi : ERA4.textHi;
    ctx.fillText(watching, W - 8 - Math.ceil(ctx.measureText(watching).width), 5);
    // Mutual aid belongs to the broadcast. The apparatus neither measures nor files it.
    px(ctx, 2, H - 32, pw, 30, ERA4.panel);
    setFont(ctx, 8); ctx.fillStyle = ERA4.textHi;
    ctx.fillText(V3.fundraiser.title, 7, H - 29);
    ctx.fillText(V3.fundraiser.fund, 7, H - 18);
    px(ctx, 7, H - 7, pw - 10, 4, ERA4.rule);
    px(ctx, 7, H - 7, Math.round((pw - 10) * V3.fundraiser.fraction), 4, PLACE.textileHi);
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
  debugJumpTo(where: 'invited' | 'frame' | 'stream' | 'ask' | 'intrusion' | 'after'): void {
    this.removeCaption();
    this.phase = 'idle';
    this.hits = [];
    this.asking = false; this.answered = null; this.answeredAt = -1;
    this.intrusionT = -1; this.intrusionDone = false; this.refusedOnce = false;
    this.chat = []; this.count = ST.count;
    if (where === 'invited') { this.invite(); return; }
    this.begin();
    if (where === 'frame') return;
    this.rowsShown = FRAME.rows.length;
    this.phase = 'grow'; this.t = FRAME.growSeconds;
    this.update(0.01);
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
