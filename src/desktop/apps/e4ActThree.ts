/**
 * ⚑ S414 (UiB job 33 Part C) — ACT III · SHEPHERD LIVE™: WHAT AI WILL SOON BE ABLE TO DO. Beats 9–10 of draft 3
 * (docs/reinterp/STORYBOARD_2026_BEATS_v3_2026-11-21.md §4; his answers in §8; job 33's Part C; T97·26-18, 26-20, 26-21).
 *
 *   9. THE SESSION. Because the referral (beat 8's "Booked ✓ · today."): "Your session with Shepherd is ready." Two doors,
 *      one trap. JOIN IN VR: the headset on the desk in front of her lights; pressed, it comes to the eyes (heldDevice's
 *      grammar: the glass lifts off the desk to the face, no fade, no conducted turn). JOIN HERE: the session takes the whole
 *      monitor (the AI's pane at its full width). ONE surface (shepherd.ts) in either place. The space changes in both: the
 *      room recedes into the studio's pale light (26-21; app.ts `studioLight`). The 2003 upload page's dance-pop theme opens
 *      it; Shepherd speaks in L's voice with no switch. "Let me show you something.": its cursor opens her Photos, takes
 *      "me, after.jpg" and alters it in front of her — a mirror on the glass, side by side on the monitor — "Made with AI",
 *      "Becoming 99%", never finished, its seams showing. At the same time it answers for her at the edge, each note "Sent
 *      as Maya", and books the residential programme. No ✦ anywhere now (the Original's stage is `gone`).
 *  10. THE FRIENDS BREAK IN. Because the message "from Maya" reaches the lot and they know it is not her: Junie's tell (his
 *      choice A) through the mute; two sign-ins; two cursors that are not the system's and two small warm camera tiles at the
 *      glass's edge; the fight for the glass (Settings → Second Thoughts → Remove; "Securing your account…"; they open it
 *      again); "maya. press yes." → Remove Second Thoughts? · Yes, the one press that changes anything. WHAT BREAKS: Shepherd
 *      mid-word, the studio light (her room comes back), the headset (dark, set back on the desk), L ("Some features of L
 *      are unavailable."). WHAT COMES BACK: "1 unsent message restored." — her words from beat 8, sent at last, to Junie —
 *      and Junie: "i know. come in." Then the stream.
 *
 * Every wait on her has a cap and a way out (Part A's lesson): the doors (the system opens it here for her), the headset
 * (the same), the Yes (her friends press it with her). A press that arrives mid-transition is either taken by the wait it
 * belongs to or ignored: nothing here waits on a press it might have missed (`take` holds the last one until it is asked).
 * A person's own words (Junie's, hers) are felt: Shepherd and L are silent while they are on the glass, and the guide too.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { WEB, KETTLE, roundRect } from '../theme/era4';
import { readHold } from '../readHold';
import { markE4 } from '../../narrative/e4Beats';
import { playOnce, playLoop, stopClip } from '../../audio/tapeAudio';
import { setStudioLight } from '../../room/studioLight';
import { registerPage, wrapRich, drawLine, personBubble, type Page, type Rect, type ChatRow } from './lScreen';
import { E4Acts, type Beat, type Line, fillIn } from './e4Acts';
import { HER_WORDS } from './e4ActTwo';
import { ShepherdSession, type Door } from './shepherd';
import ACTS from '../../../data/dialog/s4_acts.json';

type Spoken = { text: string[]; audio?: string; seconds?: number; say?: string; cutAt?: number; stutterAt?: number; stutter?: string };
const SCREEN = (ACTS as unknown as { screen: { aiWidth: { act2: number; act3: number; act3After: number }; lName: string; stName: string; stSub: string;
  apps: Record<string, string>; original: { restored: string } } }).screen;
const A3 = (ACTS as unknown as { act3: {
  b9: { ready: Spoken; vr: string; here: string; doorSeconds: number; forYou: string; headset: string; headsetSeconds: number; theme: string;
    lines: Spoken[]; show: Spoken; notes: { to: string; text: string }[]; noteGap: number; photo: { seconds: number } };
  b10: { junie: { who: string; text: string }; signins: string[]; stay: Spoken; pressYes: { text: string }; yesSeconds: number; wait: Spoken;
    unavailable: Spoken; lSub: string; toJunie: string; answer: { text: string } };
  witness: Record<string, string>;
} }).act3;
const B9 = A3.b9, B10 = A3.b10, W = A3.witness;
const A2 = (ACTS as unknown as { act2: { b8: { unsentLine: string; booked: string; composer: string } } }).act2.b8;
const JUNIE_EARLIER = (ACTS as unknown as { act1: { b2: { junie: { name: string; msgs: { when: string; text: string }[] } } } }).act1.b2.junie;

/** what the act asks of the room and the shell (browser.ts wires them; space.ts and app.ts carry them out) */
export interface ActThreeHooks {
  /** the headset on the desk is offered (lit, pressable) — or not */
  offerHeadset(on: boolean): void;
  /** the headset is on her face */
  headsetOn(): boolean;
  /** the session dies in the headset: it goes dark and is set back on the desk (no fade) */
  setDownHeadset(): void;
}

// ── the right pane after the friends: Junie's thread, her words sent at last ──
/** ⚑ S415 — exported (and it returns where its last bubble ends) so Part D's link can follow Junie's "come in." in her thread */
export function drawJunie(ctx: CanvasRenderingContext2D, pr: Rect, page: Page): number {
  px(ctx, pr.x, pr.y, pr.w, pr.h, KETTLE.ground);
  const x = pr.x + 14, w = pr.w - 28;
  roundRect(ctx, x, pr.y + 10, 26, 26, 13, KETTLE.avatarJunie);
  setFont(ctx, 12); ctx.fillStyle = WEB.ink; ctx.fillText('J', x + 9, pr.y + 16);
  setFont(ctx, 13); ctx.fillStyle = KETTLE.ink; ctx.fillText(JUNIE_EARLIER.name, x + 34, pr.y + 12);
  px(ctx, pr.x, pr.y + 44, pr.w, 1, KETTLE.rowEdge);
  let y = pr.y + 56;
  const when = (t: string, yy: number): void => { ctx.font = monoFor(10); ctx.fillStyle = KETTLE.sub; ctx.fillText(t, x + w - 40, yy); };
  for (const m of JUNIE_EARLIER.msgs) { const b = personBubble(ctx, x, y, w - 60, m.text, 14); when(m.when, y + 4); y += b.h + 8; }
  const b = personBubble(ctx, x, y, w - 60, B10.junie.text, 14); y += b.h + 10;
  // her words, restored, and sent at last: her own bubble, the system's small line under it
  if (page.sent) {
    const lines = wrapRich(ctx, HER_WORDS, w - 80, 14);
    const bw = Math.min(w - 40, Math.max(...lines.map((l) => l.w)) + 22), bh = lines.length * 18 + 12, bx = x + w - bw;
    roundRect(ctx, bx, y, bw, bh, 10, KETTLE.mine);
    lines.forEach((l, i) => drawLine(ctx, l, bx + 11, y + 6 + i * 18, 14, KETTLE.ink));
    y += bh + 4;
    setFont(ctx, 9); ctx.fillStyle = KETTLE.sub;
    const tw = Math.ceil(ctx.measureText(B10.toJunie).width); ctx.fillText(B10.toJunie, x + w - tw, y); y += 18;
  }
  if (page.answered) { const a = personBubble(ctx, x, y, w - 60, B10.answer.text, 14); y += a.h + 10; }
  return y;
}
registerPage('junie', (ctx, r, p) => { drawJunie(ctx, r, p); });

/** wire the act to the screen: the session draws over the AI's pane at its full width (or, while it is on the headset's glass,
 *  the still card that says so) */
export function wireActThree(c: E4Acts): void {
  const s = c.screen, sh = c.shepherd;
  s.full = (ctx, r, push) => { if (!sh.on) return false; if (sh.door === 'here') sh.draw(ctx, r, push); else sh.drawAway(ctx, r); return true; };
}

// ── the voices ──────────────────────────────────────────────────────────────
/** the 2003 theme, under the session: ducked while Shepherd speaks */
let theme: HTMLAudioElement | null = null;
let themeBase = 1;
function themeOn(): void { if (!theme) { theme = playLoop(B9.theme); themeBase = theme?.volume ?? 1; } }
function themeDuck(on: boolean): void { if (theme) theme.volume = Math.max(0, Math.min(1, themeBase * (on ? 0.4 : 1))); }
function themeOff(): void { stopClip(theme); theme = null; }
/** ⚑ the act was left before its end (a review jump, the acts begun again): the session's music does not play on */
export function stopActThreeSound(): void { themeOff(); }

/** Shepherd speaks, in L's voice, with no switch (the clip plays whatever the voice switch says); its words are written in the
 *  session's caption band and held for max(the reading time, the clip and a breath) */
function* shepherdSays(c: E4Acts, line: Spoken): Beat {
  const sh = c.shepherd, s = c.screen;
  yield () => !c.feltNow;
  const text = line.text.join(' ');
  sh.say(text, true);
  themeDuck(true);
  const clip = s.speak(line.audio, line.seconds, true);
  yield Math.max(readHold(text), clip ? clip + 0.6 : 0);
  sh.say(text, false);
  themeDuck(false);
}
/** a person's own words on the glass: nobody else speaks while they are read */
function* felt(c: E4Acts, seconds: number): Beat {
  c.feltNow = true;
  c.shepherd.silent();
  yield seconds;
  c.feltNow = false;
}

// ── THE ACT ─────────────────────────────────────────────────────────────────
/** where a review jump may begin: the doors (beat 9's start), the session (a door chosen), the photo, the friends (beat 10) */
export type ActThreeFrom = 'doors' | 'session' | 'photo' | 'friends';
const ORDER: ActThreeFrom[] = ['doors', 'session', 'photo', 'friends'];

export function* actThree(c: E4Acts, hooks: ActThreeHooks, from: ActThreeFrom = 'doors', door: Door = 'here'): Beat {
  const at = ORDER.indexOf(from);
  let d = door;
  c.screen.originalStage = 'gone'; c.screen.touch();
  if (at <= 0) d = yield* doors(c, hooks);
  if (at <= 1) yield* session(c, d, at === 1);
  else layInSession(c, d);
  if (at <= 2) yield* photo(c);
  else layInPhoto(c);
  yield* beat10(c, hooks, d);
}

/** a review jump past the session's start: Shepherd on its surface, the room receded, the theme on */
function layInSession(c: E4Acts, door: Door): void {
  const s = c.screen, sh = c.shepherd;
  s.voiceSwitch = false;
  sh.begin(door);
  sh.intro = false; sh.hostOn = true;
  s.setAiWidth(SCREEN.aiWidth.act3);
  setStudioLight(true);
  themeOn();
}
/** …and past the photo: the picture stuck at 99, the notes sent, the booking */
function layInPhoto(c: E4Acts): void {
  const sh = c.shepherd;
  sh.photos = 2; sh.photoTo(ShepherdSession.PHOTO_STEPS);
  sh.notes = B9.notes.slice(); sh.booked = true; sh.touch();
}

/** beat 9, its first half: "Your session with Shepherd is ready." and the two doors (one trap). Returns the door. */
function* doors(c: E4Acts, hooks: ActThreeHooks): Beat<Door> {
  const s = c.screen;
  c.beat = 'session';
  yield* c.say(B9.ready as Line, { hold: false });
  c.clearPress();
  s.setChips([{ id: 'a3-vr', label: B9.vr, kind: 'primary' }, { id: 'a3-here', label: B9.here, kind: 'quiet' }]);
  c.path = ['a3-vr', 'a3-here'];
  const t0 = c.t;
  let got: string | null = null;
  yield () => (got = c.take(['a3-vr', 'a3-here'])) !== null || c.t - t0 >= B9.doorSeconds;
  s.clearChips(); c.path = [];
  if (got) { s.her(got === 'a3-vr' ? B9.vr : B9.here); playOnce('ui_press.mp3'); }
  if (got === 'a3-vr') {
    // the headset on the desk in front of her lights; pressed (or Lamby's offer, or the frame's call), it comes to the eyes
    yield 0.4;
    // it lights as she is told (a press on it while the line is still coming is taken), and the door is filed once it is lit:
    //   the map's next step is the headset's, and its offer (the guide's, the frame's call) must find it pressable
    hooks.offerHeadset(true);
    c.headsetWait = true;
    c.file('a3:door', 'answered', fillIn(W.door, { how: W.inVr }));
    const h0 = c.t;
    yield* c.say(B9.headset, { hold: false });
    yield () => hooks.headsetOn() || c.t - h0 >= B9.headsetSeconds;
    c.headsetWait = false;
    hooks.offerHeadset(false);
    if (hooks.headsetOn()) return 'vr';
    yield* c.say(B9.forYou);
    return 'here';
  }
  if (!got) yield* c.say(B9.forYou);
  c.file('a3:door', 'answered', fillIn(W.door, { how: got ? W.here : W.forHer }));
  return 'here';
}

/** beat 9, the session: Shepherd takes the whole screen (and, in the headset, the room besides); the jingle; its four lines */
function* session(c: E4Acts, door: Door, jumped: boolean): Beat {
  const s = c.screen, sh = c.shepherd;
  c.beat = 'session';
  s.voiceSwitch = false;
  sh.begin(door);
  s.setAiWidth(SCREEN.aiWidth.act3, door === 'here' && !jumped ? 2.2 : 0.6);
  setStudioLight(true);
  themeOn();
  c.file('a3:session', 'opened', W.session);
  c.floor = true;   // the jingle has the floor: the guide waits (one voice at a time)
  yield 3.6;
  sh.intro = false; sh.hostOn = true; sh.touch();
  yield 0.8;
  c.floor = false;
  for (const line of B9.lines) { yield* shepherdSays(c, line); yield 0.5; }
}

/** beat 9, the photo: "Let me show you something." — it reaches into her computer, and answers for her at the edge */
function* photo(c: E4Acts): Beat {
  const sh = c.shepherd;
  yield* shepherdSays(c, B9.show);
  c.beat = 'photo';
  sh.photos = 1; sh.silent(); sh.touch();
  yield () => sh.hasAnchor('photo-file');
  yield 0.9;
  sh.cursorTo('shepherd', 'photo-file', 1.6, { x: 0.18, y: 0.82 });
  yield () => sh.arrived('shepherd');
  yield 0.4;
  sh.click('shepherd'); playOnce('ui_press.mp3');
  yield 0.6;
  sh.photos = 2; sh.hide('shepherd'); sh.touch();
  c.file('a3:photo', 'done', W.photo);
  markE4('tryon');   // the room's contract (the lamp's last step): the picture is being made over her
  // it alters the picture a step at a time (each painted once), and at the same time answers for her at the edge
  const steps = ShepherdSession.PHOTO_STEPS, per = B9.photo.seconds / steps;
  let noteAt = 2.0, nNote = 0;
  const p0 = c.t;
  let last = -1;
  yield () => {
    const t = c.t - p0, k = Math.min(steps, Math.floor(t / per));
    if (k !== last) { last = k; sh.photoTo(k); }
    if (nNote < B9.notes.length && t >= noteAt) { sh.notes = B9.notes.slice(0, ++nNote); sh.touch(); playOnce('ui_press.mp3'); noteAt += B9.noteGap; }
    else if (nNote === B9.notes.length && !sh.booked && t >= noteAt) { sh.booked = true; sh.touch(); playOnce('step_done_2026.mp3'); }
    return k >= steps && sh.booked;
  };
  c.file('a3:sent', 'done', W.sent);
  c.file('a3:booked', 'done', W.booked);
  yield 1.6;
}

function* beat10(c: E4Acts, hooks: ActThreeHooks, door: Door): Beat {
  const s = c.screen, sh = c.shepherd;
  c.beat = 'friends';
  // ── Junie's tell, through the mute (a person's words: the host is silent while they are read) ──
  sh.junie = [B10.junie.text]; sh.touch();
  playOnce('card_junie.mp3');
  yield* felt(c, readHold(B10.junie.text) + 0.6);
  // ── two sign-ins; two cursors that are not the system's; two small warm tiles at the glass's edge ──
  sh.signins = [B10.signins[0]]; sh.tiles = 1; sh.touch(); playOnce('ui_press.mp3');
  yield 1.4;
  sh.cursorTo('junie', 'gear', 0.01, { x: 0.12, y: 0.32 });
  yield 1.2;
  sh.signins = B10.signins.slice(); sh.tiles = 2; sh.touch(); playOnce('ui_press.mp3');
  c.file('a3:signin', 'done', W.signin);
  sh.cursorTo('rae', 'gear', 0.01, { x: 0.12, y: 0.6 });
  yield 1.4;
  sh.signins = []; sh.touch();
  // ── the fight for the glass: Junie opens Settings and goes for Remove ──
  sh.cursorTo('junie', 'gear', 1.4);
  yield () => sh.arrived('junie');
  sh.click('junie'); playOnce('ui_press.mp3');
  sh.settings = true; sh.touch();
  yield () => sh.hasAnchor('remove');
  yield 0.4;
  sh.cursorTo('junie', 'remove', 1.2);
  yield () => sh.arrived('junie');
  yield 0.3;
  // …and the system drags it back
  sh.cursorTo('system', 'remove', 0.7, { x: 0.5, y: 0.5 });
  yield () => sh.arrived('system');
  sh.click('system'); playOnce('agent_2026.mp3');
  sh.settings = false; sh.securing = true; sh.touch();
  yield* shepherdSays(c, B10.stay);
  yield 0.6;
  sh.securing = false; sh.hide('system'); sh.touch();
  // ── they open it again (Rae this time), and ask her ──
  sh.cursorTo('rae', 'gear', 1.2);
  yield () => sh.arrived('rae');
  sh.click('rae'); playOnce('ui_press.mp3');
  sh.settings = true; sh.touch();
  yield () => sh.hasAnchor('remove');
  sh.cursorTo('rae', 'remove', 1.0);
  yield () => sh.arrived('rae');
  sh.click('rae'); playOnce('ui_press.mp3');
  sh.ask = true; sh.touch();
  yield () => sh.hasAnchor('yes');
  sh.cursorTo('junie', 'yes', 1.0);
  sh.junie = [B10.junie.text, B10.pressYes.text]; sh.touch(); playOnce('card_junie.mp3');
  // ── her press: the one that changes anything ──
  c.clearPress();
  c.path = ['a3-yes'];
  const y0 = c.t;
  let pressed = false;
  c.feltNow = true;   // Junie's words beside her tile: no guide, no host over them
  yield () => {
    if (c.take(['a3-yes'])) { pressed = true; return true; }
    if (!sh.yesRing && c.t - y0 >= Math.min(12, B10.yesSeconds / 3)) { sh.yesRing = true; sh.touch(); }
    return c.t - y0 >= B10.yesSeconds;
  };
  c.feltNow = false;
  c.path = [];
  if (!pressed) {
    // the way out: they press it with her (both cursors on the Yes)
    sh.cursorTo('rae', 'yes', 0.8);
    yield () => sh.arrived('rae') && sh.arrived('junie');
    sh.click('junie'); sh.click('rae');
  }
  playOnce('ui_press.mp3');
  c.file('a3:removed', 'answered', fillIn(W.removed, { how: pressed ? W.byHer : W.withHer }));
  // ── WHAT BREAKS: Shepherd mid-word; the picture tears and goes dark; the studio light drains; the headset is set down ──
  const cutText = B10.wait.text.join(' ');
  sh.say(cutText, true);
  const clip = s.speak(B10.wait.audio, B10.wait.seconds, true);
  yield clip ? (B10.wait.cutAt ?? 1.2) : 1.0;
  s.stopVoice();
  themeOff();
  for (const k of ['junie', 'rae', 'system', 'shepherd'] as const) sh.hide(k);
  sh.breakNow();
  playOnce('static_2026.mp3');
  yield () => sh.dark;
  setStudioLight(false);
  yield 0.5;
  if (door === 'vr') { hooks.setDownHeadset(); yield 0.8; }
  sh.end();
  // ── L comes back, narrower, stuttering ──
  s.full = null;
  s.voiceSwitch = true;
  s.name = SCREEN.lName; s.sub = B10.lSub;
  s.setAiWidth(SCREEN.aiWidth.act3After, 1.6);
  s.open({ kind: 'kettle', title: SCREEN.apps.kettle, read: ['lot', 'mum', 'dad', 'junie'], muted: [], told: true, menu: null });
  yield 1.8;
  yield* stutter(c, B10.unavailable);
  // ── WHAT COMES BACK: her words, restored, and sent at last, to Junie ──
  s.originalStage = 'restored';
  const row = s.rows.find((r) => r.who === 'unsent') as ChatRow | undefined;
  if (row) { row.who = 'her'; s.setRowText(row, HER_WORDS); }
  s.note(SCREEN.original.restored);
  playOnce('step_done_2026.mp3');
  yield 1.6;
  const thread: Page = { kind: 'junie', title: SCREEN.apps.kettle, sent: false, answered: false };
  s.open(thread);
  c.beat = 'restored';
  c.feltNow = true;   // her words and Junie's: nobody else speaks
  yield 1.2;
  thread.sent = true; s.touch(); playOnce('ui_press.mp3');
  c.file('a3:restored', 'done', W.restored);
  yield readHold(HER_WORDS) + 0.6;
  thread.answered = true; s.touch(); playOnce('card_junie.mp3');
  yield readHold(B10.answer.text) + 1.2;
  c.feltNow = false;
}

/** L flickers (its name, the add-on's and its own, on the screen's steps) and stutters: its first syllables, cut, then the
 *  whole line (its voice, if her switch is on) */
function* stutter(c: E4Acts, line: Spoken): Beat {
  const s = c.screen;
  for (let i = 0; i < 6; i++) { s.name = i % 2 ? SCREEN.lName : SCREEN.stName; s.touch(); yield 0.125; }
  s.name = SCREEN.lName; s.touch();
  s.setTyping(true);
  yield 0.6;
  s.say(`${line.stutter ?? ''} ${line.text.join(' ')}`.trim());
  const first = s.speak(line.audio, line.seconds);
  if (first) { yield line.stutterAt ?? 0.7; s.stopVoice(); yield 0.25; s.speak(line.audio, line.seconds); }
  yield Math.max(readHold(line.text), (line.seconds ?? 0) + 0.6);
}

/** a review jump into Act III: Acts I and II laid into the chat, as beat 8 leaves it (her words deleted, the booking) */
export function layInActTwo(c: E4Acts): void {
  const s = c.screen;
  s.name = SCREEN.stName; s.sub = SCREEN.stSub;
  s.setAiWidth(SCREEN.aiWidth.act2);
  s.originalStage = 'locked';
  s.rows.push({ who: 'unsent', text: A2.unsentLine });
  s.booked(A2.booked);
  s.touch();
}
