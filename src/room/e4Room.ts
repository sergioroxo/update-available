/** 2026 v3 room pressure. Reads the screens' contract; only the room reveal writes a beat. */
import * as pc from 'playcanvas';
import { e4Has, e4BeatsVersion, markE4 } from '../narrative/e4Beats';
import { ledgerGeneration } from '../state/ledger';
import { type RoomHandles, type PropHandle, hex } from './era1room';
import { cullAbsentProps } from './batching';
import { ERA4, PLACE, photograph } from '../desktop/theme/era4';
import V from '../../data/dialog/s4_v3.json';
import { wrapText, setFont } from '../desktop/theme/chrome';
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
  const flag = picture('maya-pride', [5.665, 1.78, 2.15], .65, .38, c => {
    [PLACE.sky, PLACE.textileHi, PLACE.mug, PLACE.textileHi, PLACE.sky].forEach((col, i) => {
      c.fillStyle = col; c.fillRect(0, i * 52, 256, 52);
    });
  });
  const friends = picture('maya-friends', [5.66, 1.28, 2.15], .5, .28, c => {
    c.fillStyle = PLACE.mug; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3; i++) photograph(c, 6 + i * 84, 10, 76, 236, false, i + 1);
  });
  const throwProp = solid('maya-pink-throw', [4.1, .53, 2.2], [.9, .04, .35], PLACE.textileHi);
  const frame = picture('maya-desk-photo', [5.665, 1.04, .25], .17, .22,
    c => photograph(c, 0, 0, 256, 256, false, 3));
  const goal = picture('system-default-portrait', [5.66, 1.52, 2.15], .65, .72,
    c => drawGoalPicture(c, 0, 0, 256, 256));
  const strips = V.news.articles.map((a, i) => picture(`news-strip-${a.id}`, [5.655, 2.28 - i * .29, 1.46], 1.02, .26, c => {
    c.fillStyle = PLACE.mug; c.fillRect(0, 0, 512, 128);
    c.fillStyle = ERA4.field; setFont(c, 25);
    wrapText(c, a.head, 490).forEach((line, j) => c.fillText(line, 10, 12 + j * 29));
  }, [512, 128]));
  const ticket = picture('clinic-ticket', [5.65, 2.22, .25], .38, .3, () => {}, [256, 192]);
  const sizes = new Map([...props.values()].map(p => [p.entity, p.entity.getLocalScale().clone()]));
  function visible(p: PropHandle, on: boolean) { p.entity.setLocalScale(on ? sizes.get(p.entity)! : pc.Vec3.ZERO); }
  const originalMats = new Map<pc.StandardMaterial, pc.Color>();
  let seen = '', generation = -1, lastNumber = -1;
  let data = { number: 4812, articles: 0, clipTime: 0, takeover: false };
  function setScreenData(next: typeof data) { data = next; }
  let leftT = 0, revealT = -1;
  let conduct: (() => boolean) | null = null;
  function setConduct(fn: () => boolean) { conduct = fn; }
  function update(dt: number, active: boolean) {
    root.enabled = active;
    if (!active) return;
    if (generation !== ledgerGeneration) { leftT = 0; revealT = -1; seen = ''; generation = ledgerGeneration; }
    if (e4Has('left') && !e4Has('room')) {
      leftT += dt;
      if (leftT >= 1.5 && revealT < 0 && conduct?.()) revealT = 0;
      if (revealT >= 0) { revealT += dt; if (revealT >= 9) markE4('room'); }
    }
    const key = `${ledgerGeneration}:${e4BeatsVersion()}:${data.number}:${data.articles}`;
    if (key === seen) return;
    if (generation !== ledgerGeneration) { generation = ledgerGeneration; }
    seen = key;
    const n = e4Has('number'), m = e4Has('meridian'), l = e4Has('left');
    plant.forEach(p => visible(p, !n)); visible(flag, !m); visible(friends, !l); visible(goal, l);
    throwProp.material.diffuse = hex(l ? ERA4.text : PLACE.textileHi); throwProp.material.update();
    // The crude defaults spread to the bedding, curtains and rug; preserve the real per-model materials.
    for (const id of ['e_bed', 'e_rug', 'e_curtL', 'e_curtR']) {
      for (const mat of building.props.get(id)?.materials ?? []) {
        if (!originalMats.has(mat)) originalMats.set(mat, mat.diffuse.clone());
        mat.diffuse.copy(m ? hex(ERA4.text) : originalMats.get(mat)!); mat.update();
      }
    }
    const isGoal = e4Has('newyou') && !e4Has('original');
    frame.repaint(c => isGoal ? drawGoalPicture(c, 0, 0, 256, 256) : photograph(c, 0, 0, 256, 256, false, 3));
    strips.forEach((p, i) => visible(p, e4Has('link') && i < data.articles));
    visible(ticket, n);
    if (lastNumber !== data.number || generation !== ledgerGeneration) {
      lastNumber = data.number;
      ticket.repaint(c => {
        c.fillStyle = PLACE.mug; c.fillRect(0, 0, 256, 192);
        c.fillStyle = ERA4.field; setFont(c, 19); c.fillText(V.clinic.numberLabel, 12, 12);
        setFont(c, 48); c.fillText(data.number.toLocaleString('en-GB'), 12, 55);
        setFont(c, 18); c.fillText(V.clinic.wait, 12, 128);
      });
    }
    if (n) {
      const growth = 1 + Math.max(0, data.number - V.clinic.start) * .045;
      ticket.entity.setLocalScale(ticket.size.x * growth, 1, ticket.size.z * growth);
    }
    cullAbsentProps(handles, null);
  }
  return { update, setScreenData, setConduct };
}
