/**
 * ⚑ S320 — 2026 v3, THE CONTRACT BETWEEN THE SCREENS AND THE ROOM
 * (docs/reinterp/DESIGN_2026_V3_PRESSURE_2026-11-07.md, "The beats", four acts).
 *
 * Two builders work on 2026 v3 at once: the screens (the messenger on the monitor, the browser on the laptop, the
 * bot) and the room (the restyle toward "male", the paper strips, the ticket, the ceiling map and clip, the headset
 * mirror, the stream as a birthday fundraiser, the room restored). The screens MARK a beat the moment the story
 * reaches it; the room READS beats and changes itself. Neither side imports the other.
 *
 * Memory only: the list lives on the ledger, so a wipe (exit, restart, refusal) clears it with everything else.
 * Beats are marked once and never unmarked; order is the order the player reached them.
 */
import { ledger } from '../state/ledger';

/** Every beat, in story order. Ids are stable; the room keys its changes on them. */
export const E4_BEATS = [
  'eighteen',      // Act I  — her room, hers; birthday messages (felt)
  'newyou',        //          the update: "You, restored · 2027" on both screens and the desk frame
  'mum',           //          Mum's thread opened (felt)
  'dad',           //          Dad's message read
  'link',          //          Mum's link opened; the news tabs open; strips on the wall begin
  'number',        // Act II — the clinic: "You are number 4,812"; the ticket appears
  'meridian',      //          the LGB group's refusal
  'left',          //          someone leaves the house chat
  'room',          //          the conducted turn: the room seen, barer and "male"
  'search',        // Act III — the search finishes her sentence
  'bot',           //          Second Thoughts: "I'm still here"
  'map',           //          the contagion map; the clip on the ceiling
  'junie',         // Act IV — Junie unmuted (felt)
  'original',      //          her own photo back in the desk frame
  'tryon',         //          the headset: the mirror shows the man
  'stream',        //          Junie's link: the birthday fundraiser stream
  'terminated',    //          SESSION TERMINATED; the room restored
] as const;
export type E4Beat = typeof E4_BEATS[number];

/** Strips on the wall: one per refusal / headline beat (the room may count these). */
export const REFUSAL_BEATS: readonly E4Beat[] = ['number', 'meridian', 'left'];

let version = 0;

/** Mark a beat reached. Idempotent. Returns true the first time. */
export function markE4(beat: E4Beat): boolean {
  if (ledger.e4Beats.includes(beat)) return false;
  ledger.e4Beats.push(beat);
  version++;
  return true;
}

export function e4Has(beat: E4Beat): boolean { return ledger.e4Beats.includes(beat); }

/** How far the story has got: the index of the latest beat reached, or -1. */
export function e4Progress(): number {
  let max = -1;
  for (const b of ledger.e4Beats) max = Math.max(max, E4_BEATS.indexOf(b as E4Beat));
  return max;
}

/** Bumps on every new beat, so the room can re-apply only when something changed. */
export function e4BeatsVersion(): number { return version; }
