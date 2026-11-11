/** 2026 v3 room pressure. Reads the screens' contract; only the room reveal writes a beat. */
import * as pc from 'playcanvas';
import { e4Has, e4BeatsVersion, markE4 } from '../narrative/e4Beats';
import { ledgerGeneration } from '../state/ledger';
import { type RoomHandles, type PropHandle, hex } from './era1room';
import { cullAbsentProps } from './batching';
import { ERA4, PLACE } from '../desktop/theme/era4';
import { drawE4CeilingNetwork } from './ceilingWitness';
import { drawGoalPicture } from '../desktop/apps/goalPicture';

export function buildE4Room(app: pc.Application, building: RoomHandles) {
  const root = new pc.Entity('e4-room-pressure');
  building.root.addChild(root);
  // Separate from the static building batch: these props change presence at narrative beats.
  const props = new Map<string, PropHandle>();
  const handles: RoomHandles = { root, props, lights: new Map(), reinterp: true };
  function solid(id: string, pos: number[], size: number[], color: string): PropHandle {
    const entity = new pc.Entity(id);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(...pos as [number, number, number]);
    entity.setLocalScale(...size as [number, number, number]);
    const material = new pc.StandardMaterial();
    material.diffuse = hex(color); material.update();
    entity.render!.material = material; root.addChild(entity);
    const h = { entity, material, materials: [material], emissive: false };
    props.set(id, h); return h;
  }
  function picture(id: string, pos: number[], w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, resolution = [256, 256]) {
    const canvas = document.createElement('canvas'); canvas.width = resolution[0]; canvas.height = resolution[1];
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const texture = new pc.Texture(app.graphicsDevice, { width: canvas.width, height: canvas.height, mipmaps: false,
      minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST });
    const p = solid(id, pos, [0.004, h, w], ERA4.rule);
    // A plane's normal is +Y; face into the room (-X), upright, with no mirrored text.
    p.entity.render!.type = 'plane'; p.entity.setLocalEulerAngles(90, 270, 0);
    p.entity.setLocalScale(w, 1, h);
    p.material.useLighting = false; p.material.emissive = new pc.Color(1, 1, 1);
    p.material.emissiveMap = texture; p.material.cull = pc.CULLFACE_NONE; p.material.update();
    function repaint(fn = paint) { ctx.clearRect(0, 0, canvas.width, canvas.height); fn(ctx); texture.setSource(canvas); }
    repaint();
    return { ...p, repaint, size: new pc.Vec3(w, 1, h) };
  }
  const plant = [solid('maya-pot', [5.5, .28, -.7], [.22, .26, .22], PLACE.ink),
    solid('maya-leaves', [5.5, .55, -.7], [.32, .3, .32], PLACE.plant)];
  plant[0].entity.render!.type = 'cylinder';
  const leaves = new pc.Mesh(app.graphicsDevice);
  const lp: number[] = [], li: number[] = [];
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, base = lp.length / 3;
    const x = Math.cos(a), z = Math.sin(a);
    lp.push(0, -.5, 0, x * .24 - z * .12, .05, z * .24 + x * .12,
      x * .5, .5, z * .5, x * .24 + z * .12, .05, z * .24 - x * .12);
    li.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  leaves.setPositions(lp); leaves.setIndices(li); leaves.setNormals(pc.calculateNormals(lp, li)); leaves.update();
  plant[1].material.cull = pc.CULLFACE_NONE; plant[1].material.update();
  plant[1].entity.render!.meshInstances = [new pc.MeshInstance(leaves, plant[1].material)];
  const flag = picture('maya-pride', [5.665, 1.78, 1.98], .65, .38, c => {
    [PLACE.sky, PLACE.textileHi, PLACE.mug, PLACE.textileHi, PLACE.sky].forEach((col, i) => {
      c.fillStyle = col; c.fillRect(0, i * 52, 256, 52);
    });
  });
  const friends = picture('maya-friends', [5.66, 1.28, 1.98], .5, .28, c => {
    c.fillStyle = PLACE.mug; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3; i++) {
      const x = 6 + i * 84;
      c.fillStyle = i === 1 ? PLACE.sky : PLACE.wallLo; c.fillRect(x, 10, 76, 236);
      for (let j = 0; j < 4; j++) {
        const px = x + 3 + j * 17, y = 60 + ((j + i) % 3) * 13;
        c.fillStyle = ERA4.photoHair; c.fillRect(px, y, 13, 20);
        c.fillStyle = ERA4.photoSkin; c.fillRect(px + 2, y + 5, 9, 13);
        c.fillStyle = [PLACE.textileHi, PLACE.sky, PLACE.mug, PLACE.plant][j]; c.fillRect(px - 1, y + 20, 15, 75);
      }
    }
  });
  // ⚑ S328 (T46, his 8 Nov: "a shelf on top of the bed, which makes no sense") — the throw was a 4 cm slab hung along
  //   the wall side of the bed and read as a shelf. It lies folded across the FOOT of the bed now (bed spans x 3.21–5.26,
  //   z 1.33–2.38, top 0.50; its pillow is at x 3.35), 1.4 cm thick, on the blanket: a throw, seen in the conducted turn.
  // ⚑ S358 / H17 (his headset, 10 Nov: "a shelf sits on top of the bed", again) — MEASURED this time: the pillow is at
  //   x 4.71–5.08 (top 0.38), the blanket at x 3.23–4.71 (top 0.347); the frame's 0.50 is the headboard. The throw hung
  //   12 cm over the PILLOW, a plank in the air. It lies on the blanket at the true foot (x ≈ 3.5), 1.4 cm thick.
  const throwProp = solid('maya-pink-throw', [3.52, .355, 1.85], [.42, .014, 1.0], PLACE.textileHi);
  // ⚑ S358 / H17 (his: "a photo of Maya just hanging around here in front of me") — it was a bare plane standing at the
  //   desk's front edge, between him and the monitor. It hangs on the wall behind the desk, left of the monitor, above
  //   the headset: on the wall, where a photograph is.
  // ⚑ S363 / N1 (his green cross on job 13's photo: "the framed image of Maya on the wall") — the desk photo frame is gone
  const goal = picture('system-default-portrait', [5.66, 1.45, 1.98], .65, .64,
    c => { c.fillStyle = ERA4.rule; c.fillRect(0, 0, 256, 256); drawGoalPicture(c, 8, 8, 240, 240); });
  // ⚑ S365 (UiB job 14 Part C1, his 11 Nov) — the news strips and the clinic ticket are gone from her wall: the articles
  //   and the number live on her screen (the News and Mail tabs), not on the room.
  // ⚑ S365 (job 14 C1) — NO CONTAGION MAP OVER HER ROOM: this plane (the name is kept for the probes) is off while she is
  //   in her room — never enabled, never painted — and exists ONLY as the stream's audience, hung out over the Commons
  //   (see `update`). It survives the room being hidden, so the audience stays up while the stream runs.
  const ceiling = picture('maya-ceiling-network', [8, 5, .84], 2.0, 2.0, () => {}, [512, 512]);
  app.root.addChild(ceiling.entity);
  ceiling.entity.setLocalEulerAngles(180, 270, 0);
  const sizes = new Map([...props.values()].map(p => [p.entity, p.entity.getLocalScale().clone()]));
  function visible(p: PropHandle, on: boolean) { p.entity.setLocalScale(on ? sizes.get(p.entity)! : pc.Vec3.ZERO); }
  const originalMats = new Map<pc.StandardMaterial, pc.Color>();
  let seen = '', ceilingSeen = '', generation = -1;
  let wasActive = false;
  let data = { number: 4812, articles: 0, clipTime: 0, takeover: false, viewers: 41 };
  function setScreenData(next: typeof data) { data = next; }
  let leftT = 0, revealT = -1;
  let conduct: (() => boolean) | null = null;
  let revealed: (() => boolean) | null = null;
  function setConduct(fn: () => boolean, done: () => boolean) { conduct = fn; revealed = done; }
  function update(dt: number, active: boolean) {
    if (wasActive !== active) { seen = ''; wasActive = active; }
    root.enabled = active;
    const streaming = e4Has('stream') && !e4Has('terminated');
    // ⚑ S358 / H17 (his headset, 10 Nov: "something on the ceiling should be removed… this is not for here") — the
    //   network no longer hangs over her room; the same plane is the stream's audience, out in the Commons.
    //   ⚑ S365 (job 14 C1): and nothing contagion-shaped is ever painted on it any more — only the audience.
    ceiling.entity.enabled = active && streaming;
    if (!active) {
      for (const [mat, color] of originalMats) if (!mat.diffuse.equals(color)) { mat.diffuse.copy(color); mat.update(); }
      return;
    }
    if (generation !== ledgerGeneration) { leftT = 0; revealT = -1; seen = ''; generation = ledgerGeneration; }
    // ⚑ S360 (UiB job 13 Part A: "her friends never leave") — nobody leaves the house chat any more; the room's conducted
    //   turn follows Meridian's refusal instead, once its email has been read (the screens wait for 'room': browser 'pause')
    if (e4Has('meridian') && !e4Has('room') && !e4Has('terminated')) {
      leftT += dt;
      if (leftT >= 6.5 && revealT < 0 && conduct?.()) revealT = 0;
      if (revealT >= 0) { revealT += dt; if (revealT >= 9.7 && revealed?.()) markE4('room'); }
    }
    const ceilingKey = `${ledgerGeneration}:${e4BeatsVersion()}:${data.viewers}`;
    if (ceiling.entity.enabled && ceilingKey !== ceilingSeen) {
      ceilingSeen = ceilingKey;
      ceiling.repaint(c => drawE4CeilingNetwork(c, e4Has('junie'), data.viewers));
    }
    const key = `${ledgerGeneration}:${e4BeatsVersion()}`;
    if (key === seen) return;
    seen = key;
    const restored = e4Has('terminated');
    // S360: the barer room (friends' photo down, the throw) comes with the refusal now; ⚑ H47 (his headset: "'You, restored'
    //   is on the front, the table and the wall… the change to yourself should be in the headset only") — the goal
    //   picture is never on the table or the wall
    const n = !restored && e4Has('number'), m = !restored && e4Has('meridian'), l = m;
    plant.forEach(p => visible(p, !n)); visible(flag, !m); visible(friends, !l); visible(goal, false);
    throwProp.material.diffuse = hex(l ? ERA4.text : PLACE.textileHi); throwProp.material.update();
    // The crude defaults spread to the bedding, curtains and rug; preserve the real per-model materials.
    for (const id of ['e_bed', 'e_rug', 'e_curtL', 'e_curtR']) {
      for (const mat of building.props.get(id)?.materials ?? []) {
        if (!originalMats.has(mat)) originalMats.set(mat, mat.diffuse.clone());
        mat.diffuse.copy(m ? hex(ERA4.text) : originalMats.get(mat)!); mat.update();
      }
    }
    cullAbsentProps(handles, null);
  }
  return { update, setScreenData, setConduct };
}
