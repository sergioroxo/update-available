/** Original canvas drawings, reviewed at desktop and phone viewport sizes.
 * Run with --port explicitly: node tools/screensaver-stills.mjs --port 3210
 * Full-screen gallery captures are rendering checks; walk.mjs proves reachability. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const args = process.argv.slice(2);
const port = args[args.indexOf('--port') + 1];
if (!args.includes('--port') || !/^\d+$/.test(port)) throw new Error('Pass --port explicitly.');
const out = path.resolve('out/more-screensavers'); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const kinds = ['pipes', 'flock', 'lexicon', 'marquee', 'maze'];
const errors = [];
const results = [];
try {
  for (const [width, height] of [[1280,720], [390,844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0`, { waitUntil: 'networkidle2' });
    await page.evaluate(async () => {
      const { Screensaver } = await import('/src/desktop/apps/screensaver.ts');
      const { setFaceEra } = await import('/src/desktop/theme/fonts.ts');
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(384 * innerWidth / innerHeight); canvas.height = 384;
      Object.assign(canvas.style, { position: 'fixed', inset: '0', width:'100%', height:'100%', zIndex:'99999', imageRendering:'pixelated' });
      document.body.appendChild(canvas);
      window.reviewSaver = (kind, time, face) => {
        setFaceEra(face);
        const saver = new Screensaver(kind, 1997);
        for(let t=0;t<time;t+=0.09) saver.update(0.09);
        const ctx = canvas.getContext('2d'); saver.draw(ctx, canvas.width, canvas.height);
        return { saver, canvas, ctx };
      };
      window.reviewCanvas = canvas;
    });
    for (const kind of kinds) {
      const face = kind === 'flock' ? 'e2' : kind === 'marquee' ? 'e4' : 'e1';
      await page.evaluate(({kind,face}) => window.reviewSaver(kind, kind === 'marquee' ? 8 : kind === 'pipes' ? 35 : 8, face), {kind,face});
      const name = `${kind}-${width}x${height}.png`;
      await page.screenshot({ path: path.join(out,name) });
      results.push(name);
    }
    // Turning view + the two modern wallpaper palettes, and the 2016 typeface.
    for(const [kind,time,face] of [['maze',20,'e3'],['maze',54,'e4'],['marquee',20,'e3'],['lexicon',26,'e4']]) {
      await page.evaluate(a => window.reviewSaver(...a), [kind,time,face]);
      const name=`${kind}-${face}-${width}x${height}.png`;
      await page.screenshot({path:path.join(out,name)}); results.push(name);
    }
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    for(const kind of kinds) {
      const still=await page.evaluate(kind => {
        const {saver,canvas,ctx}=window.reviewSaver(kind,0,kind==='marquee'?'e4':'e1');
        const before=canvas.toDataURL();
        let dirty=false;for(let i=0;i<40;i++)dirty=saver.update(1)||dirty;
        saver.draw(ctx,canvas.width,canvas.height);
        return {unchanged:before===canvas.toDataURL(),dirty};
      },kind);
      if(!still.unchanged || still.dirty) throw new Error(`${kind}: reduced motion changed`);
      const name=`${kind}-reduced-${width}x${height}.png`;
      await page.screenshot({path:path.join(out,name)});results.push(name);
    }
    await page.close();
  }
  if(errors.length) throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'STILLS.json'), JSON.stringify({ screenshots:results, consoleErrors:errors, reducedMotion:'All five drawings stay unchanged after 40 update calls.' },null,2)+'\n');
  console.log(`${results.length} screenshots; reduced-motion checks pass; no page errors.`);
} finally { await browser.close(); }
