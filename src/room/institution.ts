/**
 * ⚑ S183 / R5-03 — THE CORNER PULLS. Sérgio, 2026-09-27, on the turn still of 1997:
 * "The file cabinet is cropping in to the witness panel. Also, how can this be more
 * understandable of what they are here? does touching any of them gives added
 * information to the user? This should have an aesthetical understanding of the
 * 'other side' being the side that is pulling into the system. This needs a more
 * perceptable movement."
 *
 * S181 built the institution's corner around the record (cabinet, drawer 12, the
 * intake terminal, the suitcase; the scanner, the rules and the packet in 2003; a
 * router in 2016; a status light in 2026) — and left it scenery: nothing moved,
 * nothing answered, nothing said what it was. Three answers, one module:
 *
 * 1. IT NAMES ITSELF. Every institutional object is pressable and says what it is in
 *    the sentence line (data/strings/aim.json `inst*`), the build's one grammar for
 *    "you can touch this" (S152). A press is answered with the object's own gesture.
 *
 * 2. IT PULLS — and mostly WHILE YOUR BACK IS TURNED (S183c, his "yes go that way"): most filings
 *    happen while you face the desktop; you hear the stamp, the cold creep calls, and the turn finds
 *    the room moved. Three surfaces, three questions, never the same text twice:
 *    - THE WALL (the record) — the past: what you did, and what it was filed as;
 *    - THE TERMINAL — the plan: what the file is being used for NOW and NEXT, the chain of who hands
 *      you to whom (data/strings/institution.json), typed in when it moves;
 *    - THE SUITCASE (1997) — what that does to Daniel: absent until Rob has reached your mother, then
 *      packed with her tag on it; by the door once the placement packet is acknowledged.
 *    Also: the referral list (her pen) arrives with her; drawer 12 stands wider as the file grows and
 *    slams on every stamp; 2003's application is drawn toward the terminal; 2016's router chatters;
 *    2026's status light breathes. The index card stays on the desk, face up: the record already
 *    carries the moment it is "seen" (S183c cut its flight — his "what is it bringing here?").
 *
 * 3. A PRESS gets the gesture a filing gets, for that object alone: the side of the
 *    room that pulls answers a touch by doing what it does.
 *
 * Positions are the folded data (clusterMorph `foldedPos`) plus an offset, written only
 * when the cascade is not running (the morph owns every prop while it runs). Every id
 * here is excluded from batching (a batched prop can neither move nor own its colour).
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';
import { foldedPos } from './clusterMorph';
import { INSTITUTION } from '../desktop/theme/institution';
import { attachPrintToTop } from './calendarPage';
import { text, px } from './calendarArt';
import planData from '../../data/strings/institution.json';
import { entriesByEra } from '../witness/record';
import type { EraKey } from './cluster';

type V3 = { x: number; y: number; z: number };

/** what the look can rest on, per era: the aim key, the prop it moves, a world point and radius */
interface Target { key: string; prop: string; at: V3; r: number; practice: string }

/** every prop this module writes to — handed to the batcher as never-batch */
export const INSTITUTION_IDS = [
  'inst_drawer12', 'inst_handle2', 'inst_drawerLabel', 'inst_indexCard', 'inst_terminalScreen',
  'suitcase', 'suitcaseHandle', 'suitcaseTag', 'inst_referral', 'inst_rules',
  'inst_packet', 'inst_packetClip', 'inst_scannerLid', 'inst_routerLed', 'inst_statusLed'
];

const DRAWER_PARTS = ['inst_drawer12', 'inst_handle2', 'inst_drawerLabel'];
/**
 * ⚑ S183e — THE CORNER ASSEMBLES IN THE STORY'S ORDER (1997). Sérgio, 2026-09-27: "although people
 * can explore freely, there are stuff that need to appear in sequence and that are core elements to
 * the progression of the narrative." Until now the cabinet, desk and terminal stood behind him from
 * the era's first second — the ending, visible at the entrance. Now nothing of the institution is
 * there until the file exists, and each piece arrives with the beat that brings it, while his back is
 * turned (see `arrived`):
 *   FILE  — the first filing (the wall hardens into the record): the cabinet with drawer 12, the
 *           floor it stands on, the desk and the index card the record will say he "saw";
 *   PLAN  — the mentor is assigned (`went-online`): the terminal, and its plan begins;
 *   MOTHER— Rob has reached his mother (`rob-spoke-mother`): her referral list, her suitcase;
 *   PACKED— the placement packet is acknowledged: the suitcase by the door.
 * 2003 opens already enrolled, so from r2 on the corner is simply what the data folds to.
 */
const STAGE_FILE = ['inst_cabinet', 'inst_handle1', 'inst_handle3', 'inst_drawer12', 'inst_handle2', 'inst_drawerLabel',
  'inst_floor', 'inst_floorEdgeFront', 'inst_floorEdgeSide', 'inst_desk', 'inst_deskBase', 'inst_indexCard'];
const STAGE_PLAN = ['inst_terminal', 'inst_terminalScreen'];
const SUITCASE_PARTS = ['suitcase', 'suitcaseHandle', 'suitcaseTag'];
const PACKET_PARTS = ['inst_packet', 'inst_packetClip'];

/** 1997: where the suitcase ends up — by the door (door: x 2.1, z 1.78–2.62) */
const SUITCASE_DOOR = { x: 1.7, z: 2.95 };
const DRAWER_OPEN_MIN = 0.02, DRAWER_OPEN_PER = 0.014, DRAWER_OPEN_MAX = 0.2;
const DRAWER_PRESS = 0.16;
const PACKET_PER = 0.02, PACKET_MAX = 0.2;
/** the intake terminal's screen, in pixels (a 16-column, 6-row 3×5 text screen) */
const TERM_W = 64, TERM_H = 36, TYPE_CPS = 16;   // 15 columns of 3×5 type: plan values stay ≤ 15 characters

const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export interface Institution {
  /** once a frame */
  tick(dt: number, era: EraKey, busy: boolean, fileSize: number, pulseK: number, watched: boolean, has: (id: string) => boolean): void;
  /** what can be pressed now: aim key, world point, radius (the caller owns the ray maths) — only
   *  what has arrived: a hidden prop is not a target */
  targets(era: EraKey): Target[];
  /** a press on one object */
  press(key: string): void;
}

export function createInstitution(room: RoomHandles): Institution {
  const eraIdx: Record<EraKey, number> = { e1: 0, e2: 1, e3: 2, e4: 3 };
  const presses = new Map<string, number>();   // key → seconds since pressed
  let lastEra: EraKey | null = null;
  /** ⚑ S183c — what 1997 has revealed so far, APPLIED ONLY WHILE YOUR BACK IS TURNED (see tick) */
  let arrived = { file: false, plan: false, mother: false, packed: false };
  let suitcaseT = 0, packetT = 0, drawerOpen = DRAWER_OPEN_MIN, clock = 0;

  const ent = (id: string): pc.Entity | null => {
    const h = room.props.get(id);
    return h && h.entity.enabled ? h.entity : null;
  };
  const base = (id: string, era: EraKey): V3 | null => {
    const p = foldedPos(id, eraIdx[era]);
    return p ? { x: p[0], y: p[1], z: p[2] } : null;
  };
  const place = (id: string, era: EraKey, dx: number, dy: number, dz: number): void => {
    const e = ent(id); const b = base(id, era);
    if (e && b) e.setLocalPosition(b.x + dx, b.y + dy, b.z + dz);
  };
  const glow = (id: string, colour: pc.Color, k: number): void => {
    const h = room.props.get(id);
    if (!h || !h.entity.enabled) return;
    for (const m of h.materials) {
      m.emissive.set(colour.r * k, colour.g * k, colour.b * k);
      m.update();
    }
  };
  const col = (hex: string): pc.Color => new pc.Color().fromString(hex);
  const SCANNER = col(INSTITUTION.scannerGlow);
  const ROUTER = col(INSTITUTION.routerGlow);
  const STATUS = col(INSTITUTION.statusGlow);

  /** 1 at a press, easing to 0 over `s` seconds */
  const pressK = (key: string, s: number): number => {
    const t = presses.get(key);
    return t === undefined || t >= s ? 0 : 1 - t / s;
  };
  /** 0 → 1 → 0 over a press's `s` seconds: a thing lifted and set down */
  const bump = (k: number): number => (k <= 0 ? 0 : Math.sin(Math.PI * (1 - k)));
  /** the drawer's press: out over 0.35 s, held, back by 2 s */
  const drawerPress = (): number => {
    const t = presses.get('instDrawer');
    if (t === undefined) return 0;
    if (t < 0.35) return ease(t / 0.35);
    if (t < 1.5) return 1;
    return 1 - ease((t - 1.5) / 0.5);
  };
  /** the filing's slam: shut on the stamp, then open again */
  const slam = (k: number): number => (k <= 0 ? 0 : k > 0.8 ? 1 : ease(k / 0.8));

  /**
   * ⚑ S183c — THE TERMINAL SHOWS THE PLAN. Sérgio, 2026-09-27: "what does the second computer add
   * there? does the screen show anything?" — and then, when S183b had it type each record entry:
   * "if the screen of the computer is working, what is the Witness panel doing there?" Right: two
   * surfaces saying one thing. So the wall keeps the PAST (what you did, what it was filed as) and the
   * terminal carries the PLAN: what the file is being used for NOW and what comes NEXT — the chain of
   * who hands you to whom (mentor → parent → pastor → placement), in the system's own terse voice
   * (data/strings/institution.json). A step that changes is typed in, a letter at a time; between
   * changes the screen waits under a blinking cursor. One small canvas, uploaded only when a letter
   * or the cursor changes.
   */
  type Step = { when?: string; atCount?: number; now: string; next: string };
  const PLAN = planData as unknown as { header: Record<string, string>; now: string; next: string; steps: Record<string, Step[]> };
  let term: { ctx: CanvasRenderingContext2D; tex: pc.Texture; mat: pc.StandardMaterial } | null = null;
  let planKey = '';              // the step on screen, as `now|next`
  let shown = -1;                // how many of its characters are typed
  let drawn = '';                // the last frame's picture, as a key
  let termEra: EraKey | null = null;
  /** the practices this era's file holds so far — for `when: "kind:<practice>"` (2003's beats) */
  let kinds = new Set<string>();
  let kindsKey = '';
  function stepFor(era: EraKey, has: (id: string) => boolean, fileSize: number): Step | null {
    const steps = PLAN.steps[era];
    if (!steps) return null;
    if (kindsKey !== `${era}|${fileSize}`) {
      kindsKey = `${era}|${fileSize}`;
      kinds = new Set(entriesByEra()[era].map((e) => e.kind));
    }
    let cur: Step | null = null;
    for (const st of steps) {
      if (st.when?.startsWith('kind:') ? !kinds.has(st.when.slice(5)) : st.when && !has(st.when)) continue;
      if (st.atCount !== undefined && fileSize < st.atCount) continue;
      cur = st;
    }
    return cur;
  }
  function buildTerminal(): void {
    const screen = room.props.get('inst_terminalScreen')?.entity;
    const app = pc.Application.getApplication();
    if (!screen || !app) return;
    const canvas = document.createElement('canvas');
    canvas.width = TERM_W; canvas.height = TERM_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tex = new pc.Texture(app.graphicsDevice, {
      width: TERM_W, height: TERM_H, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
      minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(canvas);
    const mat = new pc.StandardMaterial();
    mat.diffuse.set(0, 0, 0);
    mat.emissiveMap = tex;
    mat.emissive.set(1, 1, 1);
    mat.update();
    const plane = new pc.Entity('inst_terminalScreen-text');
    plane.addComponent('render', { type: 'plane' });
    if (plane.render) plane.render.material = mat;
    plane.setLocalEulerAngles(90, 180, 0);          // the screen faces the room (-Z), as the wall prints do
    plane.setLocalPosition(0, 0, -0.52);
    screen.addChild(plane);
    term = { ctx, tex, mat };
  }
  function typeTick(dt: number, era: EraKey, has: (id: string) => boolean, fileSize: number, lit: number): void {
    if (!term) return;
    const st = stepFor(era, has, fileSize);
    if (!st) return;
    const key = `${st.now}|${st.next}`;
    if (termEra !== era) { termEra = era; planKey = key; shown = st.now.length + st.next.length; }
    else if (key !== planKey) { planKey = key; shown = 0; }
    const total = st.now.length + st.next.length;
    if (shown < total) shown = Math.min(total, shown + dt * TYPE_CPS);
    const n = Math.floor(shown);
    const cursorOn = n < total || Math.floor(clock * 2) % 2 === 0;
    term.mat.emissiveIntensity = 1 + lit * 0.8;
    term.mat.update();
    const pic = `${era}|${key}|${n}|${cursorOn}`;
    if (pic === drawn) return;
    drawn = pic;
    const c = term.ctx;
    const nowTxt = st.now.slice(0, n), nextTxt = st.next.slice(0, Math.max(0, n - st.now.length));
    px(c, 0, 0, INSTITUTION.screenBg, TERM_W, TERM_H);
    text(c, PLAN.header[era] ?? '', 2, 1, INSTITUTION.screenDim);
    px(c, 2, 7, INSTITUTION.screenDim, TERM_W - 4, 1);
    text(c, PLAN.now, 2, 10, INSTITUTION.screenDim);
    text(c, nowTxt, 2, 16, INSTITUTION.screenInk);
    text(c, PLAN.next, 2, 22, INSTITUTION.screenDim);
    text(c, nextTxt, 2, 28, INSTITUTION.screenInk);
    if (cursorOn) {
      const onNext = n >= st.now.length;
      const cx = Math.min(TERM_W - 5, 2 + (onNext ? nextTxt.length : nowTxt.length) * 4);
      px(c, cx, (onNext ? 28 : 16) + 4, INSTITUTION.screenInk, 3, 1);
    }
    term.tex.upload();
  }

  function tick(dt: number, era: EraKey, busy: boolean, fileSize: number, pulseK: number, watched: boolean, has: (id: string) => boolean): void {
    clock += dt;
    for (const [k, t] of presses) presses.set(k, t + dt);
    if (lastEra !== era) {                     // a new era starts from its own resting state
      lastEra = era; presses.clear();
      suitcaseT = -1; packetT = -1;
    }
    // ⚑ S183c — THE CORNER CHANGES WHILE YOUR BACK IS TURNED. Most filings happen while you face
    //   the desktop; the stamp is heard, the cold creep calls, and the turn finds the room moved.
    //   What 1997 has revealed is therefore applied only while the corner is out of view.
    if (!watched) {
      arrived = { file: fileSize > 0, plan: has('went-online'), mother: has('rob-spoke-mother'), packed: has('enrollment-acknowledged') };
    }
    if (busy) return;                          // the cascade owns every prop while it runs

    // ── S183e: which of the corner exists yet. In 1997, by the story's beats; from 2003 on, whatever
    //    the era's data folds to (a prop hidden in 1997 must come back where the fold keeps it).
    const show = (ids: string[], on: boolean): void => {
      for (const id of ids) {
        const h = room.props.get(id);
        if (h && base(id, era)) h.entity.enabled = era === 'e1' ? on : true;
      }
    };
    show(STAGE_FILE, arrived.file);
    show(STAGE_PLAN, arrived.plan);

    // ── drawer 12: open by the file's size; a filing slams it; a press pulls it out
    const want = Math.min(DRAWER_OPEN_MAX, DRAWER_OPEN_MIN + DRAWER_OPEN_PER * fileSize);
    drawerOpen += (want - drawerOpen) * Math.min(1, dt * 1.5);
    const open = drawerOpen * (1 - slam(pulseK)) + DRAWER_PRESS * drawerPress();
    for (const id of DRAWER_PARTS) place(id, era, 0, 0, -open);

    // ── the terminal: the plan, typed in when it moves (S183c)
    typeTick(dt, era, has, fileSize, Math.max(pulseK, pressK('instTerminal', 1.2)));

    // ── the wall sheet (1997 the referral list, 2003 the rules): a press lifts it off the wall.
    //    ⚑ S183c: 1997's referral list is not there until Rob has reached your mother — the
    //    pastor's number is in HER pen; it arrives with her (while your back is turned).
    const sheetKey = era === 'e1' ? 'instReferral' : 'instRules';
    const sheetId = era === 'e1' ? 'inst_referral' : 'inst_rules';
    const sheet = room.props.get(sheetId);
    if (sheet && era === 'e1') sheet.entity.enabled = arrived.mother;
    place(sheetId, era, 0, 0, -0.03 * bump(pressK(sheetKey, 0.9)));

    // ── 1997: the suitcase. ⚑ S183c — Sérgio: "The suitcase should be something that appears after
    //    some actions, because we don't know Daniel is going to a camp until later." It is not there
    //    until Rob has spoken to your mother ('placement prepared') — packed, her tag on it — and it
    //    stands by the door once the placement packet is acknowledged ('consent already filed').
    //    Both changes land only while your back is turned.
    if (era === 'e1') {
      for (const id of SUITCASE_PARTS) { const h = room.props.get(id); if (h) h.entity.enabled = arrived.mother; }
      if (arrived.mother) {
        const want = arrived.packed ? 1 : 0;
        suitcaseT = suitcaseT < 0 || !watched ? want : suitcaseT;
        const b = base('suitcase', era);
        if (b) {
          const dx = (SUITCASE_DOOR.x - b.x) * suitcaseT, dz = (SUITCASE_DOOR.z - b.z) * suitcaseT;
          const hop = 0.03 * bump(pressK('instSuitcase', 0.5));
          for (const id of SUITCASE_PARTS) place(id, era, dx, hop, dz);
        }
      }
    }

    // ── 2003: the application is drawn toward the terminal, and the scanner's light passes
    if (era === 'e2') {
      const want = Math.min(PACKET_MAX, PACKET_PER * fileSize);
      packetT = packetT < 0 ? want : packetT + (want - packetT) * Math.min(1, dt * 1.2);
      const nudge = 0.04 * bump(pressK('instPacket', 0.7));
      for (const id of PACKET_PARTS) place(id, era, -packetT - nudge, 0, 0);
      glow('inst_scannerLid', SCANNER, Math.max(pulseK, pressK('instScanner', 1.2)) * 0.8);
    }

    // ── 2016: the router's light chatters; 2026: the status light breathes
    if (era === 'e3') {
      const chatter = Math.sin(clock * 23) * Math.sin(clock * 7.3) > 0.2 ? 1 : 0.35;
      glow('inst_routerLed', ROUTER, Math.max(chatter, pulseK, pressK('instRouter', 1)));
    }
    if (era === 'e4') {
      glow('inst_statusLed', STATUS, Math.max(0.45 + 0.4 * Math.sin(clock * 1.6), pulseK, pressK('instStatus', 1.2)));
    }
  }

  function targets(era: EraKey): Target[] {
    const out: Target[] = [];
    const add = (key: string, prop: string, r: number, practice: string, dy = 0): void => {
      const e = ent(prop);
      if (!e) return;
      const p = e.getPosition();
      out.push({ key, prop, at: { x: p.x, y: p.y + dy, z: p.z }, r, practice });
    };
    // ⚑ S183d — THE SECOND READING. Sérgio: "the Witness system needs to have a dual functionality
    //   of helping understand the underlines of the SOGICE ecosystem." Each object is the material
    //   trace of a documented practice (data/dossier/practices.json — his approved titles and lines),
    //   and a press names it: the look says WHAT the thing is, the press says WHAT IT IS PART OF.
    add('instDrawer', 'inst_cabinet', 0.3, 'profile', 0.1);
    add('instScanner', 'inst_scanner', 0.18, 'update');
    add('instTerminal', 'inst_terminal', 0.17, era === 'e3' ? 'arrival' : 'placement');
    add('instReferral', 'inst_referral', 0.17, 'placement');
    add('instRules', 'inst_rules', 0.17, 'placement');
    add('instPacket', 'inst_packet', 0.14, 'placement');
    add('instSuitcase', 'suitcase', 0.26, 'placement');
    add('instRouter', 'inst_router', 0.12, 'arrival');
    add('instStatus', 'inst_statusLed', 0.1, 'record');
    return out;
  }

  buildTerminal();
  const cardEnt = room.props.get('inst_indexCard')?.entity;
  if (cardEnt) attachPrintToTop(cardEnt, 'indexCard');

  return {
    tick, targets,
    press(key: string): void { presses.set(key, 0); }
  };
}
