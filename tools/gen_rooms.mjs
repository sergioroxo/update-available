// gen_rooms.mjs — Session 15 geometry generator.
// Three intimate rooms, axis-aligned (90° only), Room 1 kept at E1 scale.
// Side rooms (Room 2 west, Room 3 east) are placed from ONE local bedroom
// template so the layout is believable and consistent, then baked to world
// coords + a whole-room yaw. Output: data/room/reinterp_deltas.json (r1..r4,
// one state per era — each state ages the three rooms one era on).
//
// Local frame of the template: person sits facing -Z (the desk wall); the
// OPENING to the hub is on +Z. x = right. Bed on the +X wall, door on the -X
// wall toward the front — never beside the bed, never on the opening.
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// repo-relative so the room geometry is always regenerable: `node tools/gen_rooms.mjs`.
// The rooms are a deterministic function of this file — never hand-edit the baked
// world coords in reinterp_deltas.json; change the template/placement here and rerun.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data/room/reinterp_deltas.json');
const OUT = SRC;

const P = {              // shared palette (all hexes already in era1.json family)
  wall: '#E6D2BC', floor: '#C9A07A', ceil: '#E2CFBA',
  desk: '#8A5A3B', leg: '#74492F',
  crtBody: '#D8CDB4', bezel: '#2C2C34', foot: '#CFC4AA', keys: '#C9BFA6',
  bedFrame: '#A07B52', mattress: '#F0E5D4', pillow: '#F5EDDC', rug: '#B98563',
  frame: '#A8917B', dayPane: '#D4D0C8', door: '#B89B7E', knob: '#8A5A3B',
  cd: '#D4D0C8'
};

// one believable bedroom in LOCAL coords. `idy` = per-room identity colors.
function template(idy) {
  const s = idy.screen, cu = idy.curtain, po = idy.poster, bl = idy.blanket,
        sg = idy.sign, ba = idy.bookA, bb = idy.bookB;
  return [
    // shell (opening on +Z: no wall there, only a lintel)
    // shell (opening on +Z: no wall there, only a lintel)
    ['floor',    [0, 0.0, 0],     [3.5, 0.04, 3.7], P.floor],
    ['ceil',     [0, 2.68, 0],    [3.5, 0.04, 3.7], P.ceil],
    ['wallDesk', [0, 1.34, -1.83], [3.5, 2.68, 0.06], P.wall],
    ['wallL',    [-1.75, 1.34, 0], [0.06, 2.68, 3.7], P.wall],
    ['wallR',    [1.75, 1.34, 0],  [0.06, 2.68, 3.7], P.wall],
    ['lintel',   [0, 2.43, 1.83],  [3.5, 0.5, 0.06], P.wall],
    // window on the desk wall (upper-left), day pane at E2
    ['winPane', [-0.85, 1.62, -1.79], [0.7, 0.62, 0.03], idy.dayPane ?? P.dayPane, true],
    ['winTop',  [-0.85, 1.96, -1.78], [0.78, 0.06, 0.05], P.frame],
    ['winBot',  [-0.85, 1.28, -1.78], [0.78, 0.06, 0.05], P.frame],
    ['winL',    [-1.22, 1.62, -1.78], [0.06, 0.72, 0.05], P.frame],
    ['winR',    [-0.48, 1.62, -1.78], [0.06, 0.72, 0.05], P.frame],
    ['curtL',   [-1.28, 1.6, -1.74], [0.12, 0.9, 0.05], cu],
    ['curtR',   [-0.42, 1.6, -1.74], [0.12, 0.9, 0.05], cu],
    ['poster',  [0.92, 1.6, -1.79], [0.5, 0.6, 0.02], po],
    ['sign',    [0.5, 2.16, -1.79], [0.4, 0.26, 0.03], sg, true],
    // HERO FURNITURE = real Kenney low-poly models (CC0), self-scaling + centering
    // on their floor pos; recolored flat. `size` is the box-fallback footprint.
    // desk against the desk wall, facing +Z (toward the seat)
    ['desk', [0, 0, -1.4], [1.4, 0.75, 0.6], P.desk, false, 'desk'],
    // chair facing the desk — pulled slightly out so the model never clips it
    ['chair', [0, 0, -0.6], [0.5, 0.75, 0.5], P.desk, false, 'chair'],
    // bed against the RIGHT wall (+X), long axis along Z (headboard to the back)
    ['bed', [1.15, 0, -0.35], [1.05, 0.5, 2.05], bl, false, 'bed'],
    ['nightstand', [1.2, 0, 0.85], [0.4, 0.5, 0.4], P.bedFrame, false, 'nightstand'],
    // bookcase against the LEFT wall (-X)
    ['bookcase', [-1.55, 0, -0.4], [0.75, 1.7, 0.5], P.desk, false, 'bookcase'],
    // rug (a thin model, laid on the floor)
    ['rug', [0, 0.0, -0.15], [1.6, 0.02, 1.5], idy.rugColor ?? P.rug, false, 'rug'],
    // clean CRT (period-correct 2003), still a box hero, facing +Z toward the seat
    ['crtBody',   [0, 1.08, -1.55], [0.5, 0.42, 0.4], P.crtBody],
    ['crtBezel',  [0, 1.08, -1.33], [0.46, 0.38, 0.03], P.bezel],
    ['crtScreen', [0, 1.08, -1.315], [0.34, 0.28, 0.02], s, true],
    ['crtFoot',   [0, 0.8, -1.5], [0.3, 0.06, 0.3], P.foot],
    ['keyboard',  [0, 0.755, -1.22], [0.42, 0.03, 0.14], P.keys],
    ['mouse',     [0.34, 0.755, -1.22], [0.06, 0.02, 0.09], P.keys],
    // door on the LEFT wall toward the front — away from the bed
    ['doorPanel', [-1.72, 1.02, 0.95], [0.05, 2.04, 0.86], P.door],
    ['doorKnob', [-1.66, 1.0, 0.62], [0.04, 0.04, 0.04], P.knob]
  ];
}

// place a local template at world origin O=(ox,oz), whole-room yaw F (deg).
// worldX = ox + lx*cosF + lz*sinF ; worldZ = oz - lx*sinF + lz*cosF
function place(prefix, tpl, ox, oz, F) {
  const r = (F * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const round = (n) => Math.round(n * 1000) / 1000;
  return tpl.map(([id, [lx, ly, lz], size, color, emissive, model]) => {
    const wx = round(ox + lx * c + lz * s);
    const wz = round(oz - lx * s + lz * c);
    const out = { id: prefix + '_' + id, pos: [wx, round(ly), wz], size: [...size], color };
    if (emissive) out.emissive = true;
    if (F % 360 !== 0) out.yaw = ((F % 360) + 360) % 360;
    if (model) out.model = model; // real low-poly mesh (self-scales/centers; box = fallback)
    return out;
  });
}

// identity palettes
const vera = { screen: '#5DCAA5', curtain: '#A8B49A', poster: '#D4A0A0',
  blanket: '#C98F8F', sign: '#A8B49A', bookA: '#C9A8A0', bookB: '#A8B49A', rugColor: '#B98563' };
const maya = { screen: '#6FB8D8', curtain: '#E8B7C8', poster: '#9FB4C0',
  blanket: '#E8B7C8', sign: '#9FB4C0', bookA: '#E8B7C8', bookB: '#9FB4C0', rugColor: '#D4A0A0' };

// Room 2 = west (Vera), faces -X: F=90, opening (+Z, lz=+1.83) → worldX -2.05
const room2 = place('w', template(vera), -3.88, 0.7, 90);
// Room 3 = east (Maya), faces +X: F=270, opening → worldX +2.05
const room3 = place('e', template(maya), 3.88, 0.7, 270);

// Room 1's side walls become DOORWAYS (stubs + lintel; big central opening).
// west wall was (-2.13,1.35,1.5)[0.04,2.7,4.44] z[-0.72,3.72]; mirror east.
// Round 25 ("black strip next to the entrance"): the opening must stay INSIDE
// the side room's own span (its walls run world-z -1.05..2.45 at ±2.05), or
// the cut opens onto the room's outer wall face and the void beyond it. The
// opening is now z -0.12..2.42 (was ..2.92), and a small cap closes the 8 cm
// pocket between the two wall planes north of Room 1's front wall.
function doorway(prefix, x) {
  return [
    { id: prefix + 'Front', pos: [x, 1.35, -0.42], size: [0.05, 2.7, 0.6], color: P.wall },
    { id: prefix + 'Back', pos: [x, 1.35, 3.07], size: [0.05, 2.7, 1.3], color: P.wall },
    { id: prefix + 'Lintel', pos: [x, 2.42, 1.15], size: [0.05, 0.56, 2.54], color: P.wall },
    { id: prefix + 'Cap', pos: [x + (x > 0 ? -0.04 : 0.04), 1.35, -0.885], size: [0.13, 2.7, 0.33], color: P.wall }
  ];
}
const openWest = doorway('w1door', -2.13);
const openEast = doorway('e1door', 2.13);

// ── per-era aging additions (Phase B). Small, legible, PLACEHOLDER greybox. ──
// Room 2 (Vera, 2016) gains a plant; Room 3 (Maya) a misfiled-folder stack (one
// askew — the E3 dilemma motif) then a phone at E4; Room 1 gets moving boxes as
// Daniel is "transferred". Lamp props ride to Maya's desk at E4 (the warm thread).
const veraPlant = place('w', [
  ['plant_pot', [1.35, 0.28, 1.0], [0.22, 0.26, 0.22], '#74492F'],
  ['plant_top', [1.35, 0.55, 1.0], [0.32, 0.3, 0.32], '#A8B49A']
], -3.88, 0.7, 90);
const mayaFolders = place('e', [
  ['folders', [0.36, 0.79, -1.28], [0.3, 0.07, 0.22], '#F5F4ED'],
  ['folderAskew', [0.4, 0.85, -1.26], [0.28, 0.02, 0.2], '#E8B7C8']
], 3.88, 0.7, 270);
const mayaPhone = place('e', [
  ['phone', [0.42, 0.77, -1.02], [0.09, 0.012, 0.17], '#1A1A24']
], 3.88, 0.7, 270);
const danielBoxes = [
  { id: 'movingBox1', pos: [0.72, 0.2, 1.15], size: [0.5, 0.4, 0.5], color: '#B89B7E' },
  { id: 'movingBox2', pos: [1.02, 0.15, 1.45], size: [0.4, 0.3, 0.4], color: '#A8917B' }
];

const deltas = {
  _doc: 'Session 15 (Sérgio Round 24): THREE INTIMATE ROOMS THAT AGE, one shell. r1 = reinterp E1 (witness furniture out; spine door + record terminal). r2 = T1 "the room OPENS, it does not explode": Room 1 (Daniel, gay) keeps its EXACT E1 walls/desk/front-wall distance; its side walls become DOORWAYS revealing Room 2 (west/Vera, lesbian) and Room 3 (east/Maya, trans) — two adjacent intimate bedrooms at the SAME scale, axis-aligned (90° only), each read at E1 desk-intimacy when the camera dollies in. r4 = E4: the focus is Room 3 (Maya = the trans room evolved — NOT a separate desk; ◆N3 TURN retargets here); windows go dark for good. Rooms built from ONE local bedroom template (scratchpad/gen_rooms.mjs) placed per room — bed on a side wall, door away from the bed, clean CRT. COLOR LAW: every hex from era1.json family. Phase A: E3 shares the E2 state; per-era aging of all three rooms = Phase B.',
  r1: null, // filled from the existing r1 below
  r2: {
    props: {
      // E2 = the same room, aged: window → day, moon gone (choreography §T1.3);
      // the mixtape survives the packed boombox, moved to Room 1's shelf (it
      // resists graying — the warm thread's first waypoint)
      windowPane: { color: '#D4D0C8' },
      // Room 1's shelf stood in the EAST DOORWAY once its wall left (Sérgio
      // Round 25: "still a shelf in the middle of the space") — the whole
      // shelf group rides back to the east-rear wall stub, books and all;
      // the mixtape's waypoint moves with it.
      shelfBack: { pos: [2.1, 1.05, 3.3] },
      shelfBoard1: { pos: [1.98, 0.62, 3.3] },
      shelfBoard2: { pos: [1.98, 1.08, 3.3] },
      shelfBoard3: { pos: [1.98, 1.54, 3.3] },
      book1: { pos: [1.98, 1.21, 3.1] },
      book2: { pos: [1.98, 1.2, 3.2] },
      book3: { pos: [1.98, 1.67, 3.15] },
      cdStack: { pos: [1.98, 0.71, 3.45] },
      mixtape: { pos: [1.98, 1.16, 3.38] },
      // Room 1's bed moves BACK out of the west doorway (Sérgio: "the bed on
      // Era-1 can't be there, it stands in front of the opening for the other
      // room") — tucked to the back-left corner, shortened, clearing the seated
      // sightline into Room 2. (T-layout constraint; the X-layout frees a wall.)
      bedFrame: { pos: [-1.72, 0.18, 2.78], size: [0.78, 0.28, 1.55] },
      mattress: { pos: [-1.72, 0.36, 2.78], size: [0.72, 0.1, 1.48] },
      blanket: { pos: [-1.72, 0.43, 3.05], size: [0.74, 0.05, 0.9] },
      pillow: { pos: [-1.72, 0.44, 2.12], size: [0.5, 0.09, 0.32] }
    },
    remove: ['wallWest', 'wallEast', 'moon', 'boombox', 'boomboxSpeakerL', 'boomboxSpeakerR', 'boomboxDeck'],
    add: [...openWest, ...openEast, ...room2, ...room3]
  },
  // r3 = E3 (2016): Room 1 closes (Daniel "transferred" — moving boxes, the bed
  // under a dust sheet); Room 2 comes forward as Vera's (pastel, a plant); Room
  // 3 keeps evolving (the misfiled folders). Focus dollies to Room 2 (yaw 90).
  r3: {
    props: {
      blanket: { color: '#C8C4BC' },                 // Room 1 bed → dust sheet
      w_curtL: { color: '#C8B8D0' }, w_curtR: { color: '#C8B8D0' }, // Room 2 → 2016 pastel
      w_poster: { color: '#B8D0C8' },
      w_crtScreen: { color: '#BFE0DA' },             // platform-pale
      e_crtScreen: { color: '#8FC4E0' }
    },
    remove: [],
    add: [...danielBoxes, ...veraPlant, ...mayaFolders]
  },
  // r4 = E4 (present): Room 3 leads (Maya) — the lamp props ride to her desk
  // (the warm thread's end), a phone lands, the interface screen; every window
  // goes dark for good. Focus dollies to Room 3 (yaw 270); the terminal migrates
  // beside it in code (cluster.ts migrateTerminal).
  r4: {
    props: {
      windowPane: { color: '#15151F' },
      w_winPane: { color: '#15151F' },
      e_winPane: { color: '#15151F' },
      e_crtScreen: { color: '#2C3A5C' },
      lampFoot: { pos: [5.15, 0.78, 1.5] },
      lampPole: { pos: [5.15, 0.9, 1.5] },
      lampShade: { pos: [5.15, 1.02, 1.5] }
    },
    // the terminal SCREEN plane migrates beside Maya in code (cluster.ts); drop
    // its frame box, which would otherwise stay orphaned on the empty spine
    remove: ['terminalFrame'],
    add: [...mayaPhone]
  }
};

// preserve the existing r1 verbatim (spine door + terminal — unchanged)
const current = JSON.parse(readFileSync(SRC, 'utf8'));
deltas.r1 = current.r1;

writeFileSync(OUT, JSON.stringify(deltas, null, 2));
console.log('wrote', OUT, '— room2', room2.length, 'room3', room3.length, 'props');
