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
 * 2. IT PULLS. The corner moves with the file — the witness pulse (src/witness/pulse.ts)
 *    is its clock, so it moves when the stamp sounds and never otherwise:
 *    - the index card on the desk is TAKEN into drawer 12 the moment the card is filed
 *      (`ministry-index-card`, which is filed as you turn: you watch it go);
 *    - drawer 12 stands open wider as the file grows — it is waiting for more — and
 *      every filing slams it shut and lets it open again, on the stamp;
 *    - the terminal's screen lights on every filing, and idles with a slow cursor;
 *    - 1997: the suitcase is carried toward the door, a step per entry (it is gone in
 *      2003 — the weekend happened);
 *    - 2003: the application packet is drawn toward the terminal, a step per entry;
 *    - 2016: the router's light chatters; 2026: the status light breathes.
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
import type { EraKey } from './cluster';

type V3 = { x: number; y: number; z: number };

/** what the look can rest on, per era: the aim key, the prop it moves, a world point and radius */
interface Target { key: string; prop: string; at: V3; r: number }

/** every prop this module writes to — handed to the batcher as never-batch */
export const INSTITUTION_IDS = [
  'inst_drawer12', 'inst_handle2', 'inst_drawerLabel', 'inst_indexCard', 'inst_terminalScreen',
  'suitcase', 'suitcaseHandle', 'suitcaseTag', 'inst_referral', 'inst_rules',
  'inst_packet', 'inst_packetClip', 'inst_scannerLid', 'inst_routerLed', 'inst_statusLed'
];

const DRAWER_PARTS = ['inst_drawer12', 'inst_handle2', 'inst_drawerLabel'];
const SUITCASE_PARTS = ['suitcase', 'suitcaseHandle', 'suitcaseTag'];
const PACKET_PARTS = ['inst_packet', 'inst_packetClip'];

/** 1997: where the suitcase ends up — by the door (door: x 2.1, z 1.78–2.62) */
const SUITCASE_DOOR = { x: 1.7, z: 2.95 };
/** entries it takes to get there (the turn files the 2nd; a full 1997 files ~12) */
const SUITCASE_STEPS = 10;
const DRAWER_OPEN_MIN = 0.02, DRAWER_OPEN_PER = 0.014, DRAWER_OPEN_MAX = 0.2;
const DRAWER_PRESS = 0.16;
const PACKET_PER = 0.02, PACKET_MAX = 0.2;
const CARD_SECONDS = 1.4;

const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export interface Institution {
  /** once a frame */
  tick(dt: number, era: EraKey, busy: boolean, fileSize: number, pulseK: number, cardFiled: boolean): void;
  /** what can be pressed now: aim key, world point, radius (the caller owns the ray maths) */
  targets(era: EraKey): Target[];
  /** a press on one object */
  press(key: string): void;
}

export function createInstitution(room: RoomHandles): Institution {
  const eraIdx: Record<EraKey, number> = { e1: 0, e2: 1, e3: 2, e4: 3 };
  const presses = new Map<string, number>();   // key → seconds since pressed
  let lastEra: EraKey | null = null;
  let cardWas: boolean | null = null;
  let cardT = -1;                              // the card's flight, 0…1, or -1
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
  const TERMINAL = col(INSTITUTION.terminalGlow);
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

  function tick(dt: number, era: EraKey, busy: boolean, fileSize: number, pulseK: number, cardFiled: boolean): void {
    clock += dt;
    for (const [k, t] of presses) presses.set(k, t + dt);
    if (lastEra !== era) {                     // a new era starts from its own resting state
      lastEra = era; presses.clear();
      suitcaseT = -1; packetT = -1;
    }
    if (cardWas === null) { cardWas = cardFiled; cardT = cardFiled ? 1 : -1; }
    else if (cardFiled && !cardWas) { cardWas = true; cardT = 0; }
    if (busy) return;                          // the cascade owns every prop while it runs

    // ── drawer 12: open by the file's size; a filing slams it; a press pulls it out
    const want = Math.min(DRAWER_OPEN_MAX, DRAWER_OPEN_MIN + DRAWER_OPEN_PER * fileSize);
    drawerOpen += (want - drawerOpen) * Math.min(1, dt * 1.5);
    const open = drawerOpen * (1 - slam(pulseK)) + DRAWER_PRESS * drawerPress();
    for (const id of DRAWER_PARTS) place(id, era, 0, 0, -open);

    // ── the index card: taken into the drawer when it is filed
    const card = room.props.get('inst_indexCard');
    if (card) {
      if (cardT >= 1) card.entity.enabled = false;
      else if (cardT >= 0) {
        cardT = Math.min(1, cardT + dt / CARD_SECONDS);
        const from = base('inst_indexCard', era); const d = base('inst_drawer12', era);
        if (from && d) {
          const t = ease(cardT);
          const to = { x: d.x, y: d.y + 0.2, z: d.z - open };
          card.entity.setLocalPosition(
            from.x + (to.x - from.x) * t,
            from.y + (to.y - from.y) * t + Math.sin(Math.PI * t) * 0.25,
            from.z + (to.z - from.z) * t);
          if (cardT >= 1) card.entity.enabled = false;
        }
      }
    }

    // ── the terminal: a slow cursor, lit by every filing and every press
    const cursor = Math.floor(clock * 1.2) % 2 === 0 ? 0.1 : 0.02;
    glow('inst_terminalScreen', TERMINAL, Math.max(cursor, pulseK * 0.9, pressK('instTerminal', 1.2) * 0.9));

    // ── the wall sheet (1997 the referral list, 2003 the rules): a filing or a press lifts it off the wall
    const sheetKey = era === 'e1' ? 'instReferral' : 'instRules';
    const lift = 0.03 * Math.max(bump(pulseK), bump(pressK(sheetKey, 0.9)));
    place(era === 'e1' ? 'inst_referral' : 'inst_rules', era, 0, 0, -lift);

    // ── 1997: the suitcase is carried to the door, a step per entry
    if (era === 'e1') {
      const want = ease(Math.max(0, Math.min(1, (fileSize - 2) / SUITCASE_STEPS)));
      suitcaseT = suitcaseT < 0 ? want : suitcaseT + (want - suitcaseT) * Math.min(1, dt * 1.2);
      const b = base('suitcase', era);
      if (b) {
        const dx = (SUITCASE_DOOR.x - b.x) * suitcaseT, dz = (SUITCASE_DOOR.z - b.z) * suitcaseT;
        const hop = 0.03 * bump(pressK('instSuitcase', 0.5));
        for (const id of SUITCASE_PARTS) place(id, era, dx, hop, dz);
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

  function targets(_era: EraKey): Target[] {
    const out: Target[] = [];
    const add = (key: string, prop: string, r: number, dy = 0): void => {
      const e = ent(prop);
      if (!e) return;
      const p = e.getPosition();
      out.push({ key, prop, at: { x: p.x, y: p.y + dy, z: p.z }, r });
    };
    add('instDrawer', 'inst_cabinet', 0.3, 0.1);
    add('instScanner', 'inst_scanner', 0.18);
    add('instTerminal', 'inst_terminal', 0.17);
    add('instReferral', 'inst_referral', 0.17);
    add('instRules', 'inst_rules', 0.17);
    add('instPacket', 'inst_packet', 0.14);
    add('instSuitcase', 'suitcase', 0.26);
    add('instRouter', 'inst_router', 0.12);
    add('instStatus', 'inst_statusLed', 0.1);
    return out;
  }

  return {
    tick, targets,
    press(key: string): void { presses.set(key, 0); }
  };
}
