/** Narrow, idempotent ESM patch; fail closed on any engine upgrade. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../node_modules/playcanvas/', import.meta.url);
assert.equal(JSON.parse(fs.readFileSync(new URL('package.json', root))).version, '2.19.6', 'Re-audit the XR patch before upgrading PlayCanvas');
const before = 'const baseLayer = frame.session.renderState.baseLayer;';
const after = 'const baseLayer = frame.session.__yufRoomLayer ?? frame.session.renderState.baseLayer;';
for (const build of ['playcanvas', 'playcanvas.dbg', 'playcanvas.prf']) {
  const file = new URL(`build/${build}/src/platform/graphics/webgl/webgl-xr-bridge.js`, root);
  const source = fs.readFileSync(file, 'utf8');
  const count = source.split(before).length - 1;
  if (process.argv.includes('--check')) { assert.equal(source.split(after).length - 1, 3); continue; }
  assert.ok(count === 3 || (count === 0 && source.split(after).length - 1 === 3), 'Engine bridge changed');
  if (count) fs.writeFileSync(file, source.replaceAll(before, after));
}
