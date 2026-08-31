/**
 * The placement packet (S1.8, register: felt) — the enrollment form that
 * simply *appears* once you reply. The decision was made for you: the parent
 * signature is already on file, the only live button is OK, and "Ask a
 * question" is dead. This is the administrative violence beat — the camp is
 * never shown; the form is the harm. Wording in data/dialog/s1_end.json.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import end from '../../../data/dialog/s1_end.json';

const DW = 396; const DH = 300;

/** same shape every other surface in the build publishes */
interface Hit { x: number; y: number; w: number; h: number; id: string }

export class PacketApp {
  open = true;
  dirty = true;
  /** fires when the player acknowledges — the only way forward */
  onAck?: () => void;

  private deadPressT = 0; // a tiny shudder when the dead button is pressed
  private hits: Hit[] = [];
  private acked = false;

  private get geom() {
    const dx = Math.round((ERA1_CANVAS.width - DW) / 2);
    const dy = 24;
    return { dx, dy };
  }

  update(dt: number): void {
    if (this.deadPressT > 0) { this.deadPressT = Math.max(0, this.deadPressT - dt); this.dirty = true; }
  }

  private fill(text: string): string {
    return text.replace('{name}', ledger.name);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { dx, dy } = this.geom;
    const jitter = this.deadPressT > 0 ? (Math.random() * 2 - 1) : 0;
    const c = ui.windowFrame(ctx, dx + jitter, dy, DW, DH, end.packet.windowTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);

    ui.setFont(ctx, 10);
    end.packet.lines.forEach((line, i) => {
      const filled = this.fill(line);
      // the signed-consent line and the title read darker; the rest is the form
      ctx.fillStyle = line.includes('already signed') ? ERA1.warnDark
        : line.startsWith('TRIEDPATH') ? ERA1.navy
        : ERA1.black;
      ctx.fillText(filled, c.x + 10, c.y + 8 + i * 14);
    });

    // buttons: the dead one first (left), the live OK on the right
    const by = c.y + c.h - 26;
    ui.button(ctx, c.x + 10, by, 110, 20, end.packet.deadButton, { disabled: true });
    ui.button(ctx, c.x + c.w - 70, by, 60, 20, end.packet.ok, {});
    // ⚑ THE DEAD BUTTON REGISTERS TOO, and deliberately. It is drawn disabled
    //   and leads nowhere, but it is not inert: pressing it shudders, which is
    //   the beat — you cannot ask. A control that answers is a control an audit
    //   should be able to see, whatever it does or refuses to do.
    this.hits = [
      { x: c.x + 10, y: by, w: 110, h: 20, id: 'dead' },
      { x: c.x + c.w - 70, y: by, w: 60, h: 20, id: 'ok' }
    ];
  }

  /**
   * ⚑ Registered where drawn (2026-08-28). This used to measure the dialog a
   * second time here — the same numbers as `draw`, with nothing checking the
   * copies agreed. They did agree; `kit.ts`'s did not, and had drifted by 40 px
   * unnoticed, because a surface publishing no rects is invisible to
   * `tools/walk.mjs` and to every check. The packet is the beat Era 1 ends on.
   */
  handleClick(x: number, y: number): void {
    if (this.acked) return;
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    // the dead button: a small shudder, then nothing — you cannot ask
    if (hit?.id === 'dead') { this.deadPressT = 0.25; this.dirty = true; return; }
    // OK — the only way out, and it is forward
    if (hit?.id === 'ok') {
      this.acked = true;
      this.open = false;
      if (!ledger.records.includes('enrollment-acknowledged')) ledger.records.push('enrollment-acknowledged');
      this.onAck?.();
    }
  }
}
