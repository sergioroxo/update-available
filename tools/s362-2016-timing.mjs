/**
 * S362 (UiB job 13 Part C, H28) — measures, in simulated seconds, how long the 2016 phone holds each beat.
 * Usage: node tools/s362-2016-timing.mjs <port>
 * Drives the live PhoneE3 (window.__graceQueue().phone) with fixed 50 ms ticks; reads only its public state.
 */
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 3203;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0&era=3`, { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => window.__graceQueue?.());
  await new Promise(r => setTimeout(r, 3500));
  const res = await p.evaluate(() => {
    const q = window.__graceQueue();
    q.debugBeat('board');
    const ph = q.phone;
    const out = {};
    const DT = 0.05;
    // fresh phone state is shared with the room: stop the room's own ticking from interfering by driving only the phone here
    ph.atRest = true; ph.bannersHidden = false;
    // 1. Orla's quiz message → how long until another voice may speak
    ph.arrive('arrival');
    let t = 0; while (ph.voiceBusy && t < 60) { ph.atRest = true; ph.tick(DT, true); t += DT; }
    out.orlaQuizHold = +t.toFixed(2);
    // 2. Mam's message (the pastor's wife) → notes draft starts, ends, and the next voice may speak
    ph.arrive('decision');
    t = 0; let notesAt = -1, notesEnd = -1;
    while (t < 90) { ph.atRest = true; ph.tick(DT, true); t += DT; if (notesAt < 0 && ph.conductingNotes) notesAt = t; if (notesAt >= 0 && notesEnd < 0 && !ph.conductingNotes) notesEnd = t; if (notesEnd >= 0 && !ph.voiceBusy) break; }
    out.mamBannerHoldBeforeNotes = +notesAt.toFixed(2);
    out.mamNotesSeconds = +(notesEnd - notesAt).toFixed(2);
    out.mamTotalUntilNextVoice = +t.toFixed(2);
    // 3. Malta news: landing times of the five messages, and whether the article is put up by the piece
    ph.startNews();
    t = 0; const lands = []; let n = 0, articleFrom = -1, articleTo = -1;
    while (t < 90 && n < 5) {
      ph.tick(DT, true); t += DT;
      const dbg = ph.debugState();
      const nn = ph.takeoverRows().length; // rows = non-system messages landed
      if (nn > n) { n = nn; lands.push(+t.toFixed(2)); }
      if (articleFrom < 0 && ph.debugState().screen === 'article') articleFrom = t;
      if (articleFrom >= 0 && articleTo < 0 && ph.debugState().screen !== 'article') articleTo = t;
    }
    out.newsLandings = lands;
    out.articleOnGlass = articleFrom < 0 ? null : [+articleFrom.toFixed(2), +(articleTo < 0 ? t : articleTo).toFixed(2)];
    out.newsAllLandedAt = lands[lands.length - 1];
    // 4. takeover: the alert's hold before the first removal
    ph.pressControl('reply-bea');
    t = 0; let alertFrom = -1, alertTo = -1;
    while (t < 60) { ph.tick(DT, true); t += DT; if (alertFrom < 0 && ph.takeoverAlert) alertFrom = t; if (alertFrom >= 0 && alertTo < 0 && !ph.takeoverAlert) { alertTo = t; break; } }
    out.takeoverAlertSeconds = alertFrom < 0 ? null : +(alertTo - alertFrom).toFixed(2);
    out.replyToAlertStart = alertFrom < 0 ? null : +alertFrom.toFixed(2);
    // 5. Orla's last message (the photo) → how long until another voice may speak
    ph.arrive('after');
    t = 0; while (t < 60) { ph.atRest = true; ph.tick(DT, true); t += DT; if (!ph.voiceBusy && ph.delivered('after')) break; }
    out.orlaAfterHold = +t.toFixed(2);
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
} finally { await b.close(); }
