/**
 * ⚑ S390 (UiB job 25 Part B) — ONE VOICE AT A TIME, ACROSS MODULES.
 *
 * CLAUDE.md R28 rule 2: side-messages, conduction, toasts and the guide wait for one another. Each era already has its own
 * gates (os.ts `guideSilence`, graceQueueLite's phone and Lambient, browser.ts's toasts); this is the one place a holder
 * that belongs to none of them — the teaching TV's conducted short tape — can ask all of them to wait, and release them
 * when it is done. Memory only; nothing is stored. A holder that never releases would silence the era, so the TV releases
 * on every exit path (the end of its moment, the era's update, a menu Leave, a wipe).
 */
let holder: string | null = null;

export function holdVoice(who: string): void { holder = who; }
export function releaseVoice(who: string): void { if (holder === who) holder = null; }
/** someone holds the floor: other voices wait (they are not dropped) */
export function voiceHeld(): boolean { return holder !== null; }
export function voiceHolder(): string | null { return holder; }

/**
 * ⚑ S390 — A FILM IS HEARD: the teaching TV's tape is playing with sound. The programmes' own music loops (the Un-Walk's
 * hymn in 1997, GracePlatform's loop in 2016) yield to it while it plays and come back when it stops, as they already
 * yield to the prayer tape and the games (one music at a time). Set every frame by app.ts from the TVs.
 */
let film = false;
export function setFilmAudible(on: boolean): void { film = on; }
export function filmAudible(): boolean { return film; }

/**
 * ⚑ S407 (UiB job 32, 97-9; his headset 20 Nov, 21:35:36: NetPilot's music should stop while he plays FIT IN) — A HELD GAME
 * IS HEARD: a handheld game is up before the eyes with its own music. 1997's programme loops (the fellowship's page in
 * NetPilot, the Family Form, Root Cause) yield to it as they yield to a film, and come back when it is put down. Set every
 * frame by app.ts from the held devices.
 */
let game = false;
export function setGameAudible(on: boolean): void { game = on; }
export function gameAudible(): boolean { return game; }

/**
 * ⚑ S390 — A VOICE IS WANTED: the teaching TV's moment is due and waiting for the floor. The 2026 room's own conducted turn
 * and the browser's pause step wait for it (Dad's link comes before the room is seen, as his messages do), so a beat that
 * happens to be timed two seconds later can never take the floor first and strand the moment (found by the first 2026 run:
 * the room's turn won the race and the moment never came).
 */
let wanted: string | null = null;
export function setVoiceWanted(who: string | null): void { wanted = who; }
export function voiceWanted(): boolean { return wanted !== null; }
