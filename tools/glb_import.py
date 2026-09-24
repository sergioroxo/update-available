#!/usr/bin/env python3
"""
GLB IMPORT — measure a model, and bring it into the build geometry-only.

    python3 tools/glb_import.py bounds <file.glb> [...]          # native size, centre, base, tris, textures
    python3 tools/glb_import.py strip  <src.glb> <dst.glb>       # drop images/textures, keep geometry

⚑ WHY (S174/S175). Every model this project takes in needs the same two things: its
NATIVE bounds (the manifest's scale / cx / cz / baseY are derived from them — "measure the
mesh, not the render"; S174's phone stood half inside its dock because its origin was its
centre and nobody had measured it) and its textures GONE (the no-textures law is about what
SHIPS, S54 — the room tints every model flat to its era, so an embedded image is dead weight
and a licence surface). Bounds walk the scene's node transforms, so a model authored Z-up
with a root rotation reports the size it will actually have. `strip` re-packs the binary
chunk without the image bytes; accessors and buffer views are re-indexed. No dependencies.
"""
import json
import struct
import sys


def _read(path):
    d = open(path, 'rb').read()
    if d[:4] != b'glTF':
        raise SystemExit(f'{path}: not a binary glTF (.glb)')
    ln = struct.unpack('<I', d[12:16])[0]
    g = json.loads(d[20:20 + ln])
    off = 20 + ln
    binlen = struct.unpack('<I', d[off:off + 4])[0]
    return d, g, d[off + 8:off + 8 + binlen]


def _quat(q):
    x, y, z, w = q
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]


def _trs(n):
    if 'matrix' in n:
        m = n['matrix']
        return [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [0, 0, 0, 1]]
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    R = _quat(r)
    return [[R[i][0] * s[0], R[i][1] * s[1], R[i][2] * s[2], t[i]] for i in range(3)] + [[0, 0, 0, 1]]


def _mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def _apply(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3)]


def bounds(path):
    _, g, _ = _read(path)
    lo, hi = [1e18] * 3, [-1e18] * 3
    mats, tris = set(), [0]

    def walk(ni, parent):
        n = g['nodes'][ni]
        M = _mul(parent, _trs(n))
        if 'mesh' in n:
            for pr in g['meshes'][n['mesh']]['primitives']:
                a = g['accessors'][pr['attributes']['POSITION']]
                mn, mx = a['min'], a['max']
                for cx in (mn[0], mx[0]):
                    for cy in (mn[1], mx[1]):
                        for cz in (mn[2], mx[2]):
                            p = _apply(M, [cx, cy, cz])
                            for i in range(3):
                                lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
                if 'material' in pr:
                    mats.add(g['materials'][pr['material']].get('name', '?'))
                tris[0] += (g['accessors'][pr['indices']]['count'] if 'indices' in pr else a['count']) // 3
        for c in n.get('children', []):
            walk(c, M)

    I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    for r in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(r, I)
    size = [hi[i] - lo[i] for i in range(3)]
    c = [(hi[i] + lo[i]) / 2 for i in range(3)]
    name = path.split('/')[-1]
    print(f"{name:44s} size {size[0]:.4f} × {size[1]:.4f} × {size[2]:.4f}  centre x {c[0]:.4f} z {c[2]:.4f}"
          f"  minY {lo[1]:.4f}  tris {tris[0]}  textures {len(g.get('textures', []))}  materials {len(mats)}")


def strip(src, dst):
    d, g, BIN = _read(src)
    img_views = {im['bufferView'] for im in g.get('images', []) if 'bufferView' in im}
    for k in ('images', 'textures', 'samplers'):
        g.pop(k, None)
    for m in g.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for t in ('baseColorTexture', 'metallicRoughnessTexture'):
            pbr.pop(t, None)
        for t in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
            m.pop(t, None)
    # texture-transform extensions name textures that are gone now
    for key in ('extensionsUsed', 'extensionsRequired'):
        if key in g:
            g[key] = [e for e in g[key] if e != 'KHR_texture_transform']
            if not g[key]:
                g.pop(key)
    views = g['bufferViews']
    keep = [i for i in range(len(views)) if i not in img_views]
    remap = {old: new for new, old in enumerate(keep)}
    newbin, nv = bytearray(), []
    for old in keep:
        v = dict(views[old]); s = v.get('byteOffset', 0)
        chunk = BIN[s:s + v['byteLength']]
        while len(newbin) % 4:
            newbin.append(0)
        v['byteOffset'] = len(newbin); newbin += chunk; nv.append(v)
    while len(newbin) % 4:
        newbin.append(0)
    g['bufferViews'] = nv
    for a in g.get('accessors', []):
        if 'bufferView' in a:
            a['bufferView'] = remap[a['bufferView']]
    g['buffers'] = [{'byteLength': len(newbin)}]
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(newbin))
           + struct.pack('<II', len(js), 0x4E4F534A) + js
           + struct.pack('<II', len(newbin), 0x004E4942) + bytes(newbin))
    open(dst, 'wb').write(out)
    print(f"{dst.split('/')[-1]:24s} {len(d):8d} → {len(out):8d} bytes · images dropped: {len(img_views)}")


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('bounds', 'strip'):
        raise SystemExit(__doc__)
    if sys.argv[1] == 'bounds':
        for p in sys.argv[2:]:
            bounds(p)
    else:
        strip(sys.argv[2], sys.argv[3])
