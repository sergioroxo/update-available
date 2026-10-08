/**
 * ⚑ S188/S189 — THE DEVICES YOU CAN PICK UP AND PLAY (Phase 4; PLAN_PHASE4_GAMES_2026-09-27).
 *
 * Three objects on the shared grammar of src/room/heldDevice.ts, each with its game (src/games/):
 * - 1997 · Daniel's handheld on his bed ('Videogame', Poly by Google) — FIT IN. S188, his: "The game boy
 *   needs to be colored, so it can press it, it comes closer to you to let you play." The model has ONE
 *   material, so its face is built here in its native frame (6.598 × 11.170, face at z 0.40 + 0.731): the
 *   bezel, the lit screen, the magenta A/B, the d-pad, start/select — and those buttons ARE the controls.
 *   Its game is there once the starter kit has come (the cartridge came in the kit's post); before, a Game
 *   Boy switched on with nothing in it: a dark bar.
 * - 2003 · Daniel's flip phone on his desk ('Flip Phone', Timmy Turner) — CLEAR, Restorify's game (⚑ S222: it
 *   replaced REACH; src/games/clear.ts), once the first daily check-in is on his file. Its screen is the model's
 *   own grey-blue glass ('Material.006', a flat plane at y 0.827, x ±0.771, z −0.03…1.99 in its node — measured
 *   from the mesh). A tap on the glass aims the gun at the tap and fires; the soft keys on the glass pause, swap
 *   and set the piece's one mute. Before: the phone's own idle screen.
 * - 2026 · the console on Maya's bed ('Nintendo Switch', Jasmine Roberts) — TIDY, once her file holds two
 *   entries (her first steps with the programme). Its screen is the model's glass (the x ±2.777, y ±1.61 quad of 'Material.006'; that material also carries a small button at x 3.2–3.5).
 *   Taps on the glass play it. Before: a dark home screen with the time.
 * In 2003 the 1997 handheld stands on his bookcase (his: "remove the DS in 2003 … maybe the game boy just moves
 * to another place"), dressed with the same face and a dark screen — kept, not played; never lifted.
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';
import { px, text } from './calendarArt';
import { text as text57, textW as textW57 } from './font57';
import { HANDHELD as H, CLEAR as RC, TIDY as TD } from '../desktop/theme/calendar';
import { buildHeldDevice, type DeviceSpec, type HeldDevice } from './heldDevice';
import type { GameKey } from '../games/types';
import { FitIn } from '../games/fitIn';
import { Clear } from '../games/clear';
import { Tidy } from '../games/tidy';

export const DEVICE_PROP_IDS = ['danielHandheld', 'flipPhone', 'e_console'];
/** the Game Boy face, native units — shared by 1997's handheld and 2003's shelf copy */
const FACE_Z = 1.14;
type Box = (name: string, pos: [number, number, number], size: [number, number, number], hex: string) => void;
const gbHardware = (box: Box): void => {
  const d = (n: string, x: number, y: number, w: number, h: number, depth: number, hex: string) => box(n, [x, y, FACE_Z + depth / 2], [w, h, depth], hex);
  d('hh-bezel', 0, 8.15, 5.6, 4.3, 0.06, H.bezel);
  d('hh-dpadH', -2.0, 3.65, 1.5, 0.5, 0.18, H.dpad);
  d('hh-dpadV', -2.0, 3.65, 0.5, 1.5, 0.18, H.dpad);
  d('hh-btnA', 2.4, 3.95, 0.8, 0.8, 0.18, H.button);
  d('hh-btnB', 1.35, 3.45, 0.8, 0.8, 0.18, H.button);
  d('hh-select', -0.75, 1.95, 0.7, 0.22, 0.1, H.dpad);
  d('hh-start', 0.15, 1.95, 0.7, 0.22, 0.1, H.dpad);
};
const at = (x: number, y: number): [number, number, number] => [x, y, FACE_Z + 0.18];

const SPECS: DeviceSpec[] = [
  {
    propId: 'danielHandheld', modelKey: 'handheld1997', era: 'e1', gameId: 'fitin',
    screen: { pos: [0.15, 8.25, FACE_Z + 0.07], euler: [90, 0, 0], scale: [3.9, 1, 3.5], w: 160, h: 144 },   // ⚑ 2026-10-04: FIT IN v4 is a 160 × 144 game (the real handheld's glass); same aspect, same plane
    dress: (_face, box) => gbHardware(box),
    // ~7 mm targets at arm's length: the d-pad's four arms, A, B, START and SELECT (both start)
    buttons: [
      { key: 'left', at: at(-2.55, 3.65), r: 0.008 }, { key: 'right', at: at(-1.45, 3.65), r: 0.008 },
      { key: 'up', at: at(-2.0, 4.2), r: 0.008 }, { key: 'down', at: at(-2.0, 3.1), r: 0.008 },
      { key: 'a', at: at(2.4, 3.95), r: 0.008 }, { key: 'b', at: at(1.35, 3.45), r: 0.008 },
      { key: 'start', at: at(0.15, 1.95), r: 0.007 }, { key: 'start', at: at(-0.75, 1.95), r: 0.007 }
    ],
    available: (has) => has('kit-inserted'),
    idle: (g, w, h) => { px(g, 0, 0, H.screenLight, w, h); px(g, 32, 64, H.screenDark, 96, 16); },
    game: () => new FitIn(),
    // S222 / W1-B8, W1-K4: held high in the frame so the d-pad, A, B and START under the glass stay in view
    view: { fill: 0.38, raise: 0.24, maxW: 0.66 }
  },
  {
    propId: 'flipPhone', modelKey: 'flipPhone', era: 'e2', gameId: 'clear',
    screenOn: { material: 'Material.006' },
    // ⚑ S222: CLEAR v8 is a 240 × 320 game (REACH was 72 × 96) — the same 3:4, so the same glass quad
    screen: { pos: [0, 0.836, 0.98], euler: [0, 0, 0], scale: [1.5, 1, 1.98], w: 240, h: 320 },
    available: (has) => has('kind:checkin'),
    idle: (g, w, h, clock) => {
      // ⚑ S222 — drawn for the 240 × 320 glass in the game's own 5×7 type (it was 72 × 96, in the 3×5)
      px(g, 0, 0, RC.lcd, w, h);
      for (let i = 0; i < 4; i++) px(g, 10 + i * 9, 26 - (6 + i * 4), RC.lcdDark, 6, 6 + i * 4);
      const t = Math.floor(clock / 2) % 2 ? '21:40' : '21 40';
      text57(g, t, Math.round((w - textW57(t, 6)) / 2), 100, RC.lcdDark, 6);
      text57(g, 'RESTORIFY', Math.round((w - textW57('RESTORIFY', 2)) / 2), 220, RC.lcdMid, 2);
    },
    game: () => new Clear(),
    holdDist: 0.19,
    view: { fill: 0.75, maxW: 0.8 }   // S222 / W1-K4: the glass is the game; the keypad is never pressed
  },
  {
    propId: 'e_console', modelKey: 'console2026', era: 'e4', gameId: 'tidy',
    screenOn: { material: 'Material.006' },
    screen: { pos: [0, 0, 0.28], euler: [90, 0, 0], scale: [5.55, 1, 3.22], w: 128, h: 72 },   // ⚑ the glass quad, x ±2.777 y ±1.61 (Material.006 also carries a button at x 3.2–3.5, which off-centred the first fit — his note, 2026-09-28)
    available: (_has, fileSize) => fileSize >= 2,
    idle: (g, w, h) => { px(g, 0, 0, TD.cardBg, w, h); text(g, '23:12', w - 24, 4, TD.cardDim); },
    game: () => new Tidy(),
    holdDist: 0.42,
    view: { fill: 0.6 }
  }
];

export interface Devices {
  tick(dt: number, era: string, has: (id: string) => boolean, fileSize: number): Array<{ id: string; era: string; witness: string }>;
  aim(ray: { p0: pc.Vec3; p1: pc.Vec3 }, era: string): string | null;
  press(ray: { p0: pc.Vec3; p1: pc.Vec3 }, era: string, cam: pc.Entity): boolean;
  /** ⚑ S219 / W1-B7 — the keyboard reaches the device in hand before it reaches the camera */
  key(k: GameKey, era: string): boolean;
}

export function buildDevices(room: RoomHandles): Devices {
  const built = new Map<string, HeldDevice>();
  const pending = [...SPECS];
  // ⚑ S188 — 2003's shelf copy: the same face, its screen dark (the fold adds it after start-up)
  let shelfDressed = false;
  const dressShelf = (): void => {
    if (shelfDressed) return;
    const face = (room.props.get('danielHandheld2003')?.entity.findByName('model-handheld1997-tilt') as pc.Entity | null)?.children[0] as pc.Entity | undefined;
    if (!face) return;
    const box: Box = (name, pos, size, hex) => {
      const m = new pc.StandardMaterial(); m.diffuse.fromString(hex); m.update();
      const e = new pc.Entity(name); e.addComponent('render', { type: 'box' });
      if (e.render) { e.render.material = m; e.render.batchGroupId = -1; }
      e.setLocalPosition(pos[0], pos[1], pos[2]); e.setLocalScale(size[0], size[1], size[2]); face.addChild(e);
    };
    gbHardware(box);
    box('hh-screenOff', [0.15, 8.25, FACE_Z + 0.04], [3.9, 3.5, 0.08], H.screenDark);
    shelfDressed = true;
  };
  const current = (era: string): HeldDevice | undefined => [...built.values()].find((d) => d.spec.era === era);
  return {
    tick(dt, era, has, fileSize) {
      dressShelf();
      for (let i = pending.length - 1; i >= 0; i--) {        // a device is built the first frame its prop exists
        const d = buildHeldDevice(room, pending[i]);
        if (d) { built.set(pending[i].propId, d); pending.splice(i, 1); }
      }
      const out: Array<{ id: string; era: string; witness: string }> = [];
      for (const d of built.values()) {
        const f = d.tick(dt, era, has, fileSize);
        if (f) out.push({ id: d.spec.gameId, era: d.spec.era, witness: f });
      }
      return out;
    },
    aim(ray, era) {
      const d = current(era);
      const a = d?.aim(ray);
      return a ? `${d!.spec.gameId}:${a}` : null;
    },
    press(ray, era, cam) { return current(era)?.press(ray, cam) ?? false; },
    key(k, era) { return current(era)?.key(k) ?? false; }
  };
}

