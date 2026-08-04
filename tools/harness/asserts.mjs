import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'], defaultViewport:{width:1280,height:860}});
const page = await browser.newPage();
const all=[];
page.on('console',(m)=>all.push(`${m.type()}: ${m.text().slice(0,160)}`));
await page.goto('http://localhost:5173/?reinterp=1&era=2&debug=1&descent=0',{waitUntil:'networkidle2',timeout:60000});
await page.waitForFunction(()=>window.__app!==undefined,{timeout:30000});
await new Promise(r=>setTimeout(r,6000));
// era jumps through the panel (these call morphToEra + settleNow paths)
for (const label of ['E3 2016','E4 now','E2 2003','E1 1997']) {
  await page.evaluate((a)=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(a)); if(b)b.click();}, label);
  await new Promise(r=>setTimeout(r,3500));
}
console.log('total console messages:', all.length);
const hits=all.filter(t=>/assert|batch|invalid/i.test(t));
console.log('batch/assert messages:', hits.length);
for (const h of hits.slice(0,10)) console.log('  '+h);
console.log('--- all distinct ---');
for (const t of [...new Set(all)].slice(0,15)) console.log('  '+t);
await browser.close();
