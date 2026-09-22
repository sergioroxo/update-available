/**
 * R28-4 — THE GAME MENU (CLAUDE.md REINTERP AMENDMENTS §4; docs/
 * REINTERP_RESTRUCTURE_R28_2026-07-10.md §4 layer 2).
 *
 * A plain, non-diegetic DOM overlay — reinterp-only, mounted ONCE, before
 * either engine (3D or flat) even starts (see src/main.ts), so Esc and the
 * corner glyph work from the very first frame: the pre-fiction orienting
 * card, every opening beat, mid-ritual, every era. It sits OUTSIDE the
 * fiction — the desktop canvas (textured onto the monitor mesh) is the
 * fiction's UI; this is plain DOM chrome, same idiom as the existing
 * frame-voice elements (src/engine/app.ts's moveHint/tapeCaption/
 * tapeMuteBtn) — never drawn on the monitor texture.
 *
 * FRAME VOICE (CLAUDE.md "the frame never plays"): plain type, no
 * decoration, no sound, no animation beyond a simple fade. Functional and
 * undecorated — it never charms, never scores, never glitters.
 *
 * THE FRAME NEVER PLAYS, asserted in code, not just claimed: this file never
 * calls any witness-filing function, and it never appends to any of the
 * ledger's RECORD fields. Opening/closing the menu, and reading Controls or
 * Credits, are all invisible to the ledger and the witness record —
 * verified in 01_SESSION_LOG.md Session 36 by probing __ledger() before and
 * after driving every menu interaction. There are two deliberate exceptions,
 * and neither is the frame playing:
 *   · Restart/Leave WIPE the ledger via `wipeLedger()` — the opposite of
 *     filing, emptying it rather than adding to it, and exactly the
 *     in-memory-only invariant's own escape hatch (state/ledger.ts);
 *   · ⚑ S77 reads and writes ONE field, `ledger.view.unvoicedName`. The header
 *     used to say this file never imports `ledger` at all; that is now false
 *     and is corrected here rather than quietly. `view` is the ledger's
 *     documented home for the FRAME's own state — src/witness/ never reads it,
 *     nothing files from it, and it exists there only because this piece is
 *     allowed no other store at all — every browser-persistent one is
 *     forbidden outright by the hard invariants. Setting an accessibility
 *     preference is not filing, and this row never touches anything the record
 *     can see.
 *
 * ⚑ S87 — CREDITS NOW ALSO SURFACES THE E4 DOSSIER CARDS' SOURCED APPARATUS
 * (two new rows, two new views: `ballSources`/`offersSources`). This is
 * reference material — citations, confidence ratings, further reading — read
 * the same way the licensed-asset and cultural-influence rows already are; it
 * is not gameplay and files nothing, so it does not touch the "frame never
 * plays" assertion above. See the import comment below for what these two
 * files are and why only their `debrief` half is ever read here.
 */
import { ledger, wipeLedger } from '../state/ledger';
import { gameMenuBus } from '../state/gameMenuBus';
import copy from '../../data/strings/gameMenu.json';
import attributions from '../../data/strings/attributions.json';
import { entriesByEra, practiceOf, type RecordEra } from '../witness/record';
import { SOURCE_FILES } from '../witness/sources';
import mapCopy from '../../data/strings/map.json';
import closeNetwork from '../../data/strings/close_network.json';
import { DIALOG, domBevel } from './theme/chrome';
import { mountLeavePage } from '../frame/leavePage';
// ⚑ S87 — THE TWO STRANDED E4 DOSSIER CARDS. `data/provotypes/e4_ball.json`
// (6 sourced entries + the credit paragraph) and `data/provotypes/e4_offers.json`
// (4 sourced entries) were never imported anywhere — each appeared exactly once,
// inside a comment (the old `src/desktop/apps/ball.ts:49` / `offers.ts:29`).
// Both files' own `states`/`invitation`/`frame` are explicitly "a record of the
// built beat, not a vignette to play" (their own `_doc`s) — E4 has no desktop
// and no provotype surface (THE_SPACE §6), so this file only ever reads their
// `debrief` (the sourced apparatus: citations, the contested Paris Is Burning /
// bell hooks entry, the housing-precarity finding, further reading). This is
// the same surface that already renders `attributions.json`'s named ballroom
// credit (below) — the credit obligation was always met; this is what was
// stranded on top of it. `e4_ball.json`'s own `_doc` says its reading surface
// "is the Close", which does not exist yet (see BUILD_QUEUE_LIVE.md S87 §3) —
// this attaches it to a surface that exists today instead.
import e4Ball from '../../data/provotypes/e4_ball.json';
import e4Offers from '../../data/provotypes/e4_offers.json';
// ⚑ ERA 3's CARD (2026-08-24) — and it was written unreached. `check-spec`'s C9
// failed the very first run: a provotype file that exists and is never imported
// is content a player cannot reach, which is the exact fault e4_ball/e4_offers
// shipped with for two sessions. The check caught it in under a minute; the
// wiring below is what makes the card real rather than filed.
import e3Day from '../../data/provotypes/e3_theday.json';

type View = 'main' | 'controls' | 'credits' | 'ballSources' | 'offersSources' | 'daySources' | 'closeSources' | 'restartConfirm' | 'yourFile' | 'map';

interface DossierSource { status: string; confidence: string; text: string }
interface DossierCard { debrief: { body: string[]; sources: DossierSource[] } }

export interface GameMenu {
  destroy(): void;
}

/** above every other frame-chrome layer (flip button z=10, blink overlay
 *  z=8, moveHint/tapeCaption/tapeMuteBtn z=9) — the menu must win over all
 *  of them, including the pre-fiction orienting card (z=900, below this). */
const MENU_Z = 1000;
const GLYPH_Z = 999;

export function mountGameMenu(): GameMenu {
  let view: View = 'main';
  const leavePage = mountLeavePage();
  let destroyed = false;
  const canFullscreen = (): boolean =>
    document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';

  // ── the persistent pause glyph (VR/no-keyboard parity, per CLAUDE.md's
  // "input" amendment: click/tap + the movement press + Esc/pause — this is
  // the click/tap route to the same law). Bottom-LEFT: the existing flip
  // control (⟲, "turn around") already owns bottom-right. ──
  const glyph = document.createElement('button');
  glyph.id = 'reinterp-menu-glyph';
  glyph.textContent = copy.pauseGlyphSymbol;
  glyph.title = copy.pauseGlyphLabel;
  glyph.setAttribute('aria-label', copy.pauseGlyphLabel);
  // ⚑ S162 / R3-31: the glyph is a 1997 button — the same chrome as the door and the menu
  Object.assign(glyph.style, {
    position: 'fixed', left: '14px', bottom: '14px', zIndex: String(GLYPH_Z),
    width: '34px', height: '34px', borderRadius: '0',
    background: DIALOG.panel, color: DIALOG.ink,
    font: '13px monospace', fontWeight: '700', letterSpacing: '1px', cursor: 'pointer'
  } as CSSStyleDeclaration);
  domBevel(glyph);
  glyph.addEventListener('click', () => gameMenuBus.toggle());
  document.body.appendChild(glyph);

  // ── the overlay itself ──
  const root = document.createElement('div');
  root.id = 'reinterp-game-menu';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: String(MENU_Z),
    display: 'none', alignItems: 'center', justifyContent: 'center',
    background: `rgba(${DIALOG.veilRGB}, 0.82)`,
    font: DIALOG.font, color: DIALOG.ink,
    opacity: '0', transition: 'opacity 0.18s'
  } as CSSStyleDeclaration);

  // ⚑ S162 / R3-31 — THE MENU IS A 1997 DIALOG, the same chrome as the front door
  //   (orientingCard.ts; `DIALOG` in theme/chrome.ts): a title bar, a beige panel,
  //   bevelled rows. Frame voice, kept: the words are functional, nothing plays.
  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    width: 'min(440px, 92vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
    boxSizing: 'border-box', background: DIALOG.panel
  } as CSSStyleDeclaration);
  domBevel(dialog);
  const titleBar = document.createElement('div');
  Object.assign(titleBar.style, {
    background: DIALOG.titleBar, color: DIALOG.titleInk, padding: '4px 8px', margin: '2px',
    fontWeight: '700', fontSize: '12px', flex: 'none'
  } as CSSStyleDeclaration);
  dialog.appendChild(titleBar);
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    overflowY: 'auto', boxSizing: 'border-box', padding: '14px 18px 16px', flex: '1 1 auto'
  } as CSSStyleDeclaration);
  dialog.appendChild(panel);
  root.appendChild(dialog);
  document.body.appendChild(root);

  function clear(): void {
    panel.innerHTML = '';
    titleBar.textContent = copy.title;
  }

  function heading(text: string): void {
    titleBar.textContent = text;
  }

  function paragraph(text: string): void {
    const p = document.createElement('div');
    Object.assign(p.style, {
      fontSize: '12px', lineHeight: '1.55', color: DIALOG.ink, margin: '0 0 12px'
    } as CSSStyleDeclaration);
    p.textContent = text;
    panel.appendChild(p);
  }

  function row(label: string, onClick: () => void, emphasis = false): void {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
      fontWeight: emphasis ? '700' : '400', color: DIALOG.ink,
      background: DIALOG.panel, borderRadius: '0',
      padding: '8px 12px', margin: '0 0 6px', cursor: 'pointer'
    } as CSSStyleDeclaration);
    domBevel(b);
    b.addEventListener('click', onClick);
    panel.appendChild(b);
  }

  function backRow(target: View = 'main'): void {
    row(copy.back, () => { view = target; render(); });
  }

  /** ⚑ S87 — one line per source, same status/confidence/text grouping
   *  `src/desktop/apps/provotype.ts`'s canvas debrief already uses, in this
   *  file's own plain-paragraph idiom (no color coding here — frame voice is
   *  undecorated). Only `debrief` is ever read; see the import comment above
   *  for why the rest of these files' schema-shaped content is not.
   *
   *  ⚑ `confidence` is NOT appended with the word "confidence" the way
   *  `provotype.ts`'s canvas debrief does it (`"high confidence"`) — that
   *  reads fine for `e4_ball.json`'s bare labels ("high", "medium") but
   *  breaks for `e4_offers.json`'s, which are full phrases ("none — this is
   *  our extrapolation", "medium — sourced once, not yet its own pass") and
   *  would render as "…extrapolation confidence". Bracketing status and
   *  confidence together instead reads correctly for both files without
   *  editing either's already-authored copy. */
  function sourcesView(card: DossierCard, title: string): void {
    heading(title);
    for (const line of card.debrief.body) paragraph(line);
    for (const s of card.debrief.sources) {
      paragraph(`[${s.status} · ${s.confidence}] ${s.text}`);
    }
    backRow('credits');
  }

  /**
   * ⚑ S144 — YOUR FILE: the map of interaction, read in the frame. Every entry
   * the ledger holds, by era, in order; under each, the PRACTICE it belongs to
   * (data/dossier/practices.json), its dossier status, and the sourced card it
   * points at — a pointer into the provotypes' existing cards, never a new
   * claim. See docs/reinterp/THE_RECORD_PLAN_2026-09-15.md.
   */
  // S174: the practice → source table lives in witness/sources.ts (the Close's dossier reads it too)
  /**
   * ⚑ S163 / R3-111 — THE CLOSE'S PANELS, SOURCED. Sérgio: "don't want the
   * 'documentary' label [on the panels]. The dossier should list this content;
   * press it to see the sources for each action." So the stamp left the panels
   * (pointCloud.ts) and lives here: each panel's title and years, its dossier
   * status in plain words, and the practices its paragraph draws on
   * (`close_network.json` `practices` → `practices.json`), each with its
   * source. A press on a panel in the Close opens this view at that panel
   * (`gameMenuBus.openCloseSources`). Frame voice; nothing files.
   */
  let closeFocus = -1;
  function closeSourcesView(): void {
    heading(copy.closeSourcesTitle);
    paragraph(copy.closeSourcesIntro);
    const panels = (closeNetwork as { panels: { era: number; years: string; title: string; status: string; practices?: string[] }[] }).panels;
    const statusWords = copy.closeSourcesStatus as Record<string, string>;
    panels.forEach((pn, i) => {
      const focus = i === closeFocus;
      const h = document.createElement('div');
      Object.assign(h.style, {
        fontSize: '12.5px', fontWeight: '700', color: focus ? DIALOG.titleBar : DIALOG.ink,
        margin: '10px 0 4px', paddingTop: '8px', borderTop: `1px solid ${DIALOG.dark}`
      } as CSSStyleDeclaration);
      h.textContent = `${pn.years} · ${pn.title}`;
      panel.appendChild(h);
      paragraph(`${copy.yourFilePractice}: ${statusWords[pn.status] ?? pn.status}`);
      for (const kind of pn.practices ?? []) {
        const pr = practiceOf(kind);
        if (!pr) continue;
        const src = pr.source ? SOURCE_FILES[pr.source.file]?.debrief.sources[pr.source.index] : null;
        paragraph(`${pr.title.toUpperCase()} — ${pr.did}. [${pr.status}]${src ? ` ${copy.yourFileSource}: ${src.text}` : ` ${copy.yourFileNoSource}`}`);
      }
    });
    backRow('credits');
  }

  function yourFileView(): void {
    heading(copy.yourFileTitle);
    paragraph(copy.yourFileIntro);
    const by = entriesByEra();
    const all = (['e1', 'e2', 'e3', 'e4'] as RecordEra[]).flatMap((e) => by[e]);
    if (all.length === 0) { paragraph(copy.yourFileEmpty); backRow(); return; }
    paragraph(copy.yourFileCount.replace('{n}', String(all.length)).replace('{f}', String(all.filter((e) => e.flagged).length)));
    for (const era of ['e1', 'e2', 'e3', 'e4'] as RecordEra[]) {
      const entries = by[era];
      if (entries.length === 0) continue;
      heading((copy.yourFileEras as Record<string, string>)[era]);
      // one block per practice, in order of first appearance — the entries under it
      const seen: string[] = [];
      for (const e of entries) if (!seen.includes(e.kind)) seen.push(e.kind);
      for (const kind of seen) {
        const pr = practiceOf(kind);
        const mine = entries.filter((e) => e.kind === kind);
        paragraph(`${pr ? pr.title.toUpperCase() : kind.toUpperCase()} — ${pr ? pr.did : ''}`);
        for (const e of mine) paragraph(`  · ${e.witness}${e.flagged ? `  [${copy.yourFileFlag}]` : ''}`);
        if (pr) {
          const src = pr.source ? SOURCE_FILES[pr.source.file]?.debrief.sources[pr.source.index] : null;
          paragraph(`  ${copy.yourFilePractice}: ${pr.status}${src ? ` — ${copy.yourFileSource}: ${src.text}` : ` — ${copy.yourFileNoSource}`}`);
        }
      }
    }
    row(copy.yourFileSourcesRow, () => { view = 'credits'; render(); });
    backRow();
  }

  /**
   * ⚑ S145 — THE MAP: where you are, what has happened, what is next
   * (docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §3B). Four eras and
   * the Close, each beat marked done / here / ahead; the current beat's plain
   * hint at the top; under each era, the practices the record shows for it
   * (data/dossier/practices.json — no new claims), and the way to the file.
   * Frame voice: it explains, because the frame never plays. Nothing files.
   */
  /** the era a player has opened on the map (its file, under the beats) — menu state, never filed */
  const mapOpen = new Set<string>();
  function mapView(): void {
    heading(mapCopy.title);
    const src = gameMenuBus.mapSource;
    if (!src) { paragraph(mapCopy.soFarEmpty); backRow(); return; }
    const st = src();
    const by = entriesByEra();
    if (st.current) {
      paragraph(`${mapCopy.nextLabel}: ${st.current.beat.hint}${st.current.beat.where ? `  (${st.current.beat.where})` : ''}`);
    }
    // ⚑ S146 — THE MAP AS A MAP: five columns across, one per era and the
    //   Close, the beats down each as a line of marks; the era you are in has
    //   the bright rule and "you are here". Eras not yet reached show only
    //   their length (the shape of the piece, never its surprises). An era's
    //   heading is a press: it opens that era's file under its beats — what
    //   the software did there, its dossier status, and every entry filed.
    //   Still frame voice: plain type, plain rules, nothing moves.
    const grid = document.createElement('div');
    Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', margin: '4px 0 14px' } as CSSStyleDeclaration);
    panel.appendChild(grid);
    let ahead = false;
    const line = (parent: HTMLElement, text: string, color: string, size = '12px'): HTMLDivElement => {
      const d = document.createElement('div');
      Object.assign(d.style, { font: `${size} Tahoma, Verdana, Arial, sans-serif`, color, lineHeight: '1.5', whiteSpace: 'normal' } as CSSStyleDeclaration);
      d.textContent = text;
      parent.appendChild(d);
      return d;
    };
    for (const era of st.eras) {
      const col = document.createElement('div');
      Object.assign(col.style, {
        borderTop: `2px solid ${era.here ? DIALOG.titleBar : DIALOG.dark}`, padding: '8px 4px 6px',
        opacity: ahead && !era.here ? '0.55' : '1'
      } as CSSStyleDeclaration);
      grid.appendChild(col);
      const isAhead = ahead;
      if (era.here) ahead = true;
      const head = document.createElement('button');
      head.textContent = era.label;
      Object.assign(head.style, {
        display: 'block', width: '100%', textAlign: 'left', font: '13px "Courier New", monospace', fontWeight: '700',
        color: era.here ? DIALOG.titleBar : DIALOG.ink, background: 'transparent', border: 'none', padding: '0 0 6px', cursor: isAhead ? 'default' : 'pointer'
      } as CSSStyleDeclaration);
      col.appendChild(head);
      if (era.here) line(col, mapCopy.hereLabel, DIALOG.titleBar, '10px');
      if (isAhead) { line(col, era.id === 'close' ? mapCopy.aheadLabel : mapCopy.aheadCount.replace('{n}', String(era.beats.length)), DIALOG.faint); continue; }
      const done = era.beats.filter((b) => b.state === 'done').length;
      for (const b of era.beats) {
        const mark = b.state === 'done' ? '✓' : b.state === 'current' ? '▸' : b.beat.optional ? '○' : '·';
        const color = b.state === 'current' ? DIALOG.titleBar : b.state === 'done' ? DIALOG.ink : DIALOG.faint;
        line(col, `${mark} ${b.beat.label}${b.beat.optional && b.state !== 'done' ? ` (${mapCopy.optionalMark})` : ''}`, color);
      }
      if (era.id === 'close') continue;
      line(col, mapCopy.progress.replace('{d}', String(done)).replace('{n}', String(era.beats.length)), DIALOG.dim, '10px');
      // the era's file, under its beats, on a press
      const open = mapOpen.has(era.id);
      const fileBtn = document.createElement('button');
      fileBtn.textContent = (open ? mapCopy.fileClose : mapCopy.fileOpen).replace('{n}', String(era.entries));
      Object.assign(fileBtn.style, {
        display: 'block', width: '100%', textAlign: 'left', font: '11px Tahoma, Verdana, Arial, sans-serif', color: DIALOG.ink,
        background: DIALOG.panel, border: `1px solid ${DIALOG.dark}`, padding: '5px 6px', margin: '8px 0 0', cursor: 'pointer', borderRadius: '0'
      } as CSSStyleDeclaration);
      const toggle = (): void => { if (mapOpen.has(era.id)) mapOpen.delete(era.id); else mapOpen.add(era.id); render(); };
      fileBtn.addEventListener('click', toggle);
      head.addEventListener('click', toggle);
      col.appendChild(fileBtn);
      if (open) {
        const entries = by[era.id as RecordEra];
        if (!era.soFar.length) line(col, mapCopy.soFarEmpty, DIALOG.faint, '10px');
        for (const p of era.soFar) {
          line(col, `${p.title.toUpperCase()} — ${p.did} [${p.status}]`, DIALOG.ink, '11px').style.marginTop = '8px';
          for (const e of entries.filter((x) => practiceOf(x.kind)?.title === p.title))
            line(col, `  · ${e.witness}${e.flagged ? ` [${copy.yourFileFlag}]` : ''}`, e.flagged ? DIALOG.ink : DIALOG.dim, '11px');
        }
      }
    }
    row(mapCopy.readFile, () => { view = 'yourFile'; render(); });
    row(copy.resume, () => { gameMenuBus.close(); gameMenuBus.showHint?.(); }, true);
    backRow();
  }
  function render(): void {
    clear();
    // R3-32 (S151): the file view widens like the map — "mobile-format, hard to read"
    dialog.style.width = view === 'map' || view === 'yourFile' ? 'min(860px, 94vw)' : 'min(440px, 92vw)';
    if (view === 'yourFile') { yourFileView(); return; }
    if (view === 'map') { mapView(); return; }
    if (view === 'main') {
      heading(copy.title);
      row(copy.resume, () => gameMenuBus.close(), true);
      // ⚑ S145 — the map is the first thing after Resume: it is the row a lost
      //   player opened the menu for (THE_WITNESS_SYSTEM_PLAN §3B)
      if (gameMenuBus.mapSource) row(mapCopy.row, () => { view = 'map'; render(); });
      // ⚑ S80 — RECENTRE, and it belongs here rather than in the fiction for
      // the same reason the caption chrome does: it is the frame telling the
      // player where the room's front is. Only drawn when an engine with a
      // camera has offered one (flat mode and the pre-fiction card have none).
      // It is load-bearing, not plumbing: iOS gives no reliable absolute
      // heading, so device-look yaw is relative to a zero and drifts — and
      // this piece's one bodily ask is the turn, which makes *where forward is*
      // part of the work.
      if (gameMenuBus.recentreView) {
        row(copy.recentre, () => { gameMenuBus.recentreView?.(); gameMenuBus.close(); });
      }
      // ⚑ 2026-09-11: the gyro's OFF switch, here and not on the canvas — see
      // gameMenuBus.stopMotion. Present only while device-look is live.
      if (gameMenuBus.stopMotion) {
        row(copy.motionDisable, () => { gameMenuBus.stopMotion?.(); gameMenuBus.close(); });
      }
      // S84 — frame-level display control. iPad Safari exposes the standard
      // API; iPhone Safari may not. Absence is a fact, so the row is omitted
      // rather than presented as a dead promise. Add to Home Screen remains
      // the more complete iOS exhibition path via index.html + the manifest.
      if (canFullscreen()) {
        row(document.fullscreenElement ? copy.fullscreenExit : copy.fullscreenEnter, () => {
          const request = document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen();
          void request.catch(() => { /* browser kept its current display mode */ });
          gameMenuBus.close();
        });
      }
      // ⚑ S77 — THE UNVOICED OPT-OUT, and it lives HERE for the reason the
      // whole beat depends on: an opt-out the apparatus offers you is not an
      // opt-out. Accessibility belongs to the frame (Sérgio, 2026-08-06: "if it
      // is in the menu setting, then it's okay"). It is always shown, in every
      // era and from the pre-fiction panel on — a setting that only appeared
      // once the beat was imminent would be the piece announcing the beat, and
      // a warning you can only find after you needed it is not one.
      // ⚑ IT NEVER REMOVES THE MEANING: with it on, the subtitle still says the
      // system used a name Maya does not use. Only the audio is withheld. The
      // advisory that tells the player this exists is on the pre-fiction panel
      // (src/desktop/orientingCard.ts), which is the last surface before the
      // fiction starts and the only place an advisory can honestly go.
      row(
        ledger.view.unvoicedName ? copy.unvoicedNameOn : copy.unvoicedNameOff,
        () => { ledger.view.unvoicedName = !ledger.view.unvoicedName; render(); }
      );
      paragraph(copy.unvoicedNameNote);
      // S162 / F-01 — the door's captions choice, changeable here (the sound NAMES; W-G2)
      row(
        ledger.view.captions ? copy.captionsOn : copy.captionsOff,
        () => { ledger.view.captions = !ledger.view.captions; render(); }
      );
      row(copy.yourFile, () => { view = 'yourFile'; render(); });
      row(copy.restart, () => { view = 'restartConfirm'; render(); });
      row(copy.controls, () => { view = 'controls'; render(); });
      row(copy.credits, () => { view = 'credits'; render(); });
      row(copy.leave, () => doLeave());
      return;
    }
    if (view === 'restartConfirm') {
      heading(copy.restartConfirmTitle);
      paragraph(copy.restartConfirmBody);
      row(copy.restartConfirmYes, () => doRestart());
      row(copy.restartConfirmNo, () => { view = 'main'; render(); });
      return;
    }
    if (view === 'controls') {
      heading(copy.controlsTitle);
      for (const line of copy.controlsLines) paragraph(line);
      backRow();
      return;
    }
    if (view === 'credits') {
      heading(copy.creditsTitle);
      paragraph(attributions.projectLine);
      if (attributions.entries.length === 0) {
        paragraph(copy.creditsNone);
      } else {
        for (const e of attributions.entries) {
          paragraph(`${e.asset} — ${e.creator}. ${e.license}. Used as: ${e.usedAs}.`);
        }
      }
      // ⚑ S79 — CULTURAL INFLUENCE, below the licensed assets and in the same
      // undecorated type. A licence covers a model file; it does not cover an
      // homage to a living culture, and the provenance pass
      // (docs/research/BALLROOM_PROVENANCE_2026-08-06.md §5) is explicit that
      // crediting such a culture in the abstract repeats the extraction pattern
      // rather than correcting it — so this paragraph names the lineage. Source
      // of truth is docs/reinterp/ATTRIBUTIONS.md, baked by gen_attributions.
      for (const line of attributions.influences ?? []) paragraph(line);
      // ⚑ S87 — THE SOURCED APPARATUS, below the named credit above. The row
      // above names Crystal and Lottie LaBeija and the House of LaBeija — the
      // credit obligation was always met. These two rows are the citations
      // that back it: the contested Paris Is Burning / bell hooks entry, the
      // housing-precarity finding, further reading, and (offers) the four
      // sources behind Era 4's most speculative and most documented beats.
      row(copy.creditsBallSources, () => { view = 'ballSources'; render(); });
      row(copy.creditsOffersSources, () => { view = 'offersSources'; render(); });
      row(copy.creditsDaySources, () => { view = 'daySources'; render(); });
      row(copy.creditsCloseSources, () => { closeFocus = -1; view = 'closeSources'; render(); });
      backRow();
      return;
    }
    if (view === 'closeSources') { closeSourcesView(); return; }
    if (view === 'ballSources') {
      sourcesView(e4Ball as unknown as DossierCard, copy.ballSourcesTitle);
      return;
    }
    if (view === 'daySources') {
      sourcesView(e3Day as unknown as DossierCard, copy.daySourcesTitle);
      return;
    }
    if (view === 'offersSources') {
      sourcesView(e4Offers as unknown as DossierCard, copy.offersSourcesTitle);
    }
  }

  /** wipes the ledger (the invariant's own reset — see state/ledger.ts) and
   *  reloads: the simplest guarantee of "returns to the orienting card" with
   *  genuinely nothing left in memory, correct from ANY state the menu can
   *  be opened from (pre-fiction card, any era, mid-ritual). A judgment call
   *  flagged in 01_SESSION_LOG.md Session 36 rather than an in-place engine
   *  teardown/rebuild, which would be far riskier to get right this session. */
  function doRestart(): void {
    wipeLedger();
    window.location.reload();
  }

  /** the existing leave flow (DesktopOS.leaveNow — wipes the ledger, shows
   *  the pre-existing "You left." canvas screen, hides the flip control) via
   *  gameMenuBus.leaveEngine, wired once the real engine exists. Before that
   *  (still on the pre-fiction orienting card) there is nothing to hand off
   *  to yet, so a reload is the only clean "leave" available at that stage. */
  /** ⚑ S168 / W-F1 — LEAVE IS AN IN-BETWEEN NOW (src/frame/leavePage.ts): a plain
   *  page any screen can show, with a way back. Leaving FOR GOOD is the old flow
   *  below (`leaveForGood`): the ledger wiped, the engine's "You left." screen. */
  function doLeave(): void {
    leavePage.show(leaveForGood);
  }
  function leaveForGood(): void {
    wipeLedger();
    if (gameMenuBus.leaveEngine) {
      gameMenuBus.leaveEngine();
      gameMenuBus.close();
    } else {
      window.location.reload();
    }
  }

  function setOpenVisual(open: boolean): void {
    if (open) {
      view = 'main';
      render();
      root.style.display = 'flex';
      requestAnimationFrame(() => { root.style.opacity = '1'; });
    } else {
      root.style.opacity = '0';
      window.setTimeout(() => {
        if (!gameMenuBus.isOpen) root.style.display = 'none';
      }, 200);
    }
  }

  // (open first — opening resets the view to main — then land on the sources)
  gameMenuBus.openCloseSources = (i) => { gameMenuBus.open(); closeFocus = i; view = 'closeSources'; render(); };
  const unsubscribe = gameMenuBus.onChange(setOpenVisual);
  const onFullscreenChange = (): void => {
    if (gameMenuBus.isOpen && view === 'main') render();
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  // ── Esc, from EVERY state (CLAUDE.md REINTERP AMENDMENTS §3/§4) ──
  // Registered on `window` with `capture: true`: capture-phase listeners on
  // window always run before any bubble-phase listener on the same target,
  // regardless of registration order — so this always wins over the 3D
  // engine's / flat mode's own `window.addEventListener('keydown', ...)`
  // (both bubble-phase, unconditional). `stopImmediatePropagation()` then
  // stops those listeners from ever seeing the Escape keydown at all, so the
  // pre-existing shipped-build behaviours they carry for Escape (DesktopOS's
  // own on-canvas pause screen; flipping back from the witness side) are
  // fully and safely superseded for reinterp — this menu is Esc's only
  // owner whenever it exists, which is only ever under ?reinterp=1.
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    gameMenuBus.toggle();
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener('keydown', onKeydown, { capture: true });

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeydown, { capture: true });
      glyph.remove();
      root.remove();
    }
  };
}
