/** In-memory, bounded hand-off from a guide balloon to a system surface. */
export class GuideWait {
  private clock = 0;
  private due = new Map<string, number>();
  private pending = new Map<string, () => void>();

  ready(key: string, active: boolean): boolean {
    if (!active) { this.due.delete(key); return true; }
    if (!this.due.has(key)) this.due.set(key, this.clock);
    return this.clock - this.due.get(key)! >= 20;
  }

  run(key: string, active: boolean, action: () => void): void {
    if (this.ready(key, active)) {
      this.pending.delete(key);
      this.due.delete(key);
      action();
    } else this.pending.set(key, action);
  }

  tick(dt: number, active: boolean): void {
    this.clock += dt;
    if (!active) this.due.clear();
    for (const [key, action] of this.pending) {
      if (this.ready(key, active)) { this.pending.delete(key); this.due.delete(key); action(); }
    }
  }

  cancel(key: string): void { this.due.delete(key); this.pending.delete(key); }

  clear(): void { this.due.clear(); this.pending.clear(); }
}
