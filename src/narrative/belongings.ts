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
 * LAW: "Remind me later" works once (update.ts), so this window opens at
 * most once per playthrough. Un-keeping a kept item mid-window is always
 * allowed and is never itself filed — only the FINAL state at close is
 * (changing your mind is not flip-flopping, spec §4 rule 2).
 */
import { ledger } from '../state/ledger';
import belongingsData from '../../data/room/belongings.json';

interface EligibleItem { id: string; label: string }
interface BelongingsData {
  eligible: EligibleItem[];
  keptTemplate: string;
  processedLine: string;
}

const DATA = belongingsData as unknown as BelongingsData;

export class BelongingsSystem {
  private readonly items: EligibleItem[] = DATA.eligible;
  private readonly eligibleIds: ReadonlySet<string> = new Set(this.items.map((i) => i.id));
  private readonly _kept = new Set<string>();
  private _windowOpen = false;
  private _finalized = false;
  private processedFiled = false;

  /** the ids the click layer (app.ts) may test hits against */
  get eligible(): ReadonlySet<string> { return this.eligibleIds; }
  /** the CURRENT kept set — mutable until the window closes */
  get kept(): ReadonlySet<string> { return this._kept; }
  get windowOpen(): boolean { return this._windowOpen; }
  /** true once the window has closed and the final state has filed (once, ever) */
  get finalized(): boolean { return this._finalized; }

  isEligible(id: string): boolean { return this.eligibleIds.has(id); }
  isKept(id: string): boolean { return this._kept.has(id); }

  /** "Remind me later" pressed on the T1 notice — the window opens once. */
  openWindow(): void {
    if (this._finalized || this._windowOpen) return;
    this._windowOpen = true;
  }

  /** click an eligible prop during the window: keep it, or change your mind. */
  toggle(id: string): void {
    if (!this._windowOpen || !this.eligibleIds.has(id)) return;
    if (this._kept.has(id)) this._kept.delete(id);
    else this._kept.add(id);
  }

  /** the notice returns — the window closes and the FINAL state files, once
   *  ever: one `kept: <label>` line per kept item. Un-kept eligible items
   *  file nothing individually (silence is the record's answer, spec §4
   *  rule 3). The gathered-at-all/declined-to-gather line is filed by the
   *  guide thread itself — not duplicated here. */
  closeWindow(): void {
    if (!this._windowOpen || this._finalized) return;
    this._windowOpen = false;
    this._finalized = true;
    for (const item of this.items) {
      if (!this._kept.has(item.id)) continue;
      ledger.belongings.push({
        id: item.id,
        outcome: 'kept',
        witness: DATA.keptTemplate.replace('{label}', item.label)
      });
    }
  }

  /** Update-Now pressed with the gathering window never opened at all — the
   *  short path files only its own "processed" line (spec §4 rule 3). */
  fileProcessed(): void {
    if (this._windowOpen || this._finalized || this.processedFiled) return;
    this.processedFiled = true;
    ledger.belongings.push({ id: '_processed', outcome: 'processed', witness: DATA.processedLine });
  }
}
