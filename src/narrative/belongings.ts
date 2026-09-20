/**
 * THE BELONGINGS BEAT (R28-2c) — "Remind me later" on the T1 update notice
 * opens a gathering window (docs/REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_
 * 2026-07-10.md §4): the player may click eligible Room-1 props to KEEP them
 * before the era turns. Content (which props, their labels, the witness
 * lines) lives in data/room/belongings.json; this file is only the state
 * machine + filing, mirroring src/narrative/tapes.ts's split (content in
 * data, logic in code) and src/narrative/guide.ts's condition-registry style.
 *
 * The gathering-window PROMPT ("departure scheduled...") is a normal entry
 * in the EXISTING guide thread (data/dialog/s1_guide.json's `belongings`
 * message, reusing R28-2a's system) — its own followed/declined witness
 * lines cover "gathered at all" vs "declined to gather" (guide.ts's
 * CONDITIONS read `windowOpen`/`finalized`/`kept.size` off THIS class, so
 * that pair is not duplicated here). This class additionally files ONE line
 * per kept item (`kept: <label>`) at window-close, and the single
 * "processed" line for the Update-Now-DIRECT path (gathering never opened
 * at all) — both witness-symmetric, both PLACEHOLDER text sourced from data.
 *
 * LAW: "Remind me later" works once PER UPDATE NOTICE (update.ts), so each
 * pass's window opens at most once. Un-keeping a kept item mid-window is
 * always allowed and is never itself filed — only the FINAL state at close is
 * (changing your mind is not flip-flopping, spec §4 rule 2).
 *
 * S2R.7 (Session 58) — THE SECOND GATHERING. The beat now runs TWICE, once
 * per departure: pass 1 on the u2 notice (the teenager leaves for the
 * placement) and pass 2 on the u3 notice (the adult is migrated to the
 * platform). It is the same room and the same objects six years on, so this
 * class became pass-aware rather than being instantiated twice: the kept set
 * is CUMULATIVE (pass 1's keeps stay kept and stay frozen — src/room/
 * clusterMorph.ts freezes every kept id at its r1 fold, and r2 changes none
 * of the second pass's props, so one freeze rule serves both passes), while
 * the OFFER is per-pass — pass 2's eligible set comes from data, minus
 * anything already kept. What changes between the passes is the RECORD's
 * phrasing, not the objects: pass 2 files `retained at migration: <label>`.
 */
import { ledger } from '../state/ledger';
import belongingsData from '../../data/room/belongings.json';

interface EligibleItem { id: string; label: string }
interface PassStrings { eligible: string[]; keptTemplate: string; processedLine: string }
interface BelongingsData {
  eligible: EligibleItem[];
  keptTemplate: string;
  processedLine: string;
  secondPass: PassStrings;
}

const DATA = belongingsData as unknown as BelongingsData;

/** which departure is being gathered for: 1 = u2 (the teenager's), 2 = u3
 *  (the adult's migration). The number IS the pass, not an era key — the
 *  update notice that opened the window owns it (src/desktop/os.ts). */
export type BelongingsPass = 1 | 2;

export class BelongingsSystem {
  private readonly items: EligibleItem[] = DATA.eligible;
  private readonly eligibleIds: ReadonlySet<string> = new Set(this.items.map((i) => i.id));
  private readonly secondPassIds: ReadonlySet<string> = new Set(DATA.secondPass.eligible);
  private readonly _kept = new Set<string>();
  private _windowOpen = false;
  private _pass: BelongingsPass = 1;
  /** the highest pass whose window has closed and filed — 0 = neither yet */
  private finalizedPass = 0;
  private processedFiled = new Set<BelongingsPass>();

  /** every id the click layer (app.ts) may test hits against, and the kept-
   *  mark sync may re-assert, across BOTH passes — a pass-1 keep must keep
   *  its warm lift re-asserted after pass 2 has narrowed what is on offer. */
  get eligible(): ReadonlySet<string> { return this.eligibleIds; }
  /** S152 — the sentence line names what the look rests on */
  labelOf(id: string): string { return this.items.find((i) => i.id === id)?.label ?? id; }
  /** what THIS pass actually offers: the pass's own set minus anything
   *  already kept (an object you took is not offered to you again). */
  get offered(): ReadonlySet<string> {
    const src = this._pass === 1 ? this.eligibleIds : this.secondPassIds;
    return new Set([...src].filter((id) => !this.keptBefore.has(id)));
  }
  /** the CUMULATIVE kept set — mutable within the open window only */
  get kept(): ReadonlySet<string> { return this._kept; }
  get windowOpen(): boolean { return this._windowOpen; }
  get pass(): BelongingsPass { return this._pass; }
  /** true once the CURRENT pass's window has closed and filed */
  get finalized(): boolean { return this.finalizedPass >= this._pass; }

  /** ids kept in an EARLIER pass — frozen, not re-offerable, never re-filed */
  private keptBefore: ReadonlySet<string> = new Set();

  isEligible(id: string): boolean { return this.eligibleIds.has(id); }
  isKept(id: string): boolean { return this._kept.has(id); }

  /** "Remind me later" pressed on an update notice — that pass's window opens
   *  once. `pass` is the departure, not the era: 1 = u2, 2 = u3. */
  openWindow(pass: BelongingsPass = 1): void {
    if (this._windowOpen || this.finalizedPass >= pass) return;
    this._pass = pass;
    this.keptBefore = new Set(this._kept);
    this._windowOpen = true;
  }

  /** click an offered prop during the window: keep it, or change your mind.
   *  An item kept in an earlier pass is not offered and cannot be un-kept —
   *  that departure is over and its line is already in the record. */
  toggle(id: string): void {
    if (!this._windowOpen || !this.offered.has(id)) return;
    if (this._kept.has(id)) this._kept.delete(id);
    else this._kept.add(id);
  }

  /** the notice returns — the window closes and the FINAL state files, once
   *  per pass: one line per item kept IN THIS PASS (`kept: <label>` at u2,
   *  `retained at migration: <label>` at u3). Un-kept eligible items file
   *  nothing individually (silence is the record's answer, spec §4 rule 3).
   *  The gathered-at-all/declined-to-gather line is filed by the guide thread
   *  itself — not duplicated here. */
  closeWindow(): void {
    if (!this._windowOpen || this.finalizedPass >= this._pass) return;
    this._windowOpen = false;
    this.finalizedPass = this._pass;
    const template = this._pass === 1 ? DATA.keptTemplate : DATA.secondPass.keptTemplate;
    for (const item of this.items) {
      if (!this._kept.has(item.id) || this.keptBefore.has(item.id)) continue;
      ledger.belongings.push({
        id: item.id,
        outcome: 'kept',
        witness: template.replace('{label}', item.label)
      });
    }
  }

  /** Update-Now pressed with this pass's gathering window never opened at all
   *  — the short path files only its own "processed" line (spec §4 rule 3). */
  fileProcessed(pass: BelongingsPass = 1): void {
    if (this._windowOpen || this.finalizedPass >= pass || this.processedFiled.has(pass)) return;
    this.processedFiled.add(pass);
    ledger.belongings.push({
      id: '_processed',
      outcome: 'processed',
      witness: pass === 1 ? DATA.processedLine : DATA.secondPass.processedLine
    });
  }
}
