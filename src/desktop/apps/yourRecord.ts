/**
 * ⚑ YOUR RECORD — the file inside the platform (S144, 2026-09-15).
 *
 * docs/reinterp/THE_RECORD_PLAN_2026-09-15.md §3C. The Intake Record on Room
 * 1's wall switches off at 2016 because the record has moved INTO the
 * platform — and until now nothing inside the platform showed it. This is the
 * 2016 face of the same file: GracePlatform's profile page for Vera, with the
 * imported history — every 1997 and 2003 entry the ledger holds, as the
 * platform received them, read-only, under the migration's stamp.
 *
 * A job on the board like any other (`TaskSurface`), so the walk can reach it
 * and the board grows the way it always has. It has no work in it: opening it
 * files ONE line (`record: viewed`) and completes — a profile is a page you
 * read, and reading is the act. Nothing on it is pressable but Back.
 *
 * Register: operable, cold. The platform's own type and kit. It never explains
 * what an entry means — that is the Dossier's job, in the frame.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import { entriesByEra } from '../../witness/record';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import q from '../../../data/dialog/s3_queue.json';

const R = (q as unknown as { record: {
  title: string; heading: string; sub: string;
  fields: { name: string; status: string; consent: string; work: string; imported: string };
  statusValue: string; consentAllowed: string; consentDeclined: string; workValue: string;
  importedLabel: string; importedEmpty: string; footer: string; witness: string;
} }).record;

export class YourRecordApp implements TaskSurface {
  readonly id = 'record';
  readonly windowTitle = R.title;
  readonly beats = ['open', 'viewed'] as const;
  private v = 0;
  private viewed = false;
  /** the platform's own name for her — the era's sign-in greeting names Vera */
  private readonly name = 'Vera';

  version(): number { return this.v; }
  complete(): boolean { return this.viewed; }

  /** the tile: a profile card, the imported history's count as its note */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.sysBand);
    px(ctx, x + 4, y + 4, w - 8, h - 8, ERA3.white);
    // the avatar well and two lines of a profile
    px(ctx, x + 10, y + 10, 22, 22, ERA3.glassEdge);
    setFont(ctx, 10); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(this.name, x + 38, y + 11);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText(R.statusValue, x + 38, y + 23);
    const n = this.imported().length;
    if (h >= 50) {
      ctx.fillStyle = this.viewed ? ERA3.grey : ERA3.accent;
      ctx.fillText(R.importedLabel.replace('{n}', String(n)), x + 10, y + h - 16);
    }
  }

  private imported(): { witness: string; era: string }[] {
    const by = entriesByEra();
    return [...by.e1, ...by.e2].map((e) => ({ witness: e.witness, era: e.era === 'e1' ? '1997' : '2003' }));
  }

  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    void hit;   // nothing on a profile is pressable but the window's own Back
    if (!this.viewed) {
      this.viewed = true;
      ledger.era3Arrival.push({ witness: R.witness });
      this.v++;
    }
    const x = area.x, w = area.w;
    let y = area.y;
    setFont(ctx, 14); ctx.fillStyle = ERA3.ink;
    ctx.fillText(R.heading, x, y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(R.sub, x, y + 18);
    y += 36;
    // the account, as fields — the platform's flat register
    const row = (label: string, value: string, warm = false): void => {
      setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
      ctx.fillText(label.toUpperCase(), x, y);
      setFont(ctx, 11); ctx.fillStyle = warm ? ERA3.accent : ERA3.ink;
      ctx.fillText(value, x + 150, y - 1);
      px(ctx, x, y + 15, w, 1, ERA3.glassEdge);
      y += 22;
    };
    row(R.fields.name, this.name);
    row(R.fields.status, R.statusValue);
    row(R.fields.consent, ledger.lamby.some((l) => l.id === 'e3_lambient_consent' && l.outcome === 'dismissed') ? R.consentDeclined : R.consentAllowed);
    row(R.fields.work, R.workValue.replace('{n}', String(ledger.graceQueue.length)));
    // the imported history: the file, read-only, under the migration's stamp
    y += 6;
    const imp = this.imported();
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(R.fields.imported.toUpperCase(), x, y);
    ctx.fillStyle = ERA3.accent;
    ctx.fillText(imp.length ? R.importedLabel.replace('{n}', String(imp.length)) : R.importedEmpty, x + 150, y);
    y += 16;
    px(ctx, x, y, w, 1, ERA3.glassEdge);
    y += 6;
    const bottom = area.y + area.h - 30;
    const rowH = 13;
    const fit = Math.max(0, Math.floor((bottom - y) / rowH));
    const shown = imp.slice(-fit);
    setFont(ctx, 9);
    for (const e of shown) {
      ctx.fillStyle = ERA3.grey;
      ctx.fillText(e.era, x, y);
      ctx.fillStyle = ERA3.greyDk;
      ctx.save(); ctx.beginPath(); ctx.rect(x + 40, y - 2, w - 40, rowH); ctx.clip();
      ctx.fillText(e.witness, x + 40, y);
      ctx.restore();
      y += rowH;
    }
    // the footer: continuity of care, in the platform's words
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    const foot = wrapText(ctx, R.footer, w);
    foot.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, x, area.y + area.h - 22 + i * 10));
  }

  press(id: string): boolean { void id; return false; }
  debugBeat(beat: string): void { if (beat === 'viewed') this.viewed = true; this.v++; }
}
