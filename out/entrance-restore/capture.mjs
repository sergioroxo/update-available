import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const folder = 'out/entrance-restore';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const evidence = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [width, height] of [[1280,720],[390,844]]) {
  console.log("capture",width,height);
  const page = await browser.newPage(); await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const noise = []; page.on('pageerror',e=>{noise.push(String(e));console.log(String(e));}); page.on('console',m=>{if(m.type()==='error'||m.type()==='warn')noise.push(m.text());});
  await page.goto('http://localhost:3206/?reinterp=1&entrance=restore&debug=1&kiosk=0', {waitUntil:'load', timeout:180000});
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', {timeout:180000});
  const shot = async name => { console.log("shot",name); await page.screenshot({ path:`${folder}/${width}x${height}-${name}.png` });
    evidence.push({width,height,name,phase:await page.$eval('#restore-entrance',e=>e.dataset.phase).catch(()=> 'story'),
      drawCalls:await page.evaluate(()=>window.__app?.stats.drawCalls.total), pose:await page.evaluate(()=>window.__camPose?.())}); };
  await wait(400); await shot('wake-streaming');
  await wait(4500); await shot('wake-title');
  await page.mouse.click(width/2,height/2); await wait(3800); await shot('mid-restore');
  await page.waitForSelector('#restore-entrance[data-phase="glitch"]', {timeout:90000}); await shot('glitch');
  await page.waitForFunction(()=>!document.getElementById('restore-entrance'),{timeout:30000}); await wait(1200); await shot('room-monitor');
  evidence.push({width,height,noise}); await page.close();
  console.log("idle reference",width);
  const idle = await browser.newPage(); await idle.setViewport({width,height,deviceScaleFactor:1});
  await idle.goto('http://localhost:3206/?reinterp=1&debug=1&home=0&kiosk=1&idlescale=1',{waitUntil:'load',timeout:180000});
  await idle.waitForFunction(()=>!!window.__attract,{timeout:30000});
  await idle.waitForSelector("#reinterp-attract", {timeout:30000});
  await idle.evaluate(()=>window.__attract.show("card"));
  await wait(4500); await idle.screenshot({path:`${folder}/${width}x${height}-idle-reference.png`}); await idle.close();
}
fs.writeFileSync(`${folder}/screenshots.json`,JSON.stringify(evidence,null,2));
await browser.close();
