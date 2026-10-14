/** Preserve the racket's native surfaces while merging compatible parts.
 * Colour goes into RGB; the native gloss factor goes into vertex alpha.
 * The entire instrument still moves as its original wrapper. */
import * as pc from 'playcanvas';
export function mergeRacketMeshes(root: pc.Entity): void {
  const app = pc.Application.getApplication(); if (!app) return;
  const inverse = root.getWorldTransform().clone().invert();
  const groups = new Map<string, { material: pc.StandardMaterial; p: number[]; n: number[]; c: number[]; i: number[] }>();
  const components: pc.Entity[] = [];
  root.forEach(node => {
    const e = node as pc.Entity; if (!e.render) return;
    components.push(e);
    for (const mi of e.render.meshInstances) {
      const m = mi.material as pc.StandardMaterial;
      // This manifest key is textureless. Gloss gets its own unused vertex channel.
      const key = [m.useLighting,m.useMetalness,m.metalness,m.glossInvert,m.opacity,m.blendType,m.cull,m.specular.r,m.specular.g,m.specular.b,m.emissive.r,m.emissive.g,m.emissive.b].join(':');
      let g = groups.get(key);
      if (!g) { g = { material: m.clone(), p: [], n: [], c: [], i: [] }; groups.set(key,g); }
      const p: number[] = [], n: number[] = [], indices: number[] = [];
      mi.mesh.getPositions(p); mi.mesh.getNormals(n); mi.mesh.getIndices(indices);
      const transform = new pc.Mat4().mul2(inverse, mi.node.getWorldTransform());
      const normal = transform.clone().invert().transpose();
      const offset = g.p.length / 3, v = new pc.Vec3();
      for (let i = 0; i < p.length; i += 3) {
        transform.transformPoint(v.set(p[i],p[i+1],p[i+2]),v); g.p.push(v.x,v.y,v.z);
        normal.transformVector(v.set(n[i],n[i+1],n[i+2]),v).normalize(); g.n.push(v.x,v.y,v.z);
        g.c.push(m.diffuse.r,m.diffuse.g,m.diffuse.b,m.gloss);
      }
      g.i.push(...indices.map(i => i + offset));
    }
  });
  // GLB render components retain hierarchy listeners: disabling is safe before parenting.
  for (const e of components) e.render!.enabled = false;
  for (const [key,g] of groups) {
    const mesh = new pc.Mesh(app.graphicsDevice); mesh.setPositions(g.p); mesh.setNormals(g.n); mesh.setColors(g.c); mesh.setIndices(g.i); mesh.update(pc.PRIMITIVE_TRIANGLES);
    g.material.diffuse.set(1,1,1); g.material.diffuseVertexColor = true; g.material.emissiveVertexColor = true; g.material.gloss = 1; g.material.glossVertexColor = true; g.material.glossVertexColorChannel = 'a'; g.material.update();
    const e = new pc.Entity(`racket-surface-${key}`); root.addChild(e);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh,g.material,e)] });
  }
}
