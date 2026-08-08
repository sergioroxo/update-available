/**
 * R28-4 — THE GAME MENU's open/closed state (CLAUDE.md REINTERP AMENDMENTS
 * §4; docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md §4 layer 2).
 *
 * A tiny singleton bus, deliberately with NO dependency on the DOM component
 * (src/desktop/gameMenu.ts) or either engine (src/engine/app.ts,
 * src/flat/flat.ts) — it just lets the menu's Esc/glyph toggle be read by
 * whichever engine is running so its per-frame loop can freeze cleanly,
 * without the menu needing to import engine internals or vice versa.
 *
 * THE FRAME NEVER PLAYS: this file never imports state/ledger or
 * witness/intake, and never will — opening/closing the menu is invisible to
 * the ledger and the witness record by construction, not just by convention.
 * (Restart/Leave DO wipe the ledger — the opposite of filing — but that
 * happens in src/desktop/gameMenu.ts, which imports wipeLedger directly; this
 * bus itself stays pure UI-visibility state.)
 */
export type GameMenuListener = (open: boolean) => void;

class GameMenuBus {
  private _open = false;
  private readonly listeners = new Set<GameMenuListener>();

  /**
   * Set once the real engine (3D or flat) constructs its DesktopOS instance
   * (src/engine/app.ts / src/flat/flat.ts, right after `new DesktopOS(...)`).
   * Null before that — e.g. during the pre-fiction orienting card, where
   * there is nothing yet to hand the menu's Leave button off to.
   */
  leaveEngine: (() => void) | null = null;

  /**
   * ⚑ S80 — the same idiom as `leaveEngine` directly above, for look-mode 3's
   * RECENTRE: set by the 3D engine once the camera exists, null everywhere
   * else (flat mode, the pre-fiction orienting card), and the menu simply does
   * not draw the row when it is null. It puts "forward" back where the room's
   * front is — necessary because iOS gives no reliable absolute heading, so
   * the gyro's yaw is relative to a zero and it drifts.
   *
   * Still frame voice, and still invisible to the record: recentring changes
   * where the player is looking and nothing else. (The engine keeps its own
   * view state on the ledger's `view` field, which `src/witness/` never reads.)
   */
  recentreView: (() => void) | null = null;

  get isOpen(): boolean {
    return this._open;
  }

  open(): void {
    this.set(true);
  }

  close(): void {
    this.set(false);
  }

  toggle(): void {
    this.set(!this._open);
  }

  onChange(cb: GameMenuListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private set(v: boolean): void {
    if (this._open === v) return;
    this._open = v;
    for (const l of this.listeners) l(this._open);
  }
}

export const gameMenuBus = new GameMenuBus();
