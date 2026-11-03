/** Mock tracked fingertips against the authored device layouts and real PlayCanvas transforms.
 * Starts its own Vite server; no headset, story shortcuts, or production debug hooks required. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle']
  });
  const page = await browser.newPage();
  // Serve a blank same-origin fixture; don't start the narrative application.
  await page.setRequestInterception(true);
  page.on('request', r => r.isNavigationRequest() ? r.respond({ contentType: 'text/html', body: '<canvas id="probe"></canvas>' }) : r.continue());
  await page.goto(server.resolvedUrls.local[0]);
  const module = await server.transformRequest('/src/room/heldDevice.ts');
  const pcUrl = module.code.match(/import \* as pc from "([^"]+)"/)[1];
  const result = await page.evaluate(async pcUrl => {
    const pc = await import(pcUrl);
    const { buildHeldDevice } = await import('/src/room/heldDevice.ts');
    const { DEVICE_SPECS } = await import('/src/room/handheld.ts');
    const { mountXrInput } = await import('/src/frame/xrInput.ts');
    const app = new pc.Application(document.querySelector('canvas'));
    // Mock just the XR active state; scene transforms, device logic, and game dispatch stay real.
    Object.defineProperty(app.xr, 'active', { get: () => active });
    let active = true;
    const rows = [];
    function check(ok, message) { if (!ok) throw new Error(message); }
    for (const authored of DEVICE_SPECS) {
      const root = new pc.Entity('probe-device'); app.root.addChild(root);
      root.setLocalScale(0.025, 0.025, 0.025);
      const tilt = new pc.Entity(`model-${authored.modelKey}-tilt`), face = new pc.Entity('face');
      root.addChild(tilt); tilt.addChild(face);
      const events = [];
      const game = { w: authored.screen.w, h: authored.screen.h, tick() {}, draw() {}, frameKey: () => 'idle', takeFiling: () => null,
        key: k => events.push(['key', k]), ...(authored.handGlassKeys ? {} : { tap: (x,y) => events.push(['tap',x,y]) }) };
      const spec = { ...authored, screenOn: undefined, dress: undefined, fold: undefined, available: () => true, game: () => game };
      const device = buildHeldDevice({ props: new Map([[spec.propId, { entity: root }]]) }, spec);
      const eye = new pc.Entity('eye'); app.root.addChild(eye); eye.setPosition(1, 1.4, 2); eye.setEulerAngles(0, 25, 0);
      device.tick(0, spec.era, () => true, 2); device.take(eye); device.tick(1, spec.era, () => true, 2); events.length = 0;
      const source = {}, other = {};
      const point = at => face.getWorldTransform().transformPoint(new pc.Vec3(...at));
      const glass = root.findByName(`${spec.propId}-screen`);
      const pixel = (u,v,depth=0) => {
        const p = glass.getWorldTransform().transformPoint(new pc.Vec3(u-.5, 0, v-.5));
        return p.add(glass.up.clone().mulScalar(depth));
      };
      const leave = () => device.touch(source, null);
      const once = (p, expected) => {
        leave(); const n = events.length;
        for (let i=0; i<90; i++) check(device.touch(source,p), `${spec.gameId}: contact missed`);
        check(events.length === n+1, `${spec.gameId}: repeat or missing press`);
        const e = events.at(-1); check(e[0] === expected[0] && (e[0] !== 'key' || e[1] === expected[1]), `${spec.gameId}: wrong dispatch ${e}`);
        if (e[0] === 'tap') check(Math.abs(e[1]-expected[1])<.01 && Math.abs(e[2]-expected[2])<.01, 'wrong glass pixels');
        leave(); device.touch(source,p); check(events.length === n+2, 're-touch did not rearm');
      };
      for (const b of spec.buttons ?? []) {
        once(point(b.at), ['key', b.key]);
        // Stand 17 mm above the hardware: outside the former 7–8 mm radius.
        once(point(b.at).add(face.forward.clone().mulScalar(-.017)), ['key', b.key]);
      }
      if (spec.handGlassKeys) {
        once(pixel(.25,.6), ['key','left']); once(pixel(.75,.6), ['key','right']); once(pixel(.5,.15), ['key','a']);
        leave(); device.touch(source,point(spec.buttons[0].at)); const n=events.length;
        device.touch(source,point(spec.buttons[1].at)); check(events.length===n, 'sliding repeated without leaving');
        device.touch(source,point(spec.buttons[1].at).add(face.forward.clone().mulScalar(-.03)));
        device.touch(source,point(spec.buttons[1].at)); check(events.length===n+1, 'physical withdrawal did not rearm');
      } else once(pixel(.3,.6,.009), ['tap', spec.screen.w*.3,spec.screen.h*.6]);
      leave(); check(!device.touch(source,pixel(.5,.5,.03)), 'hover selected');
      const p=pixel(.25,.6); device.touch(source,p); const n=events.length;
      device.touch(other,p); check(events.length===n+1, 'independent second hand failed');
      device.touch(source,null); device.touch(source,p); check(events.length===n+2, 'tracking recovery failed');
      // Exercise the real input loop too: a short ray can reach the glass before the tip does.
      let tip = pixel(.25,.6,.02), rayPresses = 0, menu = false;
      const normal = glass.up.clone();
      const hand = { tracking: true, joints: [], getJointById: id => ({
        getPosition: () => id === 'thumb-tip' ? tip.clone().add(normal.clone().mulScalar(.06)) : tip.clone()
      }) };
      const tracked = { hand, targetRayMode: 'tracked-pointer', handedness: 'right',
        getOrigin: () => tip.clone().add(normal.clone().mulScalar(.1)), getDirection: () => normal.clone().mulScalar(-1) };
      const input = mountXrInput(app, { menuOpen: () => menu, onSqueeze() {}, onMenuSelect() {},
        wandColor: new pc.Color(), onSelect: () => { rayPresses++; },
        onTouch: (src,p) => device.touch(src,p), onKey: k => device.key(k)
      });
      app.xr.input.fire('add', tracked);
      const before = events.length;
      input.tick(); check(events.length===before && rayPresses===0, 'early legacy poke fired');
      tip=pixel(.25,.6,.009);
      for(let i=0;i<90;i++) input.tick();
      check(events.length===before+1 && rayPresses===0, 'input loop doubled or repeated contact');
      check(input.points()[0].distance(tip)<1e-6, 'fingertip point changed');
      hand.tracking=false; input.tick(); hand.tracking=true; input.tick();
      check(events.length===before+2, 'input tracking recovery did not rearm');
      menu=true; input.tick(); check(events.length===before+2, 'menu allowed device contact');
      menu=false; input.tick(); check(events.length===before+3, 'menu resume did not rearm');
      const controller = { targetRayMode: 'tracked-pointer', handedness: 'left',
        getOrigin: () => new pc.Vec3(5,5,5), getDirection: () => new pc.Vec3(0,0,-1),
        gamepad: { buttons: Array.from({length:6},(_,i) => ({pressed:i===4})), axes: [0,0,-1,0] } };
      app.xr.input.fire('add',controller); const c=events.length; input.tick(); input.tick();
      check(events.length===c+2 && events.at(-2)[1]==='a' && events.at(-1)[1]==='left', 'controller edge inputs changed');
      input.destroy();
      active=false; check(!device.touch(source,p), 'browser touch changed'); active=true;
      device.release(); check(!device.touch(source,p), 'resting device touched');
      rows.push({ game: spec.gameId, buttons: spec.buttons?.length ?? 0, glass: 'one per contact', result: 'PASS' });
      root.destroy(); eye.destroy();
    }
    app.destroy(); return rows;
  }, pcUrl);
  assert.equal(result.length, 3); console.table(result);
} finally { await browser?.close(); await server.close(); }
