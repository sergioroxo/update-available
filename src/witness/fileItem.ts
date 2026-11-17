/**
 * ⚑ S401 (UiB job 29 D2) — THE FILE COMES TO THE SCREEN. Sérgio, 16 Nov (B8): "make the 'your file' on the computer
 * more present of the system tracking you, that way keeping the importance of the element that the wall was bringing".
 *
 * The record used to live on the back wall (gone, D1). Now each era's desktop carries the person's file as ONE item that
 * is always in view, in that era's own software: 1997 a tray item on the taskbar, 2003 the "Your file" icon that came
 * with him, 2016 "My account · activity" on GracePlatform's taskbar, 2026 "Memory" on GraceOS's taskbar. When something
 * is filed the item changes on the screen, SILENTLY (his round 2: the sounds went with the wall): its count goes up and
 * it lights for a moment. Opening it shows that era's entries, one person's file only (S178). Reading it is optional;
 * nothing in the story waits on it.
 *
 * This is the one watcher every face uses, so the four never keep four different counts. Cheap per frame: the ledger's
 * total (`recordCount`, a sum of lengths) is compared first, and the era's own list is derived only when it moved.
 * A surface calls `tick` from its own update and redraws when it returns true (texture uploads on dirty only: a filing
 * costs two redraws, lit and unlit).
 */
import { entriesByEra, recordCount, type RecordEra } from './record';
import copy from '../../data/strings/institution.json';

/** how long the item stays lit after a filing (the old pulse's length) */
export const FILE_LIT_SECONDS = 1.6;

export interface FileItemCopy {
  title?: string; sub?: string; empty?: string; more?: string; footer?: string; label?: string; lamby: string;
}
export const FILE_ITEM = (copy as unknown as { fileItem: Record<RecordEra, FileItemCopy> }).fileItem;

/** ⚑ S401 — what each face showed, in order (memory only; the last 400): the walk reads it (window.__fileItems,
 *  ?debug=1) to show the item changing in every era. Never stored. */
export const fileHistory: { era: RecordEra; count: number; lit: boolean; at: number }[] = [];
const clock = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);
const t0 = clock();
const note = (era: RecordEra, count: number, lit: boolean): void => {
  fileHistory.push({ era, count, lit, at: Math.round((clock() - t0) / 100) / 10 });
  while (fileHistory.length > 400) fileHistory.shift();
};

export class FileWatch {
  private total = -1;
  private primed = false;
  private era: RecordEra | null = null;
  /** this person's entries, as of the last change */
  count = 0;
  private lit = 0;
  /** once per frame from the surface's own update; true when the item must be redrawn */
  tick(dt: number, era: RecordEra): boolean {
    let changed = false;
    if (era !== this.era) { this.era = era; this.total = -1; this.primed = false; this.lit = 0; changed = true; }
    const t = recordCount();
    if (t !== this.total) {
      this.total = t;
      const n = entriesByEra()[era].length;
      if (n !== this.count) {
        // a filing lights the item; the era's first look (or a Restart's wipe) only sets the count
        if (n > this.count && this.primed) this.lit = FILE_LIT_SECONDS;
        this.count = n; changed = true;
        note(era, n, this.lit > 0);
      }
      this.primed = true;
    }
    if (this.lit > 0) { this.lit -= dt; if (this.lit <= 0) { this.lit = 0; changed = true; } }
    return changed;
  }
  /** lit: the moment after a filing */
  get on(): boolean { return this.lit > 0; }
}
