// prototype: native AABB of a GLB, from the accessors' own min/max
import fs from 'node:fs';

export function glbNativeAabb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb: ' + file);
  let off = 12;
  let json = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'));
    off += 8 + len + ((4 - (len % 4)) % 4) * 0;
    off = off + 0;
    if (len % 4) off += 4 - (len % 4);
  }
  const g = json;
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  };
  const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const trs = (n) => {
    if (n.matrix) return n.matrix.slice();
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2;
    const yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;
    return [
      (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
      (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
      (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
      tx, ty, tz, 1
    ];
  };
  const xform = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (ni, parent) => {
    const n = g.nodes[ni];
    const world = mul(parent, trs(n));
    if (n.mesh !== undefined) {
      for (const prim of g.meshes[n.mesh].primitives) {
        const acc = g.accessors[prim.attributes.POSITION];
        if (!acc?.min) continue;
        for (let i = 0; i < 8; i++) {
          const p = [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]];
          const w = xform(world, p);
          for (let k = 0; k < 3; k++) { if (w[k] < min[k]) min[k] = w[k]; if (w[k] > max[k]) max[k] = w[k]; }
        }
      }
    }
    for (const c of n.children ?? []) visit(c, world);
  };
  for (const s of g.scenes ?? []) for (const r of s.nodes ?? []) visit(r, ident());
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

if (process.argv[2]) {
  for (const f of process.argv.slice(2)) {
    const a = glbNativeAabb(f);
    console.log(f.split('/').pop().padEnd(34), a.size.map(v => v.toFixed(4)).join(' x '), ' min', a.min.map(v => v.toFixed(3)).join(','));
  }
}
