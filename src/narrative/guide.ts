/**
 * THE ERA-1 GUIDE THREAD (R28-2a) — the pre-Lamby conductor. Era 1 has NO
 * assistant character (CLAUDE.md R28 amendment 2): guidance is impersonal
 * system side-messages, one at a time, terse, never "I", never praise,
 * retired on compliance. Content lives in data/dialog/s1_guide.json; this
 * file is only the condition registry + the one-active-message state machine.
 *
 * WITNESS SYMMETRY (ERA_MINING R28 FIND #4, binding): every DELIVERED
 * message files BOTH ways — complied → witness.followed, ignored past its
 * beat (`expire`) → witness.declined. A message whose ask was already done
 * before it ever surfaced retires silently WITHOUT filing: the guide files
 * responses to guidance, and guidance that never appeared got no response.
 *
 * The guide is condition-driven only — no timers (click/tap law: nothing
 * here may pressure the clock). It runs only while the Era-1 desktop is up;
 * Lamby conducts from Era 2 on (that lane is R28-2d, not this file).
 *
 * R28-2c adds the `belongings` message (the T1 gathering window opened by
 * "Remind me later" — src/narrative/belongings.ts owns the kept-item state;
 * this file only resolves its trigger/done/expire against that class). Its
 * followed/declined witness lines cover "gathered at all" vs "declined to
 * gather" — the per-item `kept: <label>` lines are filed separately by
 * BelongingsSystem.closeWindow(), not through this thread.
 */
import { ledger } from '../state/ledger';
import type { DesktopOS } from '../desktop/os';
import guideData from '../../data/dialog/s1_guide.json';

export interface SideMessage {
  id: string;
  trigger: string;
  done: string;
  expire?: string;
  text: string;
  emphasis?: string;
  witness: { followed: string; declined: string };
}

type Condition = (os: DesktopOS) => boolean;

/**
 * The thin condition registry (brief: conditions in code, content in data).
 * Every key resolves against existing OS/ledger state; an unknown key is
 * simply never true, so data may safely name conditions ahead of the code
 * that makes them fire.
 */
const CONDITIONS: Record<string, Condition> = {
  desktopIdle: (os) => os.inDesktop && os.era === 'e1' && !os.kit,
  kitInserted: () => ledger.records.includes('kit-inserted'),
  kitReading: (os) => os.kit?.reading === true,
  kitAdvanced: (os) =>
    (os.kit ? os.kit.pageIndex > 0 : false) || ledger.records.includes('went-online'),
  kitPrayerPage: (os) => os.kit?.onPrayerPage === true,
  kitConnectPage: (os) => os.kit?.onConnectPage === true,
  kitConnecting: (os) => os.kit?.dialing === true || ledger.records.includes('went-online'),
  tapePlayed: () => ledger.records.includes('tape-played'),
  packetOpen: (os) => os.packet?.open === true,
  packetAcked: () => ledger.records.includes('enrollment-acknowledged'),
  diaryOpen: (os) => os.diary?.open === true,
  diaryDone: () => ledger.records.includes('diary-glitch'),
  updateArmed: (os) => os.updateArmed,
  eraShifted: (os) => os.era !== 'e1',
  // R28-2c (the belongings beat): the 'update' message's job is to preface
  // the T1 notice before the player has engaged with it at all — once they
  // do (either "Update now" straight away, which eventually shifts the era,
  // OR "Remind me later", which opens the gathering window right away), it
  // has served its purpose and hands the guide's one-active-message slot to
  // 'belongings'. Renamed from a bare `eraShifted` check so the direct
  // Update-Now path (no remind) is UNCHANGED — it still only retires when
  // the era actually shifts, exactly as verified in Session 29's playthrough.
  updateEngaged: (os) => os.era !== 'e1' || os.belongings?.windowOpen === true,
  belongingsWindowOpen: (os) => os.belongings?.windowOpen === true,
  belongingsGathered: (os) => os.belongings?.finalized === true && (os.belongings?.kept.size ?? 0) > 0,
  belongingsDeclined: (os) => os.belongings?.finalized === true && (os.belongings?.kept.size ?? 0) === 0
};

export class GuideThread {
  private readonly os: DesktopOS;
  private readonly messages: SideMessage[];
  private active: SideMessage | null = null;
  private readonly retired = new Set<string>();

  constructor(os: DesktopOS) {
    this.os = os;
    // R28 §4 layer 3 / D48 (S40): 'look' and 'interact' lead the array (they
    // teach ahead of 'floppy') but they run BEFORE the monitor ever boots —
    // this class only ever updates once os.phase === 'desktop' (see
    // src/desktop/os.ts), which is strictly after them. src/engine/app.ts
    // runs a small parallel filer for those two while the room view is still
    // up (real gaze-at-lamp + a real power-button click), then hands off to
    // this thread at 'floppy' once the desktop is live. Excluded here so this
    // class's own iteration never wastes a pass on conditions it can't see.
    this.messages = (guideData as unknown as { sideMessages: SideMessage[] })
      .sideMessages.filter((m) => m.id !== 'look' && m.id !== 'interact');
  }

  private cond(key: string | undefined): boolean {
    if (!key) return false;
    const fn = CONDITIONS[key];
    return fn ? fn(this.os) : false;
  }

  /** condition-driven only; called once per OS frame while the desktop is up */
  update(): void {
    if (this.active) {
      if (this.cond(this.active.done)) this.retire(this.active, 'followed');
      else if (this.active.expire && this.cond(this.active.expire)) {
        this.retire(this.active, 'declined');
      }
    }
    if (!this.active) {
      for (const m of this.messages) {
        if (this.retired.has(m.id)) continue;
        if (this.cond(m.done)) { this.retired.add(m.id); continue; } // never surfaced — no filing
        if (this.cond(m.trigger)) { this.active = m; break; }
      }
    }
  }

  /** compliance/ignoring files BOTH ways — the cold line comes from data */
  private retire(m: SideMessage, outcome: 'followed' | 'declined'): void {
    ledger.guidance.push({ id: m.id, outcome, witness: m.witness[outcome] });
    this.retired.add(m.id);
    this.active = null;
  }

  get activeText(): string | null {
    return this.active ? this.active.text : null;
  }

  /** the prop-emphasis key of the active message (engine lifts those props) */
  get activeEmphasis(): string | null {
    return this.active?.emphasis ?? null;
  }

  /** ?debug=1 review probe (read-only) */
  snapshot(): { active: string | null; retired: string[] } {
    return { active: this.active?.id ?? null, retired: [...this.retired] };
  }
}
