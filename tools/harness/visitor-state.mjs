/** Shared read-only projection of visitor controls, extracted from walk.mjs. */
export const readVisitorState = (page, VIEW) => page.evaluate(({ VW, VH }) => {
    const os = window.__os;
    const app = window.__app;
    // The Era-3 queue survives in memory after its room ages. Its saver and
    // controls belong only to Era 3 (W1-B11 full-walk finding).
    const q = os.desktopEra === 'e3' && window.__graceQueue ? window.__graceQueue() : null;
    const pose = window.__camPose ? window.__camPose() : null;
    const root = app.root;
    let cam = null;
    root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const Vec3 = root.getPosition().constructor;

    // ⚑ WHY, NOT JUST WHETHER. "no controls" and "controls I cannot aim at" are
    // completely different findings — the first is a hole in the piece, the
    // second is a hole in this tool — and a log that conflates them is worth
    // nothing. Every rejection carries its reason from here on.
    let lastWhy = '';
    /**
     * ⚑ THE WORLD POINT IS KEPT EVEN WHEN THE PROJECTION FAILS (2026-09-11).
     * Until now a control that landed outside the frame was recorded as a
     * reason and nothing else — "off-screen at 1442,310" — which is a
     * description of where the CAMERA happens to be pointing, not a fact about
     * the piece. The player's answer to that sentence is to turn their head,
     * and the walker had no way to say it. Keeping the world point means every
     * rejection can also carry HOW FAR ROUND the thing is, and a turn of 20° to
     * something in your own room is then plainly different from 150° to a
     * machine in a room you left.
     */
    let lastWorld = null;
    const toPage = (wx, wy, wz) => {
      lastWorld = [wx, wy, wz];
      const p = cam.camera.worldToScreen(new Vec3(wx, wy, wz));
      if (p.z <= 0) { lastWhy = 'behind the camera'; return null; }
      if (p.x < 4 || p.y < 4 || p.x > VW - 4 || p.y > VH - 4) {
        lastWhy = 'off-screen at ' + Math.round(p.x) + ',' + Math.round(p.y);
        return null;
      }
      /**
       * ⚑ AND IS ANYTHING SITTING ON TOP OF IT? (2026-09-04, S117.) A control
       * can be in frame, correctly projected, and still unpressable because a
       * piece of FRAME CHROME is over it — the DOM takes the pointer and the
       * canvas never hears about it. That is not a hypothetical: Era 4's one
       * touch, the headset, projected to (138, 811) and the "Look with your
       * device" button occupied [14, 726]–[192, 754]. They cleared each other
       * by 57 px until the Room 3 seat moved 3° and did not, and the piece then
       * had no ending — a walk that stopped at 197 presses with every check
       * green.
       *
       * `elementFromPoint` returns the topmost HIT-TESTABLE element, so the
       * build's `pointer-events: none` hints and washes are skipped for free and
       * only chrome that would really eat the press is reported. Naming the
       * element matters more than the count: "covered by BUTTON 'Look with your
       * device'" is a fix, "unreachable" is a mystery.
       */
      const el = document.elementFromPoint(p.x, p.y);
      if (el && el.tagName !== 'CANVAS') {
        const label = (el.textContent || '').trim().slice(0, 28);
        lastWhy = 'covered by ' + el.tagName + (label ? ' "' + label + '"' : '')
          + ' at ' + Math.round(p.x) + ',' + Math.round(p.y);
        return null;
      }
      return [p.x, p.y];
    };

    /** the exact inverse of era3Devices.ts's hitPlane(), for any oriented plane */
    const onPlane = (entName, lx, ly, LW, LH) => {
      const ent = root.findByName(entName);
      lastWorld = null;   // an early exit below must not leave a stale point
      if (!ent) { lastWhy = 'no entity ' + entName; return null; }
      let n = ent;
      while (n) { if (!n.enabled) { lastWhy = entName + ' is disabled'; return null; } n = n.parent; }
      const m = ent.getWorldTransform().data;
      const u = lx / LW - 0.5;          // hitPlane: u = lx/w + 0.5
      const v = ly / LH - 0.5;          // hitPlane: v = 0.5 + lz/h  -> same sign
      return toPage(
        m[12] + u * m[0] + v * m[8],
        m[13] + u * m[1] + v * m[9],
        m[14] + u * m[2] + v * m[10]
      );
    };

    /** Room 1's monitor is axis-aligned and hardcoded in app.ts's toDesktop() */
    const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
    const onMonitor = (lx, ly, LW, LH) => toPage(
      SCREEN.x + (lx / LW - 0.5) * SCREEN.w,
      SCREEN.y - (ly / LH - 0.5) * SCREEN.h,   // toDesktop: v = 0.5 - (wy-y)/h
      SCREEN.z
    );

    const OS = { w: 512, h: 384 };
    /** ⚑ Room 3's docked monitor is widescreen — LOGICAL.monitor in era3Devices.ts */
    const MON = { w: 710, h: 384 };
    const WS = { w: 676, h: 390 };
    const PH = { w: 180, h: 360 };
/** ⚑ Era 4's laptop lid, kept in step with LOGICAL.laptop in era3Devices.ts */
const LAP = { w: 224, h: 140 };
    const RITUAL = { x: Math.round((WS.w - OS.w) / 2), y: Math.round((WS.h - OS.h) / 2) };

    /**
     * ⚑ THE SAME CANVAS, THREE DIFFERENT MESHES, AND THE ERA DECIDES WHICH.
     * `DesktopOS.canvas` is textured onto Room 1's monitor in Eras 1-2, onto
     * Room 2's workstation for Era 3's update ritual (inset by RITUAL_OFFSET,
     * exactly as era3Devices.ts composites it), and onto the visor in Era 4.
     * Trying them in a fixed order is wrong once more than one is in frame at
     * a time: from Room 3's seat the older rooms are still there, so a chain
     * that asks the monitor first aims Era 4's controls at a screen two rooms
     * away. Ask the era first, and keep the others only as a fallback.
     */
    const osPoint = (lx, ly) => {
      const monitor = () => onMonitor(lx, ly, OS.w, OS.h);
      /**
       * ⚑ ROOM 3's DOCKED MONITOR — the fourth screen, and this chain did not
       * know it existed (2026-09-11). S126 put Era 4's browser on it and
       * `19150de` made its six tabs the playable content of the era; this list
       * still read [visor, workstation, Room 1's monitor], so every tab rect was
       * aimed at the HEADSET'S FACE — where a press means `wear()`. The era's
       * opening press therefore filed `headset:worn` instead of opening a tab,
       * and four days of walks called that a browser being read.
       *
       * This is the note three comments above this one, come true a second time:
       * "do not keep a hand-written copy of the architecture… it would go stale
       * the first time somebody adds a screen." Somebody added a screen.
       */
      const desk = () => onPlane('era3-device-monitor', lx, ly, MON.w, MON.h);
      const visor = () => onPlane('era4-visor', lx, ly, OS.w, OS.h);
      const workstation = () => onPlane('era3-device-workstation',
        lx + RITUAL.x, ly + RITUAL.y, WS.w, WS.h);
      /**
       * ⚑ AND IN e4 THE ORDER FOLLOWS THE DEVICE. Off the face, the browser is
       * on the desk and the desk is what she presses; on the face, the picture
       * IS the frame and everything goes to it. Asking the visor first either
       * way is how the browser stage was skipped entirely.
       */
      const worn = !!(os.e4 && os.e4.worn);
      const order = os.desktopEra === 'e4'
        ? (worn ? [visor, desk, workstation, monitor] : [desk, visor, workstation, monitor])
        : os.desktopEra === 'e3' ? [workstation, visor, monitor]
        : [monitor, workstation, visor];
      /**
       * ⚑ AND IT REPORTS THE FIRST SURFACE'S POSITION, NOT THE LAST ONE TRIED.
       * The chain asks the era's own screen first and falls back through the
       * others, so on a miss `lastWorld` would otherwise hold Room 1's monitor
       * — two rooms behind you — and a walker turning toward it would spin away
       * from the era it is in to face a dead machine. The era's own screen is
       * the one worth turning to.
       */
      let firstWorld = null, firstWhy = '';
      for (const f of order) {
        lastWorld = null;
        const p = f();
        if (p) return p;
        if (!firstWorld && lastWorld) { firstWorld = lastWorld; firstWhy = lastWhy; }
      }
      if (firstWorld) { lastWorld = firstWorld; lastWhy = firstWhy; }
      return null;
    };

    /**
     * ⚑ HOW FAR ROUND IS IT? — the number that lets the walker turn its head.
     *
     * The piece's own camera convention is `setLocalEulerAngles(pitch, yaw, 0)`
     * on the rig, so forward is `(-sin yaw, sin pitch, -cos yaw)`; the yaw that
     * faces a world point is therefore `atan2(-dx, -dz)` and the pitch is the
     * elevation of the same vector. The pose to measure against is the SUM of
     * the authored facing and the player's own look — `__camPose` reports those
     * two separately on purpose (S85: folding a hand-drag into the curve's pose
     * would make the comfort audit report a wrist as leg velocity), and for
     * this question the sum is what the eyes are actually doing.
     *
     * `dist` comes back too, because it is how "behind me, in the room I left"
     * is told from "behind me, on this desk".
     */
    const turnTo = (w) => {
      if (!w || !pose) return null;
      const c = cam.getPosition();
      const dx = w[0] - c.x, dy = w[1] - c.y, dz = w[2] - c.z;
      const flat = Math.hypot(dx, dz);
      const R = 180 / Math.PI;
      const wantYaw = Math.atan2(-dx, -dz) * R;
      const wantPitch = Math.atan2(dy, flat) * R;
      const nowYaw = pose.yaw + (pose.lookYaw || 0);
      const nowPitch = pose.pitch + (pose.lookPitch || 0);
      return {
        yaw: Math.round((((wantYaw - nowYaw) + 540) % 360 - 180) * 10) / 10,
        pitch: Math.round((wantPitch - nowPitch) * 10) / 10,
        dist: Math.round(Math.hypot(flat, dy) * 100) / 100
      };
    };

    const targets = [];
    const dropped = [];
    // The frame's ordinary call button is a real visitor door too. Read its
    // visible bounds and press through mouse down/up, like the canvas targets.
    const call = document.getElementById('reinterp-call');
    if (call && !call.disabled) {
      const style = getComputedStyle(call), r = call.getBoundingClientRect();
      const pt = [r.x + r.width / 2, r.y + r.height / 2];
      if (style.pointerEvents !== 'none' && Number(style.opacity) > 0.5 &&
          r.width && r.height && document.elementFromPoint(...pt) === call)
        targets.push({ id: 'reinterp-call', surface: 'frame', logical: pt, pt });
    }
    const add = (id, surface, r, pt) => {
      const logical = [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];
      if (pt) targets.push({ id, surface, logical, pt });
      else dropped.push({
        id, surface, logical, why: lastWhy || 'unprojectable', turn: turnTo(lastWorld)
      });
    };

    /**
     * ⚑ FIND THE SURFACES BY LOOKING, NOT BY LISTING THEM.
     * The OS is not the only thing that owns hit rects. Every modal sub-app —
     * the provotype, the diary, IRC, the kit, Restorify, Netvision, the packet
     * — keeps its OWN `hits` array and draws into the SAME OS canvas, and while
     * one is open `os.handleClick` delegates to it wholesale, so `os.hits` is
     * legitimately empty. A walker that reads only `os.hits` sees a screen full
     * of buttons and reports "nothing to press", which is exactly what the
     * third run of this tool did in front of a dialog captioned "Begin".
     *
     * So this walks the object graph instead of naming the apps. A hardcoded
     * list of sub-apps would be a second copy of the architecture, and it would
     * go stale the first time somebody adds a screen — which is the precise
     * failure mode this whole tool exists to catch. Anything holding an array
     * of {x,y,w,h,id} is a surface, whatever it is called and whenever it was
     * added.
     */
    // ⚑ NOT EVERY SURFACE CALLS IT `hits`. IRC keeps its answers in `replyRects`,
    // and a matcher that only knew the two commonest names reported IRC as a
    // surface publishing nothing — which was wrong, and which I had already
    // told Sérgio. Match the shape of the NAME, not a list of names.
    // Declared out here because the structural silent/quiet test below uses it too.
    const RECTS_KEY = /(^|[a-z])(hits?|rects?)$/i;
    const looksLikeRects = (v) => Array.isArray(v) && v.length > 0 && v.every((r) =>
      r && typeof r === 'object' &&
      typeof r.x === 'number' && typeof r.y === 'number' &&
      typeof r.w === 'number' && typeof r.h === 'number' && typeof r.id === 'string');
    const collect = (rootObj, maxDepth) => {
      const found = [];
      const seen = new Set();
      const visit = (obj, depth, path) => {
        if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
        seen.add(obj);
        if (seen.size > 400) return;
        // a sub-app that says it is closed owns nothing on screen
        if (path && (obj.open === false || obj.visible === false)) return;
        for (const k of Object.keys(obj)) {
          let v;
          try { v = obj[k]; } catch { continue; }
          if (RECTS_KEY.test(k) && looksLikeRects(v)) {
            found.push({ path: path || 'os', rects: v });
          } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Element)) {
            visit(v, depth + 1, path ? path + '.' + k : k);
          }
        }
      };
      visit(rootObj, 0, '');
      return found;
    };

    const osGroups = collect(os, 3);
    const surfaces = osGroups.map((g) => g.path + '(' + g.rects.length + ')');
    for (const grp of osGroups)
      for (const h of grp.rects)
        add(h.id, grp.path === 'os' ? 'os' : grp.path, h, osPoint(h.x + h.w / 2, h.y + h.h / 2));
    /**
     * ⚑ TWO VERY DIFFERENT THINGS, AND I CONFLATED THEM ONCE ALREADY.
     *
     * A surface with no rects RIGHT NOW is usually just quiet: `caleb`,
     * `netvision`, `accountability` and L's voice all register their controls
     * only in the phase that offers them, so between beats they are legitimately
     * empty. That is the piece working.
     *
     * A surface with NO RECT FIELD AT ALL is the real problem: it computes its
     * button geometry inline inside `handleClick`, so the geometry exists twice
     * and nothing can check the copies agree. `kit` and `updateApp` were both
     * such surfaces until 2026-08-28, and the kit's two copies HAD drifted, by
     * 40 px. Both now register while drawing; this test stays because the next
     * such surface will not announce itself either.
     *
     * The first report from this tool called all six silent and was wrong about
     * four of them. So the test is now structural — does the object own a
     * rect-shaped field at all? — and the two states are named differently.
     */
    const silent = [];
    const quiet = [];
    for (const k of Object.keys(os)) {
      let v; try { v = os[k]; } catch { continue; }
      // ⚑ `press` as well as `handleClick`: the diary takes ANY click on the
      //   whole screen and has no coordinates and no rects at all, so a detector
      //   looking only for `handleClick` walked straight past it — and then
      //   pressed desktop icons the diary was silently swallowing.
      if (!v || typeof v !== 'object' || v.open !== true) continue;
      if (typeof v.handleClick !== 'function' && typeof v.press !== 'function') continue;
      if (osGroups.some((g) => g.path === k || g.path.indexOf(k + '.') === 0)) continue;
      /**
       * ⚑ A THIRD STATE, AND IT SWALLOWED A WHOLE ERA. IRC keeps `replyRects`,
       * so the structural test above called it healthy — but those rects carried
       * no `id`, so `looksLikeRects` refused them and nothing was collected
       * either. Not collected, and not swept because it "had a rect field": the
       * walker went blind in front of the IRC exchange and never left Era 1.
       * A populated rect field that yields nothing aimable is its own defect and
       * is treated as silent, so this gap cannot quietly eat a surface again.
       */
      const fields = Object.keys(v).filter((kk) => RECTS_KEY.test(kk) && Array.isArray(v[kk]));
      const populated = fields.filter((kk) => v[kk].length > 0);
      if (!fields.length) silent.push(k);
      else if (populated.length && !populated.some((kk) => looksLikeRects(v[kk]))) silent.push(k);
      else quiet.push(k);
    }

    if (q) {
      // the workstation's own canvas, and every sub-surface drawn into it
      for (const grp of collect(q, 3)) {
        const onPhone = grp.path === 'phone' || grp.path.indexOf('phone.') === 0;
        for (const r of grp.rects) {
          if (onPhone) {
            add(r.id, 'phone', r,
              onPlane('era3-device-phone', r.x + r.w / 2, r.y + r.h / 2, PH.w, PH.h));
          } else {
            add(r.id, grp.path === 'os' ? 'workstation' : 'workstation:' + grp.path, r,
              onPlane('era3-device-workstation', r.x + r.w / 2, r.y + r.h / 2, WS.w, WS.h));
          }
        }
      }
    }

    /**
     * ⚑ A SCREEN THAT PUBLISHES NOTHING IS ITSELF THE BUTTON, and the walker had
     * no way to press one. Era 4 now opens on Maya's laptop: a screen plane in
     * the room, drawn by the shell, with no hit rects of its own — you press the
     * machine, not a control on it. The same is true of the phone (picked up,
     * not squinted at) and of the visor. The OS canvas has the sweep for this
     * case; a plane in the room had nothing, so the walk stalled in front of a
     * laptop it could see and could not touch.
     *
     * So: any live screen plane that contributed no rects this frame is offered
     * as a press at its own centre. Discovered from the scene graph rather than
     * listed, for the same reason the rect search is.
     */
    /**
     * ⚑ THE LAPTOP PUBLISHES RECTS NOW, AND THE LAST PRESS IN THE PIECE IS ONE
     * OF THEM (S103c). The block above offers a rect-less plane as a press at
     * its own CENTRE, which is right for "you press the machine, not a control
     * on it" — and wrong the moment the machine grows a control. After Era 4's
     * hand-off the lid carries the Close's card with a single `Restart` at its
     * bottom-right, so a centre press lands on empty screen forever: measured,
     * four full runs, each stopping ~90 steps after the finale had already been
     * handed over. Same shape as the workstation's own rects, same helper.
     */
    const e4 = os && os.e4;
    const program = !!(e4 && e4.browser && e4.browser.programMode && e4.browser.programMode !== 'free');
    const b4 = e4 && e4.browser;
    const bstate = b4 ? { mode: b4.mode, step: b4.step, picker: b4.picker, live: b4.live, turnDone: [...(b4.turnDone || [])], stepDone: [...(b4.stepDone || [])], done: !!b4.programDone, pending: typeof b4.turnPending === 'function' ? b4.turnPending() : null } : null;
    const lapRects = e4 && Array.isArray(e4.laptopHits) ? e4.laptopHits : [];
    for (const r of lapRects) {
      add(r.id, 'laptop', r, onPlane('era3-device-laptop', r.x + r.w / 2, r.y + r.h / 2, LAP.w, LAP.h));
    }
    /**
     * ⚑ DANIEL'S MONITOR IN THE CLOSE (2026-09-12, Phase D). The Restart card
     * on the 1997 CRT, lit after the constellation settles: its rects are
     * published on `__closeMonitor.hits` and the glass is Room 1's own screen
     * pose (`onMonitor`). They are listed so the map shows the piece's last
     * surface as aimable — and they are FORBIDDEN to press: `close-again`
     * reloads the page and the era buttons leave the Close, and the walk's
     * job ends at `spine: done`, not at starting the piece over.
     */
    const cm = window.__closeMonitor;
    const cmRects = cm && cm.on && Array.isArray(cm.hits) ? cm.hits : [];
    // ⚑ S163 / C-02: the machine stands back in the sky at its own pose (`glass`,
    //   world centre + size), no longer on Room 1's screen; `close-go` (the far
    //   face's one press) is allowed — it only brings the eye to the card
    const g = cm && cm.glass ? cm.glass : null;
    for (const r of cmRects) {
      const pt = g
        ? toPage(g.x + (r.x + r.w / 2) / OS.w * g.w - g.w / 2, g.y - ((r.y + r.h / 2) / OS.h - 0.5) * g.h, g.z)
        : onMonitor(r.x + r.w / 2, r.y + r.h / 2, OS.w, OS.h);
      add(r.id, 'close-monitor', r, pt);
    }
    /**
     * ⚑ S177 / R4-30 — THE PANELS' SOURCES BUTTONS. Each panel's story face carries an
     * era-styled button (his D3); `__closePanels()` publishes its world point while the
     * face shows (null once the panel has turned to its dossier). Named `close-src-*`,
     * so LAST_RESORT presses each once and never laps them.
     */
    const cps = cm && cm.on && typeof window.__closePanels === 'function' ? window.__closePanels() : [];
    for (const p of cps) {
      if (!p.button || p.hidden) continue;
      const pt = toPage(p.button.x, p.button.y, p.button.z);
      if (pt) targets.push({ id: 'close-src-e' + p.era, surface: 'panel', logical: null, pt });
      else dropped.push({ id: 'close-src-e' + p.era, surface: 'panel', logical: null, why: lastWhy || 'unprojectable', turn: turnTo(lastWorld) });
    }

    const surfaced = new Set(targets.map((t) => t.surface));
    root.forEach((e) => {
      const n = e.name || '';
      if (!/^era3-device-|^era4-visor$/.test(n)) return;
      let p2 = e; let on = true;
      while (p2) { if (!p2.enabled) { on = false; break; } p2 = p2.parent; }
      if (!on) return;
      const key = n.replace('era3-device-', '');
      if (surfaced.has(key) || surfaced.has('workstation:' + key)) return;
      const c = e.getPosition();
      const pt = toPage(c.x, c.y, c.z);
      /**
       * ⚑ AND A PLANE THAT CANNOT BE AIMED AT IS NOW A FINDING, NOT A SILENCE.
       * This branch used to drop the press on the floor when the projection
       * failed, so Era 4's headset — a machine you press, with no control on it
       * — simply ceased to exist the moment it sat off-axis. That silence is
       * the whole reason the headset was pulled back to 20.6° off the seat
       * bearing instead of into the periphery Sérgio asked for: the tool could
       * not see it there, and the piece was bent to fit the tool.
       */
      if (pt) targets.push({ id: '(press) ' + key, surface: 'plane', logical: null, pt });
      else dropped.push({
        id: '(press) ' + key, surface: 'plane', logical: null,
        why: lastWhy || 'unprojectable', turn: turnTo(lastWorld)
      });
    });

    // floor markers — the only non-scripted way to change seats
    const moves = [];
    for (const id of (window.__movementNodes ? window.__movementNodes() : [])) {
      const e = root.findByName('node-' + id);
      if (!e || !e.enabled) continue;
      const c = e.getPosition();
      const pt = toPage(c.x, c.y + 0.05, c.z);
      if (pt) moves.push({ id: '(move) ' + id, surface: 'marker', logical: null, pt });
    }

    /**
     * ⚑ DID THE ROOM FOLLOW THE DESKTOP? (A-5.2, the general case.)
     * The named refusal above stops the one broken jump we know about. This is
     * the net under it, and two wrong versions of it are worth recording because
     * both looked obviously right:
     *
     *  · **"can the era's screen be aimed at?"** — the jumped run sailed past
     *    it. The three rooms are ONE SPACE THAT AGES, not three places, so from
     *    the first chair the Era-3 workstation is perfectly visible: small, dark
     *    and inert, but on screen. Visible is not seated.
     *  · **"is the camera nearer Room 1's monitor than the era's own screen?"**
     *    — same reason. The machines occupy nearly the same corner of the same
     *    room across thirty years; there is no distance to measure.
     *
     * What actually differs is the MACHINE'S OWN STATE, and the piece publishes
     * it. Era 3's workstation wakes through `beginArrival`/`settleArrival`,
     * which app.ts calls on the real e2→e3 leg and an OS-only jump never
     * reaches — so the queue sits in `dark` for ever, publishing no rects, while
     * the desktop insists it is Era 3. On the played path the queue leaves
     * `dark` within seconds of the era landing. That is the difference between
     * an era you are in and an era you were dropped beside.
     */
    let roomDesync = null;
    if (os.desktopEra === 'e3' && q && q.mode === 'dark') {
      roomDesync = 'the desktop is at e3 but the workstation queue is still `dark` — the ' +
        'machine was never woken, so it publishes nothing and no press on it can land';
    }

    /**
     * ⚑ THE SCREEN'S IDENTITY IS WHAT IS DRAWN ON IT, not the set of buttons.
     * Run 6 proved why: a provotype's "invitation" and "frame" screens carry
     * the SAME three controls at the SAME coordinates in the same phase, so a
     * signature built from control ids collapsed two different screens into
     * one — and the walker, believing it had already pressed Continue here,
     * pressed Leave instead and abandoned the app on its second page. Every
     * time. A coarse hash of the canvas itself tells them apart, which is all
     * the memory needs to stop confusing one page of a story for another.
     */
    const hashOf = (c) => {
      if (!c || !c.width) return '';
      // ⚑ 48x36, not 24x18. At the coarser size a selected profile chip — a few
      //   pixels of highlight on a 512x384 canvas — averaged away to nothing, so
      //   legitimate selections were being judged inert. Fine enough to see a
      //   chip, coarse enough to ignore a caret blinking.
      const t = document.createElement('canvas');
      t.width = 48; t.height = 36;
      const tx = t.getContext('2d');
      tx.drawImage(c, 0, 0, 48, 36);
      const d = tx.getImageData(0, 0, 48, 36).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4)
        h = Math.imul(h ^ (d[i] + d[i + 1] * 3 + d[i + 2] * 7), 16777619) >>> 0;
      return h.toString(36);
    };
    /**
     * ⚑ EVERY DEVICE SCREEN, NOT THE THREE I HAPPENED TO REMEMBER (A-5.1).
     * This hash used to name `workstation` and `phone` by hand — and Era 4
     * opens on a FOURTH, Maya's laptop, added in S97. So the era's first three
     * presses, whose entire visible effect is one line of L's arriving on that
     * lid, changed nothing this walker could see: the press was marked inert on
     * the spot, never repeated, and `laptop:read` was never filed. Two walk
     * reports concluded Era 4 had no door.
     *
     * The lesson is the one this whole tool keeps re-learning: do not keep a
     * hand-written copy of the architecture. `debugCanvases()` returns every
     * screen the room owns, keyed by name; hash all of them, in a stable order,
     * and the next surface somebody adds is hashed the day it appears.
     */
    const canvases = window.__era3Devices ? window.__era3Devices() : {};
    // ⚑ S177: and the Close's four panels — a Sources press turns a panel to its dossier
    //   on the panel atlas, which no canvas above holds; its face index is the change
    const panelFaces = typeof window.__closePanels === 'function'
      ? 'panels:' + window.__closePanels().map((p) => p.face).join(',') : '';
    const screenHash = hashOf(os.canvas) + '/' +
      Object.keys(canvases).sort().map((k) => k + ':' + hashOf(canvases[k])).join('/') + '/' + panelFaces;

    /**
     * ⚑ AND SOME OF THIS PIECE DOES NOT SPEAK IN PIXELS AT ALL (A-5.3).
     * The ball's 46 lines are a DOM caption strip (`ball.ts`'s own header says
     * so, and calls it a gap for the headset). Three and a half minutes of the
     * piece's one respite therefore move no canvas whatsoever. Read the overlay
     * text as well, so a caption arriving counts as the piece speaking.
     */
    const domText = [...document.querySelectorAll('[id^="reinterp-"]')]
      .filter((el) => el.id !== 'reinterp-game-menu' && el.id !== 'reinterp-menu-glyph')
      .map((el) => el.id + '=' + (el.textContent || '').trim().slice(0, 120))
      .join('|');

    const audio = window.__walkAudio ? window.__walkAudio() : { started: 0, playing: 0, now: '' };

    const led = window.__ledger ? window.__ledger() : null;
    const ledCount = led ? Object.keys(led).reduce(
      (n, k) => n + (Array.isArray(led[k]) ? led[k].length : 0), 0) : 0;
    /**
     * ⚑ WHAT WAS FILED, NOT MERELY HOW MANY. A count told the report that a
     * press moved the ledger; it could never say `laptop:read`, which is the
     * only thing that proves Era 4's opening actually completed. Names cost
     * nothing and they are what the map is for.
     */
    const ledList = [];
    if (led) {
      for (const k of Object.keys(led)) {
        const v = led[k];
        if (!Array.isArray(v)) continue;
        v.forEach((e, i) => ledList.push(k + ':' + (
          typeof e === 'string' ? e
            : (e && e.id ? e.id + (e.outcome ? ':' + e.outcome : '') : '#' + i))));
      }
    }

    return {
      phase: os.setup?.open ? 'setup:' + os.setup.stage : os.phase, era: os.desktopEra,
      spine: window.__spine ? window.__spine().step : null,
      endingShowing: !!window.__closeMonitor?.endingShowing,
      // A relocation owns the view through the blink between its camera curves too.
      driven: !!(pose && (pose.driven || pose.reloc)),
      qMode: q ? q.mode : null,
      ritualOpen: !!(os.updateApp && os.updateApp.visible),
      rawOsHits: (os.hits || []).length,
      screenHash, domText, audio, surfaces, silent, quiet, roomDesync, pose, program, bstate,
      targets, dropped, moves, ledCount, ledList, ledger: led,
      // S178: the phone is in her hand (app.ts carries a copy of its body while it is)
      phoneHeld: !!(window.__app && window.__app.root.findByName('w_phoneDevice-held')?.enabled)
    };
  }, { VW: VIEW.width, VH: VIEW.height });
