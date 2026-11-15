/**
 * ⚑ S392 (UiB job 26 Part B; S390 before it) — THE THREE TEACHING TAPES: what is on them, and where the visitor stopped.
 *
 * The tapes are Part A's v4 videos (S391): 1997 "Understanding Your Roots", 2016 "Heartwood", 2026 "HEDGE™". Each is ONE
 * tape in two copies on the same timeline: `room` (for the room's TV: no margin and no captions burned in — the piece draws
 * both live, src/room/teachingTv.ts) and `web` (for the era's website at the Close: the margin burned in as a lower strip
 * and the captions burned in). Their chapters, the second where Part 1 ends (`partOneEnd`), the margin's lines, the
 * captions, the sources and the break's words come from data/room/teaching_tapes.json, which tools/teaching-tapes-import.mjs
 * generates from each tape's web/ folder (the piece requests nothing at run time).
 *
 * ⚑ OPTION A (his 15 Nov: "choose option A"): once per room the piece takes the visitor to the TV and the tape plays FROM
 * ITS START — the label, the title, Part 1 and the first commercial — and stops by itself at "End of Part 1". The rest is
 * theirs, on the same TV and on the era's website. The 59 s short tape of S390 is gone (his v3 note: "The 59 version
 * doesn't make much sense because it forces you to see the ending").
 *
 * THE PLACE IS MEMORY ONLY (CLAUDE.md's no-storage law): one second per tape, for the rest of the visit. It is wiped with the
 * ledger (`ledgerGeneration`), never written anywhere, and it is not on the record: the frame never plays, so watching is
 * not filed, counted or rewarded. The TV and the era's website at the Close (src/frame/siteViewer/audio.ts) read and write
 * the same place; if the visitor stops, it stays where they stopped, and ▶ goes on from there in both. It never jumps.
 */
import data from '../../data/room/teaching_tapes.json';
import { ledgerGeneration } from '../state/ledger';

export type TapeId = '1997' | '2016' | '2026';
export type ChapterKind = 'label' | 'title' | 'lesson' | 'commercial' | 'trailer' | 'menu' | 'endcard' | 'collapse' | 'break' | 'credits';
export interface Chapter { id: string; kind: ChapterKind; title: string; start: number; end: number }
export type MarginKind = 'TAUGHT_IN' | 'WHAT_IS_KNOWN';
export interface MarginLine { start: number; end: number; kind: MarginKind; text: string; source: string }
export interface Cue { start: number; end: number; text: string }
export interface FileData { file: string; duration: number; bytes: number; width: number; height: number }
export interface BreakText { label: string[]; admission: { text: string; source: string }[]; sentences: { text: string; source: string }[] }
export interface TapeSources { line?: string; documents?: { title: string; organisation?: string | null; year?: string | number; archive?: string; pages?: string }[];
  facts?: { id?: string; text: string; source: string; url?: string }[]; music?: string; voices?: string; made?: string }
export interface TapeData {
  tape: TapeId; title: string; version: string; music: string; placeholder: boolean;
  duration: number; partOneEnd: number;
  room: FileData; web: FileData;
  chapters: Chapter[]; margin: MarginLine[]; cues: Cue[];
  /** ⚑ the tape's large in-video type — the label, the End of Part 1 card, the break — as timed text (screen_text.vtt) */
  screen?: Cue[];
  sources: TapeSources | null; break: BreakText | null;
}

export const TAPE_IDS: readonly TapeId[] = ['1997', '2016', '2026'];
export const TAPES = (data as unknown as { tapes: Record<TapeId, TapeData> }).tapes;

/** the era each tape belongs to (no 2003 tape: "it has the new you", his 14 Nov) */
export const TAPE_ERA: Record<TapeId, 'e1' | 'e3' | 'e4'> = { '1997': 'e1', '2016': 'e3', '2026': 'e4' };
export const tapeForEra = (era: string): TapeId | null => era === 'e1' ? '1997' : era === 'e3' ? '2016' : era === 'e4' ? '2026' : null;

export interface Place {
  /** the second in the tape (the room and web copies share one timeline) */
  t: number;
  /** the tape has stopped by itself at "End of Part 1" (or the conducted moment was let go of): it never stops there again */
  partOneSeen: boolean;
  /** the tape has ever been started, on the TV or at the Close */
  started: boolean;
}
let places = new Map<TapeId, Place>();
let generation = -1;
function fresh(): void { if (generation !== ledgerGeneration) { generation = ledgerGeneration; places = new Map(); } }

export function placeOf(tape: TapeId): Place {
  fresh();
  let p = places.get(tape);
  if (!p) { p = { t: 0, partOneSeen: false, started: false }; places.set(tape, p); }
  return p;
}

/** the chapter a second falls in (the last one at the very end) */
export function chapterAt(tape: TapeData, t: number): number {
  const ch = tape.chapters;
  for (let i = 0; i < ch.length; i++) if (t < ch[i].end) return i;
  return Math.max(0, ch.length - 1);
}

/** the margin line on screen at `t` (at most one; the import tool checks they never overlap) */
export function marginAt(tape: TapeData, t: number): MarginLine | null {
  for (const m of tape.margin) if (t >= m.start && t < m.end) return m;
  return null;
}
/** the caption being spoken at `t` */
export function cueAt(tape: TapeData, t: number): Cue | null {
  for (const c of tape.cues) if (t >= c.start && t < c.end) return c;
  return null;
}
/** the large type on the picture at `t` (the label, the end card, the break), if Part A gave it as text */
export function screenAt(tape: TapeData, t: number): Cue | null {
  for (const c of tape.screen ?? []) if (t >= c.start && t < c.end) return c;
  return null;
}

/** the parts after Part 1 (what ▶ plays on into): lessons, commercials, the collapse and the break */
export function partsAfterOne(tape: TapeId): Chapter[] {
  const d = TAPES[tape];
  return d.chapters.filter((c) => c.start >= d.partOneEnd - 0.01 && (c.kind === 'lesson' || c.kind === 'commercial' || c.kind === 'collapse' || c.kind === 'break'));
}

/** the tape's place, for the Close's website: where the TV left it (the same timeline) */
export function tapePlace(tape: TapeId): number { return placeOf(tape).t; }

/** the tape whose file this is (the site viewer passes its own path): its web copy or its room copy */
export function tapeOfFile(file: string): TapeId | null {
  for (const id of TAPE_IDS) if (file.endsWith(TAPES[id].web.file) || file.endsWith(TAPES[id].room.file)) return id;
  return null;
}

/** the site viewer reports the tape's second (pause, seek, end, and every few seconds while it plays) */
export function notePlace(tape: TapeId, t: number): void {
  const p = placeOf(tape);
  p.t = Math.max(0, t); p.started = true;
  if (p.t >= TAPES[tape].partOneEnd) p.partOneSeen = true;
}

export const clock = (s: number): string => { const n = Math.max(0, Math.floor(s)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
