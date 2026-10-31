import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const out = path.resolve('out/screen-and-cues');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox']
});
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
const errors = [];
const open = async era => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:3204/?reinterp=1&debug=1&descent=0&home=0&kiosk=0${era === 1 ? '' : `&era=${era}`}`, { waitUntil: 'networkidle2' });
  if (era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Log in') && !b.disabled));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Log in')).click());
  }
  await page.waitForFunction(() => window.__os && window.__app, { timeout: 180000 });
  await page.addStyleTag({ content: '#motion-diagnostic { display: none !important; }' });
  await wait(7000);
  return page;
};
const shot = async (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });
try {
  const page = await open(1);
  await page.evaluate(() => window.__os.debugJump('kit'));
  await page.waitForFunction(() => window.__os.kit?.phase === 'wizard');
  const before = await page.evaluate(() => {
    const os = window.__os, kit = os.kit;
    const h = kit.hits.find(h => h.id === 'cancel');
    kit.handleClick(h.x + h.w / 2, h.y + h.h / 2);
    return { open: kit.open, label: kit.minimiseLabel };
  });
  assert.equal(before.open, false);
  assert.equal(before.label, 'Minimise');
  checks.push({ name: 'Kit minimises through its plainly named button', result: before });
  await wait(400);
  await shot(page, 'cue-e1-minimised');
  const restored = await page.evaluate(() => {
    const os = window.__os;
    const h = os.hits.find(h => h.id === 'taskbar-kit');
    os.handleClick(h.x + h.w / 2, h.y + h.h / 2);
    return os.kit.open;
  });
  assert.equal(restored, true);
  checks.push({ name: 'Taskbar press restores the same Kit', result: restored });
  await wait(400);
  await shot(page, 'cue-e1-restored');
  await page.evaluate(() => {
    const kit = window.__os.kit;
    kit.phase = 'setup'; kit.setupPage = 'welcome'; window.__os.dirty = true;
  });
  await wait(400);
  await shot(page, 'cue-e1-setup-back');
  const setupBack = await page.evaluate(() => {
    const kit = window.__os.kit;
    const h = kit.hits.find(h => h.id === 'setup-cancel');
    kit.handleClick(h.x + h.w / 2, h.y + h.h / 2);
    return { label: kit.setupBackLabel, open: kit.open, phase: kit.phase, panel: kit.panel };
  });
  assert.equal(setupBack.label, '< Un-Walk');
  assert.equal(setupBack.open, true);
  assert.equal(setupBack.phase, 'wizard');
  assert.equal(setupBack.panel, 'steps');
  checks.push({ name: 'Internet setup Back returns to the programme rather than minimising it', result: setupBack });

  // Review state: a placement is acknowledged and its Family Form is pending.
  await page.evaluate(() => {
    const os = window.__os;
    os.debugJump('intake');
    os.diaryAfterForm = true;
  });
  await wait(500);
  await page.evaluate(() => {
    const os = window.__os;
    const p = os.provotype;
    const h = p.hits.find(h => h.id === 'leave');
    p.handleClick(h.x + h.w / 2, h.y + h.h / 2);
  });
  await page.waitForFunction(() => window.__os.diary?.open);
  const diary = await page.evaluate(() => ({ line: window.__os.diary.arrivalLine, formOpen: !!window.__os.provotype }));
  assert.equal(diary.formOpen, false);
  assert.equal(diary.line, 'Family Form closed. Next: DIARY.TXT.');
  checks.push({ name: 'Family Form closes into the diary with an explicit handoff', result: diary });
  await wait(500);
  await shot(page, 'cue-e1-diary-from-form');
  await page.evaluate(() => {
    const os = window.__os;
    os.diary = null; os.formAvailable = true; os.formOpenedOnce = true;
    os.debugJump('packet');
  });
  await wait(500);
  await page.evaluate(() => {
    const packet = window.__os.packet;
    const n = packet.hits.find(h => h.id === 'next');   // S273: page two (the room slip), then Sign
    packet.handleClick(n.x + n.w / 2, n.y + n.h / 2); packet.draw(window.__os.ctx);
    const h = packet.hits.find(h => h.id === 'ok');
    packet.handleClick(h.x + h.w / 2, h.y + h.h / 2);
  });
  await page.waitForFunction(() => window.__os.diary?.open);
  const packetDiary = await page.evaluate(() => window.__os.diary.arrivalLine);
  assert.equal(packetDiary, 'Placement signed. Next: DIARY.TXT.');   // S272: the letter is signed
  checks.push({ name: 'Placement acknowledgement names itself even when the Family Form was closed earlier', result: packetDiary });
  await wait(400);
  await shot(page, 'cue-e1-diary-from-packet');
  // A long current-step name must still fit the OS canvas.
  await page.evaluate(() => {
    const os = window.__os;
    os.debugJump('desktop'); os.diary = null;
    os.toast = { text: 'Un-Walk: next - Before departure - DIARY.TXT. Start > Now gives directions.', t: 30 };
    os.dirty = true;
  });
  await wait(500);
  await shot(page, 'cue-e1-way-back-wrap');
  await page.keyboard.press('Escape');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Controls').click());
  await wait(800);
  await shot(page, 'cue-frame-back-to-menu');
  await page.close();

  const p3 = await open(3);
  const record = await p3.evaluate(() => {
    const q = window.__graceQueue();
    q.debugBeat('board');
    q.openTask(q.tasks().findIndex(t => q.surfaces.has(t.id) && t.id !== 'record'));
    const previous = q.openSurface;
    q.openRecordFromChip();
    const label = q.boardBackLabel();
    q.backToBoard();
    return { label, job: previous?.id, restoredSameJob: q.openSurface === previous, mode: q.mode };
  });
  assert.equal(record.label, 'Back to job');
  assert.ok(record.job);
  assert.equal(record.restoredSameJob, true);
  checks.push({ name: 'Record chip returns to the same job and names that destination', result: record });
  await p3.evaluate(() => window.__graceQueue().openRecordFromChip());
  await wait(700);
  await shot(p3, 'cue-e3-back-to-job');
  await p3.evaluate(() => {
    const q = window.__graceQueue();
    q.backToBoard(); q.backToBoard();
    const p = window.__poses().seats.r2;
    window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
    q.armMalta();
  });
  await wait(6500);
  const phoneRoom = await p3.evaluate(() => {
    const q = window.__graceQueue(), app = window.__app;
    const phone = app.root.findByName('era3-device-phone');
    const camera = app.root.findByName('camera').camera;
    const Vec3 = app.root.getPosition().constructor;
    const h = q.phone.rects.find(r => r.id === 'notification');
    const point = camera.worldToScreen(phone.getWorldTransform().transformPoint(
      new Vec3((h.x + h.w / 2) / 180 - .5, 0, (h.y + h.h / 2) / 360 - .5)));
    return { fov: camera.fov, active: q.phoneStoryActive, point: { x: point.x, y: point.y, z: point.z } };
  });
  assert.equal(phoneRoom.active, true);
  assert.ok(Math.abs(phoneRoom.fov - 42) < .2);
  assert.ok(phoneRoom.point.z > 0 && phoneRoom.point.x > 0 && phoneRoom.point.x < 1280
    && phoneRoom.point.y > 0 && phoneRoom.point.y < 720, 'Authored phone notification must be in frame');
  checks.push({ name: 'Phone story widens the browser view before its notification needs a press', result: phoneRoom });
  await shot(p3, 'cue-e3-phone-room-view');
  await p3.mouse.click(phoneRoom.point.x, phoneRoom.point.y);
  await wait(1500);
  const heldPhone = await p3.evaluate(() => ({ held: window.__graceQueue().phoneInHand,
    fov: window.__app.root.findByName('camera').camera.fov }));
  assert.equal(heldPhone.held, true);
  assert.ok(Math.abs(heldPhone.fov - 42) < .2);
  checks.push({ name: 'Raised phone retains the wider room view', result: heldPhone });
  await shot(p3, 'cue-e3-phone-held');
  await p3.close();

  const p4 = await open(4);
  await p4.evaluate(() => {
    window.__os.debugJump('e4Browser'); window.__os.e4.browser.debugJumpTo('search');
    const p = window.__poses().seats.r3;
    window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
  });
  await wait(7000);
  await shot(p4, 'cue-e4-session');
  const receiptWidth = await p4.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = 'bold 10px "Fixedsys Excelsior"';
    return ctx.measureText('Back to Library').width;
  });
  assert.ok(receiptWidth <= 80, 'Receipt return label must fit its existing 80px button');
  checks.push({ name: 'Receipt return label fits its button', result: { textWidth: receiptWidth, buttonWidth: 80 } });
  await p4.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await wait(6000);
  await p4.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Look with your device').click());
  await p4.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 90, gamma: 0 })));
  await wait(500);
  const neutral = await p4.evaluate(() => {
    const app = window.__app;
    return { state: window.__motion().state, rig: app.root.findByName('camera-rig').getLocalEulerAngles().clone(),
      head: app.root.findByName('camera').getLocalEulerAngles().clone(), fov: window.__motion().fov,
      records: window.__ledger().records.length };
  });
  assert.equal(neutral.state, 'live');
  await shot(p4, 'cue-e4-gyro-neutral');
  await p4.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 30, beta: 90, gamma: 0 })));
  await wait(300);
  const turned = await p4.evaluate(() => {
    const app = window.__app;
    return { rig: app.root.findByName('camera-rig').getLocalEulerAngles().clone(),
      head: app.root.findByName('camera').getLocalEulerAngles().clone(), records: window.__ledger().records.length };
  });
  assert.ok(Math.abs(turned.head.y - neutral.head.y) > 20);
  assert.ok(Math.abs(turned.rig.y - neutral.rig.y) < 0.1);
  assert.equal(turned.records, neutral.records);
  checks.push({ name: 'Synthetic gyro rotates the head while retaining browser desk framing and selecting nothing', result: { neutral, turned } });
  await p4.mouse.move(20, 180);
  await p4.mouse.wheel({ deltaY: 400 });
  await wait(500);
  const manualFov = await p4.evaluate(() => window.__motion().fov);
  assert.ok(manualFov > neutral.fov + 1);
  await wait(1000);
  assert.ok(Math.abs((await p4.evaluate(() => window.__motion().fov)) - manualFov) < 0.1);
  await p4.evaluate(() => window.__recentre());
  await wait(400);
  const recentredFov = await p4.evaluate(() => window.__motion().fov);
  console.log('zoom fixture', JSON.stringify({ neutralFov: neutral.fov, manualFov, recentredFov,
    pose: await p4.evaluate(() => window.__camPose()) }));
  assert.ok(recentredFov < manualFov - 1);
  checks.push({ name: 'Wheel zoom persists until Recentre restores the portrait desk FOV', result: { manualFov, recentredFov } });
  await p4.close();
  const visorPage = await open(4);
  await visorPage.evaluate(() => {
    window.__os.debugJump('e4Place');
    const p = window.__poses().seats.r3;
    window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
  });
  await wait(6500);
  const visorView = await visorPage.evaluate(() => {
    const app = window.__app, camera = app.root.findByName('camera').camera;
    const visor = app.root.findByName('era4-visor');
    const Vec3 = app.root.getPosition().constructor;
    const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([x, z]) => {
      const p = camera.worldToScreen(visor.getWorldTransform().transformPoint(new Vec3(x, 0, z)));
      return { x: p.x, y: p.y, z: p.z };
    });
    return { pinned: window.__os.e4.pinned, fov: camera.fov, corners,
      whole: corners.every(p => p.z > 0 && p.x >= 0 && p.x <= 1280 && p.y >= 0 && p.y <= 720) };
  });
  assert.equal(visorView.pinned, true);
  assert.ok(Math.abs(visorView.fov - 42) < .2);
  assert.equal(visorView.whole, true, 'Browser visor must not inherit the monitor zoom');
  checks.push({ name: 'Pinned browser visor keeps its whole surface in the wider view', result: visorView });
  await shot(visorPage, 'cue-e4-visor-room-view');
  await visorPage.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'cue-checks.json'), JSON.stringify({ checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
