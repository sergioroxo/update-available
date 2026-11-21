/**
 * ⚑ S415 (UiB job 33 Part D; draft 3 §4 beats 11–13, his §8 answers; T97·26-19, 26-19b, 26-20, 26-22) — THE STREAM, THE
 * SHUTDOWN, THE END. The last act of 2026, on her own desktop monitor whichever door she took to Shepherd (his 21 Nov: "the
 * TransJesus to be now only a thing to be present on the desktop and not the VR headset"; 26-19: "if you want to show me
 * something like it opens the window").
 *
 *  11. THE STREAM (respite). Because Junie's "i know. come in.": her link arrives under it in her thread, and her own yellow
 *      cursor (her friends are still signed in) opens it. transjesus.str — the birthday stream for trans youth on the poster on
 *      Maya's wall (reinterp_deltas `e_ballPoster`, printArt `ball2026`) — grows out of the link to fill the whole monitor, and
 *      its light fills the room (src/room/streamLight.ts). Her friends on camera, and Rae holding the candles (Act I's lot
 *      ended on Rae's "who has the candles"); the community and TransJesus dancing, wordless (the retired stream space's
 *      people and dancer, drawn flat: theme/era4.ts `streamScene`, `streamTJ`); the chat, "maya joined", the count 41 → 42,
 *      "hi maya", "happy birthday"; the fund "for Maya's name change" filling a hair at each gift; dance · stay; the stream's
 *      own music. NO L, NO LAMBY, NO MECHANICS: nothing here is the system's, nothing is filed by the stream, it is never a
 *      trap and nothing in it is revealed as fake. A press is hers; with none, the chat carries on as if she stayed.
 *  12. THE SHUTDOWN (not a happy note). Because the system was only damaged, not gone: a thin grey band of its own lines across
 *      the top of the picture ("Restoring your environment…" … "Unable to caption this stream."), never on a dancer or a chat
 *      line; then SESSION TERMINATED · reason: social contagion, as built (26-22: "the only part that is working"). The stream
 *      is cut from her screen: the picture freezes on the people mid-dance, the music stops, LambyVision (if it is playing)
 *      stops with its picture. Then the system's own update failing: the screen and the room's light torn in bands, in steps
 *      of at most three a second (designed, not flashing; reduced motion gets a cut). Her room keeps its things; the light
 *      goes.
 *  13. COMING SOON. The screen dark. Junie: "we'll still exist." (his words, `_s`), answering the termination. Then L's line
 *      (his, close_message.json `laptopLine`), written as its voice reaches each phrase, the voice slowing and breaking (a
 *      clip rendered slower and run down: tools/tts/s415_soon.py). Then the update's own report, plain: "Your update has
 *      failed." — and the visit turns into the Close (browser.ts `beginActs` → space.ts `endFromActs` → app.ts `enterClose`).
 *
 * ⚑ DIRTY ONLY (S406): the stream's picture moves at STREAM_HZ (a stream's own low frame rate — the whole monitor is one
 * texture, re-sent at each step), its chat on each new line; the glitch at GLITCH_HZ; the rest is still. `version` bumps only
 * when a frame changes, and the director folds it into the screen's.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { ERA4, PLACE, KETTLE, roundRect, roundEdge } from '../theme/era4';
import { CAL_2026 } from '../theme/calendar';
import { reducedMotion } from '../../state/motion';
import { readHold } from '../readHold';
import { markE4 } from '../../narrative/e4Beats';
import { playOnce, roomBed } from '../../audio/tapeAudio';
import { setStreamLight } from '../../room/streamLight';
import { registerPage, ANIM_HZ, type Page } from './lScreen';
import type { E4Acts, Beat } from './e4Acts';
import { drawJunie } from './e4ActThree';
import { HER_WORDS } from './e4ActTwo';
import { StreamCover, ST, SYS, SHOT_LIGHT, type ChatLine, type Said } from './streamCover';
import ACTS from '../../../data/dialog/s4_acts.json';
import BALL from '../../../data/dialog/s4_ball.json';
import CLOSE_MESSAGE from '../../../data/strings/close_message.json';
import UPDATES from '../../../data/strings/updates.json';

const A4 = (ACTS as unknown as { act4: {
  b11: { link: { url: string; title: string; sub: string }; fund: string; fundFrom: number; fundStep: number; friends: { junie: string; rae: string };
    birthday: Said[]; gifts: Said[]; askSeconds: number; afterSeconds: number; lineSeconds: number; growSeconds: number };
  b12: { band: string[]; lineSeconds: number; glitchSeconds: number; glitchHz: number };
  b13: { junie: { text: string }; soon: { clip: string; seconds: number; parts: { text: string; at: number }[] }; titleSeconds: number };
  witness: { terminated: string };
} }).act4;
const B11 = A4.b11, B12 = A4.b12, B13 = A4.b13;
const SCREEN = (ACTS as unknown as { screen: { aiWidth: { act3After: number }; lName: string; apps: Record<string, string>; original: { restored: string } } }).screen;
const B10 = (ACTS as unknown as { act3: { b10: { lSub: string } } }).act3.b10;
const MUSIC = (BALL.room as unknown as { landing: string }).landing;
/** L's last line: his words (P7-48) */
const SOON_TEXT = (CLOSE_MESSAGE as unknown as { laptopLine: string }).laptopLine;
/** the update's own report (updates.json close.restarting) */
const FAILED = (UPDATES as unknown as { close: { restarting: string } }).close.restarting;
/** the glitch's light: stepped down in bands (≤ 3 changes a second), 1 = the stream's full, 0 = out */
const GLITCH_LIGHT = [0.7, 0.85, 0.45, 0.6, 0.3, 0.4, 0.15, 0.22, 0];
export { StreamCover };

/** where a review jump may begin: the stream (beat 11), the shutdown (12), the end (13) */
export type ActFourFrom = 'stream' | 'shutdown' | 'end';

/** what the act asks of the shell and the room (browser.ts wires them; space.ts and app.ts carry them out) */
export interface ActFourHooks {
  /** the stream is open on her monitor: the shell files her leaving (the machine's view of it, as before) */
  joined(): void;
  /** SESSION TERMINATED: the record files it, the Lexicon meets its word */
  terminated(): void;
  /** LambyVision, if it is playing, stops with its picture (26-22) */
  stopTv(): void;
}

// ── the link in Junie's thread: her "come in.", then the stream's link under it ──
registerPage('junieLink', (ctx, pr, page, api) => {
  const y = drawJunie(ctx, pr, page);
  const x = pr.x + 14, w = Math.min(300, pr.w - 88);
  // a link preview, the way a message carries one: the poster's own words and colours
  const h = 74;
  roundEdge(ctx, x, y, w, h, 10, KETTLE.rowEdge, KETTLE.theirs);
  px(ctx, x + 8, y + 8, 46, 58, ERA4.panel);
  px(ctx, x + 8, y + 8, 46, 3, PLACE.textileHi);
  px(ctx, x + 8, y + 63, 46, 3, CAL_2026.transBlue);
  roundRect(ctx, x + 27, y + 24, 8, 8, 4, ERA4.photoSkinHi);
  px(ctx, x + 25, y + 32, 12, 16, PLACE.textileHi);
  px(ctx, x + 27, y + 21, 2, 2, PLACE.sunHi); px(ctx, x + 30, y + 20, 2, 3, PLACE.sunHi); px(ctx, x + 33, y + 21, 2, 2, PLACE.sunHi);
  setFont(ctx, 13); ctx.fillStyle = KETTLE.ink; ctx.fillText(B11.link.title, x + 64, y + 12);
  setFont(ctx, 11); ctx.fillStyle = KETTLE.sub; ctx.fillText(B11.link.sub, x + 64, y + 32);
  ctx.font = monoFor(10); ctx.fillStyle = KETTLE.sub; ctx.fillText(B11.link.url, x + 64, y + 52);
  api.screen.anchor('junie-link', { x, y, w, h });
});

/** wire the act to the screen: the stream covers the whole glass once it is open; before that it grows over her thread */
export function wireActFour(c: E4Acts): void {
  const s = c.screen, st = c.stream;
  s.cover = (ctx, W, H, push) => { if (!st.on) return false; st.draw(ctx, W, H, push); return true; };
}

// ── THE ACT ─────────────────────────────────────────────────────────────────
export function* actFour(c: E4Acts, hooks: ActFourHooks, from: ActFourFrom = 'stream'): Beat {
  if (from === 'stream') yield* beat11(c, hooks);
  else layInStream(c, hooks);
  if (from !== 'end') yield* beat12(c, hooks);
  else layInShutdown(c, hooks);
  yield* beat13(c);
}

/** the light the stream throws, from its shot now */
function streamLightNow(st: StreamCover, level: number, snap = false): void {
  setStreamLight({ level, color: SHOT_LIGHT[st.shot], screen: 1, snap });
}

/** beat 11 · the stream (respite) */
function* beat11(c: E4Acts, hooks: ActFourHooks): Beat {
  const s = c.screen, st = c.stream;
  c.beat = 'stream';
  // ── the link, under Junie's "i know. come in." (her message: felt — nobody else speaks) ──
  c.feltNow = true;
  const page = s.page;
  if (page && page.kind === 'junie') { page.kind = 'junieLink'; s.touch(); playOnce('card_junie.mp3'); }
  else s.open({ kind: 'junieLink', title: SCREEN.apps.kettle, sent: true, answered: true });
  yield () => !!s.anchorOf('junie-link');
  yield 1.4;
  // her friend opens it for her: Junie's own cursor (her friends are still signed in), never the system's
  const link = s.anchorOf('junie-link')!;
  const prev = s.overlayTop;
  s.overlayTop = (ctx, W, H) => { prev?.(ctx, W, H); st.drawOver(ctx, W, H); };
  const W = 710, H = 384;
  const to = { x: (link.x + link.w * 0.5) / W, y: (link.y + link.h * 0.55) / H };
  const from = { x: 0.92, y: 0.86 };
  const moveSeconds = 1.2, steps = Math.max(1, Math.round(moveSeconds * ANIM_HZ));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps, e = k * k * (3 - 2 * k);
    st.junieCursor = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, pressing: false };
    s.touch();
    yield 1 / ANIM_HZ;
  }
  st.junieCursor = { ...to, pressing: true }; s.touch(); playOnce('ui_press.mp3');
  yield 0.3;
  st.junieCursor = null;
  // ── the stream grows out of the link and fills the monitor; its light fills the room; its music ──
  c.feltNow = false;
  c.respite = true;                 // no L, no Lamby, no mechanics (the guide is silent; the AI says nothing)
  s.stopVoice();
  st.growOut(link);
  roomBed.set(MUSIC, 1.5);
  markE4('stream');                 // the contract: the birthday stream begins
  hooks.joined();
  streamLightNow(st, 1);
  const gSteps = Math.max(1, Math.round(B11.growSeconds * ANIM_HZ));
  for (let i = 1; i <= gSteps; i++) { st.grow = i / gSteps; s.touch(); yield 1 / ANIM_HZ; }
  st.on = true; st.grow = 0; s.overlayTop = prev; s.touch();
  // ── the chat: before her, then it sees her (41 → 42), the welcomes, the birthday, the ask ──
  const queue: ChatLine[] = [...ST.before, { who: '', text: ST.joined, sys: true, mark: 'joined' }, ...ST.welcome, ...B11.birthday, { ...ST.ask, mark: 'ask' }];
  let shot = st.shot;
  for (const l of queue) {
    yield* waitLit(st, B11.lineSeconds * (l.mark === 'joined' ? 1.4 : 1), () => { if (st.shot !== shot) { shot = st.shot; streamLightNow(st, 1); } });
    st.say(l);
    if (l.mark === 'joined') { st.count = ST.count + 1; st.candles = true; st.land(2.5); st.touch(); }
  }
  // ── her one act: dance, or stay. Hers to press; with no press, the chat carries on as if she stayed ──
  c.clearPress();
  st.asking = true; st.touch();
  c.path = ST.chips.map((k) => `a4-${k}`);
  const a0 = c.t;
  let got: string | null = null;
  yield () => {
    if (st.shot !== shot) { shot = st.shot; streamLightNow(st, 1); }
    got = c.take(c.path);
    return got !== null || c.t - a0 >= B11.askSeconds;
  };
  c.path = [];
  st.asking = false;
  const choice = got ? (got as string).replace('a4-', '') : 'stay';
  st.choice = got ? choice : null;
  if (got) playOnce('ui_press.mp3');
  if (choice === 'dance') { st.land(3); setStreamLight({ level: 1, color: PLACE.sun, screen: 1, snap: true }); }
  st.touch();
  // ── the night carries on: the answers, the gifts for her name change, the room's own lines ──
  const after: ChatLine[] = [...(got ? ST.answer[choice] ?? [] : []), ST.after[0], B11.gifts[0], ...ST.after.slice(1, 4), B11.gifts[1], ...ST.after.slice(4)];
  const t0 = c.t;
  let flareOff = choice === 'dance';
  while (after.length && c.t - t0 < B11.afterSeconds) {
    yield* waitLit(st, B11.lineSeconds, () => {
      if (flareOff && c.t - t0 > 1.5) { flareOff = false; streamLightNow(st, 1); }
      if (st.shot !== shot) { shot = st.shot; streamLightNow(st, 1); }
    });
    st.say(after.shift()!);
  }
  yield () => c.t - t0 >= B11.afterSeconds;
  st.rest = after;   // the night's lines not yet said: the people go on under the system's band
}

/** wait `seconds`, calling `each` every frame (the light follows the stream's cuts) */
function* waitLit(st: StreamCover, seconds: number, each: () => void): Beat {
  const start = st.clock;
  yield () => { each(); return st.clock - start >= seconds; };
}

/** beat 12 · the shutdown (not a happy note) */
function* beat12(c: E4Acts, hooks: ActFourHooks): Beat {
  const st = c.stream;
  c.beat = 'shutdown';
  c.respite = false;
  let shot = st.shot;
  // the system's thin grey band, a line at a time; the chat goes on under it (the people answer it by being there)
  const people = st.rest.length ? st.rest : ST.after.slice(-3);
  for (let i = 0; i < B12.band.length; i++) {
    st.band = B12.band[i]; st.touch();
    playOnce(i < 2 ? 'agent_2026.mp3' : 'filter_deny.mp3');
    roomBed.duck(-9, 1.2);
    yield* waitLit(st, B12.lineSeconds, () => { if (st.shot !== shot) { shot = st.shot; streamLightNow(st, 1); } });
    if (people[i]) st.say(people[i]);
  }
  // SESSION TERMINATED, as built. The stream is cut from her screen: the picture freezes on the people mid-dance, the music
  //   stops, the count holds; LambyVision, if it is playing, stops with its picture
  st.band = null;
  st.freeze();
  st.terminated = true; st.touch();
  playOnce('terminate_2026.mp3');
  roomBed.set(null, 0.25);
  hooks.stopTv();
  markE4('terminated');
  hooks.terminated();
  streamLightNow(st, 1, true);   // the light holds on the frozen picture
  yield readHold([SYS.terminated, SYS.reason, SYS.terminatedNote]) + 0.6;
  // the glitch: the system's own update failing, the screen and the room's light torn in bands — stepped, at most three
  //   changes a second; reduced motion gets a cut
  playOnce('glitch_e4_end.mp3');
  if (reducedMotion()) {
    st.dark = true; st.touch();
    setStreamLight({ level: 0, color: SHOT_LIGHT[st.shot], screen: 0, snap: true });
  } else {
    const n = Math.max(1, Math.round(B12.glitchSeconds * B12.glitchHz));
    for (let i = 1; i <= n; i++) {
      st.glitch = i / n; st.touch();
      const level = GLITCH_LIGHT[Math.min(GLITCH_LIGHT.length - 1, Math.round(((i - 1) / Math.max(1, n - 1)) * (GLITCH_LIGHT.length - 1)))];
      setStreamLight({ level, color: SHOT_LIGHT[st.shot], screen: 0, snap: true });
      yield 1 / B12.glitchHz;
    }
    st.dark = true; st.glitch = 0; st.touch();
    setStreamLight({ level: 0, color: SHOT_LIGHT[st.shot], screen: 0, snap: true });
  }
  // her room is left as it was, with the light gone
  yield 1.6;
}

/** beat 13 · coming soon */
function* beat13(c: E4Acts): Beat {
  const s = c.screen, st = c.stream;
  c.beat = 'end';
  // Junie, on the dark screen: "we'll still exist." (his words; felt — nothing else speaks while they are read)
  c.feltNow = true;
  st.junie = B13.junie.text; st.touch(); playOnce('card_junie.mp3');
  yield readHold(B13.junie.text) + 1.2;
  st.junie = null; st.touch();
  c.feltNow = false;
  yield 0.8;
  // L, its voice slowing and breaking (the switch is hers: the words are written whatever it says)
  const parts = B13.soon.parts.length ? B13.soon.parts : [{ text: SOON_TEXT, at: 0 }];
  st.lWords = ''; st.touch();
  const clip = s.speak(B13.soon.clip, B13.soon.seconds);
  const t0 = c.t;
  let shown = 0;
  yield () => {
    const at = clip ? c.t - t0 : (c.t - t0) * 1.6;
    while (shown < parts.length && at >= parts[shown].at) { shown++; st.lWords = parts.slice(0, shown).map((p) => p.text).join(' '); st.touch(); }
    return shown >= parts.length;
  };
  if (st.lWords !== SOON_TEXT) { st.lWords = SOON_TEXT; st.touch(); }
  const held = c.t - t0;
  yield Math.max(readHold(SOON_TEXT) - held, (clip ? clip - held : 0) + 0.9, 0.9);
  st.lWords = null; st.touch();
  yield 0.6;
  // the update's own report, plain; then the visit turns into the Close (beginActs → the shell's endFromActs)
  st.title = FAILED; st.touch();
  yield B13.titleSeconds;
}

/** a review jump past the stream's start: the stream open, at her answer's end (she stayed) */
function layInStream(c: E4Acts, hooks: ActFourHooks): void {
  const st = c.stream;
  st.on = true; st.count = ST.count + 1; st.candles = true;
  for (const l of [...ST.before.slice(-3), { who: '', text: ST.joined, sys: true }, ...ST.welcome.slice(0, 3), ...B11.birthday, ST.ask, ...ST.after.slice(0, 3)]) st.say(l);
  st.touch();
  roomBed.set(MUSIC, 0.5);
  markE4('stream');
  hooks.joined();
  streamLightNow(st, 1, true);
}
/** …and past the shutdown: the screen dark, the light gone */
function layInShutdown(c: E4Acts, hooks: ActFourHooks): void {
  const st = c.stream;
  st.freeze(); st.terminated = true; st.dark = true; st.touch();
  roomBed.set(null, 0.2);
  markE4('terminated');
  hooks.terminated();
  setStreamLight({ level: 0, color: SHOT_LIGHT.wide, screen: 0, snap: true });
}

/** a review jump into Act IV: Act III laid into the screen as beat 10 leaves it (L narrower, her words sent to Junie, "come in.") */
export function layInActThree(c: E4Acts): void {
  const s = c.screen;
  s.full = null;
  s.voiceSwitch = true;
  s.name = SCREEN.lName; s.sub = B10.lSub;
  s.setAiWidth(SCREEN.aiWidth.act3After);
  s.originalStage = 'restored';
  const row = s.rows.find((r) => r.who === 'unsent');
  if (row) { row.who = 'her'; s.setRowText(row, HER_WORDS); }
  s.note(SCREEN.original.restored);
  s.open({ kind: 'junie', title: SCREEN.apps.kettle, sent: true, answered: true } as Page);
  s.touch();
}

