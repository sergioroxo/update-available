import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1280,height:860}});
const p=await b.newPage();
p.on('response',r=>{if(r.status()>=400)console.log(r.status(), r.url());});
await p.goto('http://localhost:5173/?reinterp=1&era=3&debug=1',{waitUntil:'networkidle2',timeout:60000});
await new Promise(r=>setTimeout(r,6000));
await b.close();
