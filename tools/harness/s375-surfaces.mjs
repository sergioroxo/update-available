/**
 * S375 (UiB job 19 Part A) — the SURFACE MANIFEST for the sweep (tools/s375-photos.mjs).
 *
 * One entry per surface the sweep photographs by a REVIEW ROUTE (a debug beat or a state set on the live object). Every
 * entry is honest about that: `reached` is decided later, by tools/s375-index.mjs, against what the walk actually drew.
 * The tours (tools/tour.mjs, tour-e4.mjs) and the other stills tools photograph the states real presses reach; this
 * file covers the states they do not, plus the rooms, the held devices and the Close.
 *
 * Step grammar (in order): {jump:'beat'} os.debugJump · {q:'beat'} GraceQueue.debugBeat · {eval:'js'} run in the page ·
 * {wait:ms} · {cam:[x,y,z,pitch,yaw]} · {aim:'entityName', d:metres} look at an entity from the seat.
 * `canv` names the clean canvases to save in the browser pass: 'os' (the OS canvas) or a key of __era3Devices().
 */

export const SEAT = {
  1: [0, 1.08, 1.05, -2, 0],
  2: [0, 1.08, 1.05, -2, 0],
  3: [-4.05, 1.08, 0.70, -2, 90],
  4: [4.4, 1.16, 0.84, -10, 267]
};
export const SEAT_YAW = { 1: 0, 2: 0, 3: 90, 4: 267 };

const E = (e, id, era, what, where, steps, extra = {}) => ({ id: `e${e}-${id}`, e, era, what, where, steps, ...extra });
const J = (b, w = 2200) => [{ jump: b }, { wait: w }];
const Q = (b, w = 2200) => [{ q: b }, { wait: w }];

const U = (phaseJs) => [{ eval: `(() => { const u = window.__os.updateApp; ${phaseJs}; window.__os.dirty = true; window.__os.update(0.05); })()` }, { wait: 700 }];

export const SURFACES = [
  // ───────────────────────── 1997 ─────────────────────────
  E(1, 'off', '1997', 'The tower, machine off (the CRT dark)', "Daniel's room at the start", J('off', 1500), { canv: ['os'] }),
  E(1, 'boot', '1997', 'LambyOS boot ("made FOR you")', 'the first thing on the glass', J('boot', 3500), { canv: ['os'] }),
  E(1, 'profile', '1997', 'The profile questionnaire (icon, three chips, a goal)', 'the first screen the player answers', J('profile', 2000), { canv: ['os'] }),
  E(1, 'recap', '1997', 'The recap: the profile read back', 'after the questionnaire', J('recap', 2500), { canv: ['os'] }),
  E(1, 'desktop', '1997', 'The 1997 desktop: A:, Session, lamby_rig.exe, Getting Started card', 'the era\'s home screen', J('desktop', 2500), { canv: ['os'] }),
  E(1, 'kit', '1997', 'A:\\ opened: the Un-Walk Starter Kit wizard / First Steps', 'the era\'s spine', J('kit', 2800), { canv: ['os'] }),
  E(1, 'packet', '1997', 'The placement packet (pre-signed form)', 'the decision made for him', J('packet', 2500), { canv: ['os'] }),
  E(1, 'diary', '1997', 'DIARY.TXT: the line to a future self', 'the person\'s one felt beat', J('diary', 2800), { canv: ['os'] }),
  E(1, 'diary-glitch', '1997', 'The diary glitch: PHASE/2 95, "a new update is needed"', 'the machine failing, ending the era', J('diaryGlitch', 3500), { canv: ['os'] }),
  E(1, 'pillow', '1997', 'Provotype: the pillow exercise (Release Work)', 'a programme exercise on the glass', J('pillow', 2500), { canv: ['os'] }),
  E(1, 'intake', '1997', 'Provotype: Family Form FC-7 (the intake)', 'the intake dressed as a family-care leaflet', J('intake', 2500), { canv: ['os'] }),
  E(1, 'lamby-rig', '1997', 'lamby_rig.exe: the easter egg (found, not advertised)', 'a desktop icon nothing points at', J('lambyRig', 2800), { canv: ['os'] }),
  E(1, 'found-file', '1997', 'The renamed dossier: the found file', 'an idle desktop after the first flip', J('foundFile', 2800), { canv: ['os'] }),
  E(1, 'update-notice', '1997', 'The T1 update notice (Remind me later / Update now)', 'system notice that ends 1997', J('update2', 2500), { canv: ['os'] }),
  E(1, 'update-eula-1', '1997', 'The update terms, page 1 (EULA, scroll, one live I Agree)', 'after Update now', [...J('update2', 4200), ...U("u.phase='eula'; u.page=0; u.t=0")], { canv: ['os'] }),
  E(1, 'update-eula-2', '1997', 'The update terms, page 2', 'read on', [...J('update2', 4200), ...U("u.phase='eula'; u.page=1; u.t=0")], { canv: ['os'] }),
  E(1, 'update-install-early', '1997', 'The install: the changelog as thesis, the early lines', 'after I Agree', [...J('update2', 4200), ...U("u.beginInstall(); u.t = 3")], { canv: ['os'] }),
  E(1, 'update-install-late', '1997', 'The install: late in the changelog, glitch', 'the end of the install', [...J('update2', 4200), ...U("u.beginInstall(); u.t = u.installTotal * 0.8")], { canv: ['os'] }),
  E(1, 'update-restart', '1997', 'The restart screen after the install', 'the instant before the new era', [...J('update2', 4200), ...U("u.beginInstall(); u.phase='restart'; u.t = 1")], { canv: ['os'] }),
  E(1, 'held-handheld', '1997', 'The handheld (FIT IN, four greens) held to the eye', 'picked up from the bed, in his hand', [{ eval: `window.__heldDevices.take('e1', window.__app.root.findByName('camera'))` }, { wait: 2500 }], { canv: [], release: 'e1', restProp: 'danielHandheld' }),
  E(1, 'held-handheld-play', '1997', 'The handheld, FIT IN running', 'a few seconds into the game', [{ eval: `window.__heldDevices.take('e1', window.__app.root.findByName('camera'))` }, { wait: 9000 }], { canv: [], release: 'e1', restProp: 'danielHandheld' }),
  E(1, 'screensaver-stars', '1997', 'The 1997 screensaver: his own starfield', 'after ~2.5 minutes idle, before the kit', [...J('desktop', 1500), { eval: `const { Screensaver } = await import('/src/desktop/apps/screensaver.ts'); window.__os.saver = new Screensaver('stars').rotate('e1'); window.__os.dirty = true;` }, { wait: 3500 }], { canv: ['os'] }),
  E(1, 'screensaver-text', '1997', 'The 1997 screensaver after the kit: the programme\'s tumbling text', 'after ~2.5 minutes idle, after the kit', [...J('desktop', 1500), { eval: `const { Screensaver } = await import('/src/desktop/apps/screensaver.ts'); window.__os.saver = new Screensaver('text').rotate('e1'); window.__os.dirty = true;` }, { wait: 3500 }], { canv: ['os'] }),

  // ───────────────────────── 2003 ─────────────────────────
  E(2, 'silence', '2003', 'The era\'s true start: silence (the room in 2003, the glass dark)', 'right after the update restarts', J('e2Silence', 2500), { canv: ['os'] }),
  E(2, 'boot-post', '2003', 'The 2003 POST and installer line', 'the first seconds of the new boot', [{ jump: 'e2Boot' }, { wait: 2500 }], { canv: ['os'] }),
  E(2, 'boot-crawl', '2003', 'The boot crawl (silent), the installer', 'the second leg of the arrival', J('e2Crawl', 6000), { canv: ['os'] }),
  E(2, 'cartoon', '2003', 'The software boots: Lamby\'s cartoon over the jingle', 'the arrival\'s third beat', J('e2Cartoon', 7000), { canv: ['os'] }),
  E(2, 'cartoon-late', '2003', 'The cartoon, later: the light that shows him what is right', 'the arrival\'s third beat, further on', J('e2Cartoon', 14000), { canv: ['os'] }),
  E(2, 'splash', '2003', 'The retired CD-ROM splash (review only; retired from play S166)', 'not met by a player', J('e2Splash', 2500), { canv: ['os'], retired: true }),
  E(2, 'lamby-intro', '2003', 'Lamby introduces himself', 'after the boot', J('e2Lamby', 2500), { canv: ['os'] }),
  E(2, 'lamby-program', '2003', 'Lamby presents Restorify', 'the programme he is the face of', J('e2Program', 2500), { canv: ['os'] }),
  E(2, 'restorify', '2003', 'Restorify: the daily check-in (412 days, Purity Streak)', 'the first task', J('e2Restorify', 2800), { canv: ['os'] }),
  E(2, 'message-toast', '2003', 'Lamby notifies: a message came in', 'between the check-in and the thread', J('e2Message', 2800), { canv: ['os'] }),
  E(2, 'caleb-chat', '2003', 'The HopeRestored Messenger: Caleb\'s thread opens', 'the thread that gets a person caught', J('calebChat', 3000), { canv: ['os'] }),
  E(2, 'caleb-commit', '2003', 'The Messenger: the commit', 'the thread, further', J('calebCommit', 3000), { canv: ['os'] }),
  E(2, 'caleb-alert', '2003', 'The accountability alert', 'the apparatus sees the thread', J('calebAlert', 3000), { canv: ['os'] }),
  E(2, 'caleb-sad', '2003', 'Lamby, sad (the hold)', 'after the alert', J('calebSad', 3000), { canv: ['os'] }),
  E(2, 'caleb-caught', '2003', 'The caught screen', 'after the hold', J('calebCaught', 3000), { canv: ['os'] }),
  E(2, 'netvision-offer', '2003', 'Lamby offers the video', 'after the check-in', J('netvisionOffer', 2800), { canv: ['os'] }),
  E(2, 'netvision', '2003', 'NetVision Player: the New You infomercial', 'the era\'s video', J('netvision', 4000), { canv: ['os'] }),
  E(2, 'netvision-break', '2003', 'NetVision: the break (the song\'s first Call now)', 'the video tearing', J('netvisionBreak', 3500), { canv: ['os'] }),
  E(2, 'netvision-static', '2003', 'NetVision: static / notice', 'the video\'s end', J('netvisionStatic', 3500), { canv: ['os'] }),
  E(2, 'puremail', '2003', 'PureMail: the envelope arrives (the letter)', 'after the caught screen', J('calebMail', 3500), { canv: ['os'] }),
  E(2, 'residue', '2003', 'What is left of him, and the box that asks for it', 'the quiet after', J('calebResidue', 3500), { canv: ['os'] }),
  E(2, 'screensaver-lambs', '2003', 'The 2003 screensaver: Restorify\'s flock of lambs', 'after ~2.5 minutes idle', [...J('e2Restorify', 1500), { eval: `window.__os.restorify = null; window.__os.dirty = true; window.__os.update(0.05);` }, { wait: 800 }, { eval: `const { Screensaver } = await import('/src/desktop/apps/screensaver.ts'); window.__os.saver = new Screensaver('lambs').rotate('e2'); window.__os.dirty = true;` }, { wait: 3500 }], { canv: ['os'] }),
  E(2, 'update-notice', '2003', 'The T2 update notice (wearing 2016\'s frame)', 'the system notice that ends 2003', J('update3', 2800), { canv: ['os'] }),
  E(2, 'update-eula', '2003', 'The T2 update terms', 'after Update now', [...J('update3', 4200), ...U("u.phase='eula'; u.page=0; u.t=0")], { canv: ['os'] }),
  E(2, 'update-dispersal', '2003', 'The dispersal: Lamby comes apart (removed / RENAMED)', 'inside the install', J('u3Dispersal', 3500), { canv: ['os'] }),
  E(2, 'held-phone', '2003', 'The flip phone (CLEAR) held to the eye', 'picked up from the desk', [{ eval: `window.__heldDevices.take('e2', window.__app.root.findByName('camera'))` }, { wait: 2500 }], { canv: [], release: 'e2', restProp: 'flipPhone' }),
  E(2, 'held-phone-play', '2003', 'The flip phone, CLEAR running', 'a few seconds into the game', [{ eval: `window.__heldDevices.take('e2', window.__app.root.findByName('camera'))` }, { wait: 9000 }], { canv: [], release: 'e2', restProp: 'flipPhone' }),

  // ───────────────────────── 2016 ─────────────────────────
  ...[
    ['idle', 'The workstation idle screen (what it does while you fly in)', 'the arrival, before sign-in', 'idle'],
    ['arrival', 'Wake, boot, GracePlatform installs', 'the arrival of the workstation', 'arrival'],
    ['consent', 'Lambient asks (the initiation: allow / not now)', 'after sign-in', 'consent'],
    ['consent-allow', 'Permissions granted', 'after Allow', 'consentAllow'],
    ['consent-decline', 'Not now: and it stays anyway', 'after Not now', 'consentDecline'],
    ['board', 'The board ("Today"): the day as four tiles', 'the era\'s home screen', 'board'],
    ['list', 'Tile 1: the correction list (seven corrections)', 'the first job', 'list'],
    ['minimise', 'A job window minimised: the taskbar restores it', 'while working', 'minimise'],
    ['board-done', 'Every tile grey: the day finished', 'the board after the last job', 'boardDone'],
    ['item7', 'Item 7: route for mentorship (the hinge)', 'the correction list\'s turn', 'item7'],
    ['noa', 'Submission 2: Noa (the video and her corrections)', 'the second submission', 'noa'],
    ['noa-play', 'Noa\'s video playing (24 s)', 'the video', 'play'],
    ['noa-end', 'Noa\'s video, held on the last frame', 'the end of the video', 'playEnd'],
    ['grade-apply', 'Correction 13: APPLY the house look (the picture)', 'on Noa\'s video', 'gradeApply'],
    ['grade-skip', 'Correction 13: SKIP it (the picture un-filtered)', 'on Noa\'s video', 'gradeSkip'],
    ['malta-arrive', 'The phone: Malta arrives (notification)', 'an evening message', 'maltaArrive', 'phone'],
    ['malta-open', 'The phone: the message opened', 'Malta', 'maltaOpen', 'phone'],
    ['malta-reply', 'The phone: the reply field', 'Malta', 'reply', 'phone'],
    ['light', 'The brighten, alone (the room\'s light lifts at Malta)', 'the room\'s warm light', 'light'],
    ['tablet-thread', 'The tablet: the comment thread', 'the top post of the feed', 'thread'],
    ['tablet-pick', 'The tablet: the template picker', 'choosing a reply', 'threadPick'],
    ['tablet-reply', 'The tablet: a template deployed', 'a reply sent', 'threadReply'],
    ['tablet-route', 'The tablet: the quiet reply that ROUTES', 'the routing beat', 'threadRoute'],
    ['tablet-arrive', 'The tablet: the next authored arrival', 'a new comment', 'threadArrive'],
    ['tablet-echo', 'The tablet: the propagation (your sentence, returned)', 'the echo', 'threadEcho'],
    ['tablet-trouble', 'The tablet: the commenter no template fits', 'the unanswerable one', 'threadTrouble'],
    ['comments-open', 'Clear the comments: the flagged queue', 'the day\'s job', 'comments:open'],
    ['comments-removed', 'Comments: the first kind one removed', 'the day\'s job', 'comments:removed'],
    ['comments-march', 'Comments: the March reply, last in the queue', 'the day\'s job', 'comments:march'],
    ['comments-done', 'Comments: the queue cleared', 'the day\'s job', 'comments:done'],
    ['family-open', 'The family line: open', 'return the family calls', 'family:open'],
    ['family-quiet', 'The family line: the mother no template answers', 'return the family calls', 'family:quiet'],
    ['family-replied', 'The family line: a reply sent anyway', 'return the family calls', 'family:replied'],
    ['family-done', 'The family line: cleared', 'return the family calls', 'family:done'],
    ['podcast-open', 'The podcast: the suggested running order', 'the day\'s job', 'podcast:open'],
    ['podcast-published', 'The podcast: locked', 'the day\'s job', 'podcast:published'],
    ['story-open', 'The Story: the suggested forty seconds', 'the day\'s job', 'story:open'],
    ['story-published', 'The Story: published (system in-point)', 'the day\'s job', 'story:published'],
    ['story-other', 'The Story: published on HER sentence instead', 'the day\'s job', 'story:publishedOther'],
    ['course-open', 'The course: modules and the price', 'the day\'s job', 'course:open'],
    ['course-priced', 'The course: priced at the platform pick', 'the day\'s job', 'course:priced'],
    ['course-free', 'The course: no charge', 'the day\'s job', 'course:free'],
    ['course-published', 'The course: published', 'the day\'s job', 'course:published'],
    ['phone-lock', 'The phone lock screen: "Tuesday 6 December, 9:41"', 'her phone, quiet', 'phoneLockQuiet', 'phone'],
    ['phone-home', 'The phone home screen (the Handset Window)', 'her phone', 'phoneHome', 'phone'],
    ['phone-group', 'The phone: the group, Maiden-to-be', 'her phone', 'phoneGroup', 'phone'],
    ['phone-inbox', 'The phone: the unread backlog', 'her phone', 'phoneInbox', 'phone'],
    ['phone-blocked', 'The phone: the link blocked by Lambient', 'her phone', 'phoneBlocked', 'phone'],
    ['phone-ignored', 'The phone: IGNORE it, Lambient comes anyway', 'her phone', 'phoneIgnored', 'phone'],
    ['phone-voted', 'The phone: the law is enacted', 'her phone', 'phoneVoted', 'phone'],
    ['phone-cascade', 'The phone: THE CASCADE begins (the group forwards)', 'her phone', 'phoneCascade', 'phone'],
    ['phone-after', 'The phone: outnumbered, and the board is still there', 'her phone', 'phoneAfter', 'phone'],
    ['floppy-icon', 'FloppySheep: the home-screen icon', 'her phone', 'floppy', 'phone'],
    ['floppy-play', 'FloppySheep running', 'the phone game', 'floppyPlay', 'phone'],
    ['floppy-finale', 'FloppySheep: the finale (the song at 4:15)', 'the phone game', 'floppyFinale', 'phone'],
    ['floppy-over', 'FloppySheep: the end card (LEVEL COMPLETE)', 'the phone game', 'floppyOver', 'phone']
  ].map(([id, what, where, beat, dev]) => E(3, id, '2016', what, where, Q(beat, 2800), { canv: ['workstation', 'phone'], aim: null, fresh: true })),
  E(3, 'update-notice', '2016', 'The T3 update notice (the last update, on Vera\'s workstation)', 'the system notice that ends 2016', [{ jump: 'update4' }, { wait: 3000 }], { canv: ['workstation', 'os'], fresh: true }),

  // ───────────────────────── 2026 ─────────────────────────
  ...[
    ['standby', 'The headset waiting on its stand (standby: one touch to wear)', 'the desk, before she puts it on', 'e4Standby', 2800],
    ['browser-restore', '"Restoring your session": the browser\'s boot', 'the era\'s first surface', 'e4Browser', 4000],
    ['browser-search', 'The search she did not finish: four completions', 'the search tab', 'e4BrowserSearch', 3500],
    ['stream-invite', 'The stream: Junie\'s link, "it\'s on, come in"', 'the invite', 'e4Invite', 6000],
    ['stream-studio', 'Shepherd Live studio: the host, its screen, the conversation', 'the stream', 'e4Studio', 6000],
    ['stream-raid', 'Let them in: the raid, the host\'s frame fails to file it', 'the stream', 'e4Ball', 7000],
    ['stream-naming', 'The naming: the people tag the script, the stage is taken back', 'the stream', 'e4Naming', 7000],
    ['stream-open', 'Inside the stream: TransJesus dancing, the chat', 'the stream', 'e4BallOpen', 7000],
    ['stream-ask', '"hi maya": 41 to 42, her chips: dance / stay', 'the stream', 'e4StreamAsk', 7000],
    ['stream-intrusion', 'The system comes back for her: refused, room full', 'the stream', 'e4StreamIntrusion', 7000],
    ['stream-terminated', 'SESSION TERMINATED: the update fails, the stream goes on', 'the stream', 'e4BallAfter', 7000],
    ['ball-shots', 'After the ball: L tries to enhance it and cannot', 'the photo editor', 'e4BallShots', 7000],
    ['finale-glitch', 'Finale 1: the glitch', 'the end of the era', 'e4Glitch', 5000],
    ['finale-cyclorama', 'Finale 2: the cyclorama (the building\'s own image)', 'the end of the era', 'e4Cyclorama', 6000],
    ['finale-panels', 'Finale 3: four panels, hand-off', 'the end of the era', 'e4Panels', 6000]
  ].map(([id, what, where, beat, w]) => E(4, id, '2026', what, where, J(beat, w), { canv: ['monitor', 'os', 'laptop'] })),
  E(4, 'held-console-lit', '2026', 'The console, lit by the AI\'s offer: MATCH MADE SIMPLE in the hand', 'after the clip, picked up from beside the bed', [{ eval: `window.__consoleSession.light(); window.__heldDevices.take('e4', window.__app.root.findByName('camera'))` }, { wait: 6000 }], { canv: [], release: 'e4', restProp: 'e_console' }),
  E(4, 'held-console', '2026', 'The console (MATCH MADE SIMPLE) held to the eye', 'picked up from beside the bed', [{ eval: `window.__heldDevices.take('e4', window.__app.root.findByName('camera'))` }, { wait: 3000 }], { canv: [], release: 'e4', restProp: 'e_console' }),
];

/** the four directions and the desk, per era (browser: the seat's own position; headset: head turns from the seat) */
export const ROOM_VIEWS = [['front', 0, 0], ['left', 90, 0], ['back', 180, 0], ['right', 270, 0], ['desk', 0, -30]];
