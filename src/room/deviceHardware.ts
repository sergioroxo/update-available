/** Native-frame hardware boxes share one vertex-coloured mesh. The transform,
 * normals and era colours are unchanged; seven buttons/bezel cost one draw. */
import * as pc from 'playcanvas';
type V3 = [number, number, number];
export type HardwareBox = (name: string, pos: V3, size: V3, color: string) => void;
export function dressDeviceHardware(node: pc.Entity, dress: (box: HardwareBox) => void): void {
  const app = pc.Application.getApplication(); if (!app) return;
  const box = pc.createBox(app.graphicsDevice, {});
  const bp: number[] = [], bn: number[] = [], bi: number[] = [];
  box.getPositions(bp); box.getNormals(bn); box.getIndices(bi);
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], indices: number[] = [];
  dress((_name, pos, size, color) => {
    const offset = positions.length / 3, c = new pc.Color().fromString(color);
    for (let i = 0; i < bp.length; i += 3) {
      positions.push(pos[0] + bp[i] * size[0], pos[1] + bp[i + 1] * size[1], pos[2] + bp[i + 2] * size[2]);
      normals.push(bn[i], bn[i + 1], bn[i + 2]); colors.push(c.r, c.g, c.b, 1);
    }
    indices.push(...bi.map(i => i + offset));
  });
  box.destroy(); if (!positions.length) return;
  const mesh = new pc.Mesh(app.graphicsDevice); mesh.setPositions(positions); mesh.setNormals(normals); mesh.setColors(colors); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const m = new pc.StandardMaterial(); m.diffuse.set(1, 1, 1); m.diffuseVertexColor = true; m.update();
  const e = new pc.Entity('device-hardware'); node.addChild(e);
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, m, e)] });
}
