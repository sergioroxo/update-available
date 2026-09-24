#!/usr/bin/env python3
"""
MAKE CD SPINDLE — the project's own low-poly CD spindle, written straight to a GLB.

    python3 tools/make_cd_spindle.py            # → public/assets/models/cdSpindle.glb

⚑ WHY (S175). Sérgio circled the 2003 desk's grey box-with-a-cap ("clearly a model
missing") and could not find a CD spindle anywhere; the only CD he found is CC BY-NC,
a licence class nothing else in this build carries. So we make it: project-owned, no
licence to track. Real-world metres, origin at the base's centre, base on y = 0 (so the
manifest needs no offsets). Three parts stacked — the black base, a stack of discs with
a groove between each so it reads as MANY discs, the centre post — in one mesh, one
material: the colours come from the prop's `bands` (era1room.ts bandModel colours a
model by height), the same way the rainbow duck is coloured. Flat normals per face.
"""
import json
import math
import os
import struct

SIDES = 10
parts = []   # (radius, y0, y1)
parts.append((0.064, 0.000, 0.010))           # the base
y = 0.010
for i in range(6):                             # six discs, a groove between each
    parts.append((0.060, y, y + 0.0045))
    parts.append((0.057, y + 0.0045, y + 0.0060))
    y += 0.0060
parts.append((0.0065, y, y + 0.030))           # the centre post, above the stack

pos, nrm, idx = [], [], []


def quad(a, b, c, d, n):
    base = len(pos) // 3
    for v in (a, b, c, d):
        pos.extend(v); nrm.extend(n)
    idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])


def cylinder(r, y0, y1):
    for s in range(SIDES):
        a0 = 2 * math.pi * s / SIDES
        a1 = 2 * math.pi * (s + 1) / SIDES
        am = (a0 + a1) / 2
        p0 = (r * math.cos(a0), r * math.sin(a0))
        p1 = (r * math.cos(a1), r * math.sin(a1))
        # the side, one flat face per segment
        quad((p0[0], y0, p0[1]), (p0[0], y1, p0[1]), (p1[0], y1, p1[1]), (p1[0], y0, p1[1]),
             (math.cos(am), 0.0, math.sin(am)))
        # the top and bottom caps, as fans (degenerate quads keep one code path)
        top = len(pos) // 3
        for v in ((0, y1, 0), (p1[0], y1, p1[1]), (p0[0], y1, p0[1])):
            pos.extend(v); nrm.extend((0, 1, 0))
        idx.extend([top, top + 1, top + 2])
        bot = len(pos) // 3
        for v in ((0, y0, 0), (p0[0], y0, p0[1]), (p1[0], y0, p1[1])):
            pos.extend(v); nrm.extend((0, -1, 0))
        idx.extend([bot, bot + 1, bot + 2])


for r, y0, y1 in parts:
    cylinder(r, y0, y1)

vb = struct.pack(f'<{len(pos)}f', *pos)
nb = struct.pack(f'<{len(nrm)}f', *nrm)
ib = struct.pack(f'<{len(idx)}I', *idx)
BIN = vb + nb + ib
count = len(pos) // 3
xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
g = {
    'asset': {'version': '2.0', 'generator': 'tools/make_cd_spindle.py (SurvivingSOGICE, project-owned)'},
    'scene': 0, 'scenes': [{'nodes': [0]}],
    'nodes': [{'mesh': 0, 'name': 'cdSpindle'}],
    'meshes': [{'name': 'cdSpindle', 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
    'materials': [{'name': 'cdSpindle', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.9}}],
    'buffers': [{'byteLength': len(BIN)}],
    'bufferViews': [
        {'buffer': 0, 'byteOffset': 0, 'byteLength': len(vb), 'target': 34962},
        {'buffer': 0, 'byteOffset': len(vb), 'byteLength': len(nb), 'target': 34962},
        {'buffer': 0, 'byteOffset': len(vb) + len(nb), 'byteLength': len(ib), 'target': 34963}],
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': count, 'type': 'VEC3',
         'min': [min(xs), min(ys), min(zs)], 'max': [max(xs), max(ys), max(zs)]},
        {'bufferView': 1, 'componentType': 5126, 'count': count, 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'}],
}
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4:
    js += b' '
out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(BIN))
       + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(BIN), 0x004E4942) + BIN)
dst = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models', 'cdSpindle.glb')
open(dst, 'wb').write(out)
print(f'cdSpindle.glb · {len(out)} bytes · {len(idx) // 3} tris · height {max(ys):.3f} m')
