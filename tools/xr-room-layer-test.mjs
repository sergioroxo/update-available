import assert from 'node:assert/strict';
import fs from 'node:fs';
// Execute the actual patched engine class, not a copy of its implementation.
for (const build of ['playcanvas', 'playcanvas.dbg', 'playcanvas.prf']) {
  let source = fs.readFileSync(`node_modules/playcanvas/build/${build}/src/platform/graphics/webgl/webgl-xr-bridge.js`, 'utf8');
  source = source.slice(source.indexOf('class WebglXrBridge'), source.indexOf('export {'));
  const Bridge = new Function(`const __publicField = (o,k,v) => { o[k]=v; }; ${source}; return WebglXrBridge;`)();
  const device = {}, bridge = new Bridge({ device });
  const layer = { framebuffer: {}, framebufferWidth: 200, framebufferHeight: 100, getViewport: () => ({ x: 0, y: 0, width: 100, height: 100 }) };
  const session = { renderState: { baseLayer: layer } }, frame = { session };
  for (const quad of [false, true]) {
    session.renderState.baseLayer = quad ? null : layer;
    if (quad) session.__yufRoomLayer = layer;
    bridge.beginFrame(frame); assert.equal(device.defaultFramebuffer, layer.framebuffer);
    const out = { set(x,y) { this.x=x; this.y=y; } }; bridge.getFramebufferSize(frame,out);
    assert.equal(out.x,200); assert.equal(bridge.getViewport(frame,{}).width,100);
    bridge.endFrame(); assert.equal(device.defaultFramebuffer,null);
    delete session.__yufRoomLayer;
  }
  session.renderState.baseLayer = null; bridge.beginFrame(frame); assert.equal(device.defaultFramebuffer,null);
}
console.log('XR retained room layer: default, layers-only, cleanup pass (three ESM builds)');
