/**
 * ⚑ S378 (UiB job 20 Part A) — THE RECEIPT'S LINES, in one place. Composed here from the ledger and the record and
 * printed by the machine's own page in the site viewer (src/frame/siteViewer/machine.ts). Until S378 this lived inside
 * Daniel's CRT at the Close (closeMonitor.ts `composeReceipt`); the glass no longer takes presses, so the receipt moved to
 * the computer panel's page with the rest of the card. The words and the order are unchanged (S167 / S204 / S209g):
 * every update stacked and FAILED, what it promised in its own words, what it filed and the practices it used, the search
 * typed where there was one, its person NOT CHANGED; then the hands, the one closing line (his, approved 2026-10-01) and
 * "kept by: nobody". Read off the ledger and the record; nothing here is invented.
 *
 * `measure` is the caller's own font (the receipt wraps to the paper it is printed on).
 */
import card from '../../data/strings/close_restart.json';
import browser97 from '../../data/dialog/s1_browser.json';
import browser26 from '../../data/dialog/s4_browser.json';
import { ledger } from '../state/ledger';
import { entriesByEra, practiceOf } from './record';
import { PRINTOUT } from '../desktop/theme/calendar';

export type PLine = { t: string; right?: string; col?: string; rightCol?: string; rule?: boolean };

type R = typeof card.receipt & {
  eras: { era: string; subject: string; promised: string }[]; promisedLabel: string; filedLine: string;
  usedLabel: string; notChanged: string; couldNot: string;
  handsLabel: string; hands: Record<string, string[]>; handsTotal: string;
};

/** the receipt, line by line, wrapped to `maxW` in the caller's font */
export function composeReceipt(measure: (s: string) => number, maxW: number): PLine[] {
  const R = card.receipt as R;
  const wrapTo = (text: string, lead: string, max = 2): string[] => {
    const words = text.split(' '); const out: string[] = []; let cur = lead;
    for (const w of words) {
      const next = cur.trim().length > lead.trim().length || cur !== lead ? `${cur}${cur.endsWith(' ') ? '' : ' '}${w}` : `${cur}${w}`;
      if (measure(next) > maxW && cur.trim() !== lead.trim()) { out.push(cur); cur = ' '.repeat(lead.length) + w; }
      else cur = next;
    }
    out.push(cur);
    if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, ' …'); }
    return out;
  };
  const by = entriesByEra();
  const his = ledger.records.includes('search-1997');
  const hers = by.e4.length > 0;
  const L: PLine[] = [{ t: R.title, right: R.span }, { t: '' }];
  for (const u of R.updates) {
    const e = R.eras.find((x) => x.era === u.era);
    const es = by[u.era as 'e1' | 'e2' | 'e3' | 'e4'];
    L.push({ t: u.line, right: R.failed, rightCol: PRINTOUT.failed });
    // ⚑ S209g / B26 — many hands, one file: every system the file passed through in this era
    const hands = R.hands[u.era] ?? [];
    if (hands.length) for (const l of wrapTo(hands.join(' · '), `  ${R.handsLabel} `)) L.push({ t: l, col: PRINTOUT.inkDim });
    if (e) for (const l of wrapTo(e.promised, `  ${R.promisedLabel} `)) L.push({ t: l, col: PRINTOUT.inkDim });
    L.push({ t: '  ' + R.filedLine.replace('{n}', String(es.length)).replace('{f}', String(es.filter((x) => x.flagged).length)), col: PRINTOUT.inkDim });
    const kinds: string[] = [];
    for (const x of es) if (!kinds.includes(x.kind)) kinds.push(x.kind);
    if (kinds.length) {
      const used = kinds.map((k) => (practiceOf(k)?.title ?? k).toLowerCase()).join(' · ');
      for (const l of wrapTo(used, `  ${R.usedLabel} `)) L.push({ t: l, col: PRINTOUT.inkDim });
    }
    for (const entry of es.filter((x) => x.id === 'guide-personalised')) for (const l of wrapTo(entry.witness, '  ')) L.push({ t: l, col: PRINTOUT.inkDim });
    if (u.era === 'e1' && his) for (const l of wrapTo(browser97.query, `  ${R.searchHis} `, 1)) L.push({ t: l, col: PRINTOUT.inkDim });
    if (u.era === 'e4' && hers) for (const l of wrapTo(browser26.program.chosen, `  ${R.searchHers} `, 2)) L.push({ t: l, col: PRINTOUT.inkDim });
    if (e) L.push({ t: '  ' + e.subject, right: R.notChanged });
    L.push({ t: '' });
  }
  L.push({ t: R.handsTotal.replace('{h}', String(Object.values(R.hands).reduce((n, h) => n + h.length, 0))) });
  L.push({ t: '', rule: true });
  for (const l of wrapTo(R.couldNot, '', 2)) L.push({ t: l });
  L.push({ t: R.kept });
  return L;
}
